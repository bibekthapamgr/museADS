/**
 * Facebook Login (OAuth) flow.
 *
 * GET /auth/login    -> 302 redirect to the Facebook OAuth dialog.
 * GET /auth/callback -> exchanges `code` for a short-lived token, upgrades to
 *                       a long-lived token, upserts the user in SQLite, and
 *                       returns a tiny session page.
 *
 * In production this session would be a signed cookie/JWT; here we return the
 * internal user id so the frontend can call the API. (Same machine, demo.)
 */
const express = require('express');
const db = require('../db');
const graph = require('../services/graph');
const config = require('../services/config');

const router = express.Router();

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'ads_read',
  'ads_management',
  'business_management',
];

router.get('/login', (req, res) => {
  const APP_ID = config.getSetting('APP_ID');
  const REDIRECT_URI = config.getSetting('REDIRECT_URI');
  if (!APP_ID || !REDIRECT_URI) {
    return res.status(400).send('Missing App ID or Redirect URI — add them in Settings first.');
  }
  const url =
    `https://www.facebook.com/${config.graphVersion()}/dialog/oauth` +
    `?client_id=${encodeURIComponent(APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES.join(','))}`;
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) return res.status(400).send(`Login failed: ${error} — ${error_description || ''}`);
  if (!code) return res.status(400).send('Missing authorization code.');

  try {
    const short = await graph.exchangeCodeForToken(code);
    const long = await graph.toLongLivedToken(short.access_token);
    const me = await graph.get('/me', long.access_token, { fields: 'id,name' });
    const expiresAt = long.expires_in ? Math.floor(Date.now() / 1000) + long.expires_in : null;

    const info = db
      .prepare(
        `INSERT INTO users (fb_user_id, access_token, token_expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(fb_user_id) DO UPDATE SET access_token = excluded.access_token, token_expires_at = excluded.token_expires_at
         RETURNING id`
      )
      .get(me.id, long.access_token, expiresAt);

    // Refresh accounts (pages + IG) right after login.
    await require('../services/accountSync').syncAccounts(info.id, long.access_token, me.id);

    res.send(
      `<html><body style="font-family:sans-serif">
         <h2>Connected as ${me.name || me.id}</h2>
         <p>Your Meta accounts are synced. Your internal user id is <b>${info.id}</b>.</p>
         <p>Pass it as <code>X-User-Id</code> header on API calls (demo convenience), then open the frontend dashboard.</p>
       </body></html>`
    );
  } catch (err) {
    const message = err?.response?.data?.error?.message || err.message;
    res.status(502).send(`Token exchange failed: ${message}`);
  }
});

module.exports = router;
