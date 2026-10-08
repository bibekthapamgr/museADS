/**
 * Immediate publishing: POST /api/publish/now
 * Body: { account_id, message, media_url? }
 *
 * Publishes right away via the publisher service and records the post as
 * 'published' in SQLite. Failures return 502 with the Graph error message.
 */
const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware');
const { publishPost } = require('../services/publisher');

const router = express.Router();
router.use(requireUser);

router.post('/now', async (req, res) => {
  const { account_id, message, media_url } = req.body || {};
  if (!account_id) return res.status(400).json({ error: 'account_id is required' });
  if (!message && !media_url) return res.status(400).json({ error: 'message or media_url is required' });

  const row = db
    .prepare(
      `SELECT ? AS id, a.type AS account_type, a.remote_id AS account_remote_id,
              a.page_access_token, ? AS user_token, ? AS message, ? AS media_url
       FROM accounts a WHERE a.id = ? AND a.user_id = ?`
    )
    .get(0, req.user.access_token, message || '', media_url || null, account_id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Account not found' });

  try {
    const remoteId = await publishPost(row);
    const info = db
      .prepare(
        `INSERT INTO posts (account_id, message, media_url, scheduled_at, status, remote_post_id)
         VALUES (?, ?, ?, ?, 'published', ?)`
      )
      .run(account_id, message || null, media_url || null, Math.floor(Date.now() / 1000), remoteId);
    res.json({ published: true, post_id: info.lastInsertRowid, remote_post_id: remoteId });
  } catch (err) {
    const messageText = err?.response?.data?.error?.message || err.message;
    res.status(502).json({ error: messageText });
  }
});

module.exports = router;
