/**
 * Settings API — server-level Meta credentials, editable from the dashboard.
 *
 * GET  /api/settings        list known settings (secrets masked, never in full)
 * PUT  /api/settings        { KEY: "value", ... } — blank value clears a key
 * POST /api/settings/test   { token? } — validate the system user token (or a
 *                           supplied one) with a live Graph API call
 *
 * These routes are intentionally not behind requireUser: they configure the
 * server itself, not a single Meta user. Put real auth in front of the backend
 * before exposing it beyond localhost.
 */
const express = require('express');
const config = require('../services/config');
const graph = require('../services/graph');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ settings: config.listSettings() });
});

router.put('/', (req, res) => {
  try {
    config.saveSettings(req.body || {});
    res.json({ ok: true, settings: config.listSettings() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/test', async (req, res) => {
  const token = (req.body && req.body.token ? String(req.body.token) : '').trim()
    || config.getSetting('SYSTEM_USER_TOKEN');
  if (!token) {
    return res.status(400).json({
      ok: false,
      error: 'No token to test. Save a system user token in Settings first, or send one as { "token": "..." }.',
    });
  }
  try {
    const me = await graph.get('/me', token, { fields: 'id,name' });
    let debug = null;
    const appId = config.getSetting('APP_ID');
    const appSecret = config.getSetting('APP_SECRET');
    if (appId && appSecret) {
      try {
        const dbg = await graph.get('/debug_token', `${appId}|${appSecret}`, { input_token: token });
        debug = dbg.data || null;
      } catch {
        // debug_token is a nice-to-have; the /me call is the real test.
      }
    }
    res.json({ ok: true, id: me.id, name: me.name, token_info: debug });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: (err && err.response && err.response.data && err.response.data.error && err.response.data.error.message) || err.message,
    });
  }
});

module.exports = router;
