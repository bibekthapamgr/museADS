/**
 * Posts API: scheduled / published / failed post queue.
 *
 * GET    /api/posts        list (filter ?status=)
 * POST   /api/posts        create or schedule:
 *                          { account_id, message, media_url?, scheduled_at? }
 *                          (scheduled_at = unix seconds; omit for "save as draft/scheduled now")
 * DELETE /api/posts/:id    cancel a scheduled post (or clear a failed one)
 */
const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware');

const router = express.Router();
router.use(requireUser);

router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = `SELECT p.*, a.type AS account_type, a.name AS account_name, a.remote_id AS account_remote_id
             FROM posts p JOIN accounts a ON a.id = p.account_id
             WHERE a.user_id = ?`;
  const params = [req.user.id];
  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY p.scheduled_at DESC, p.id DESC';
  res.json({ posts: db.prepare(sql).all(...params) });
});

router.post('/', (req, res) => {
  const { account_id, message, media_url, scheduled_at } = req.body || {};
  if (!account_id) return res.status(400).json({ error: 'account_id is required' });
  if (!message && !media_url) return res.status(400).json({ error: 'message or media_url is required' });

  const account = db
    .prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
    .get(account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const when = scheduled_at ? Number(scheduled_at) : Math.floor(Date.now() / 1000);
  if (!Number.isFinite(when)) return res.status(400).json({ error: 'scheduled_at must be unix seconds' });

  const info = db
    .prepare(
      `INSERT INTO posts (account_id, message, media_url, scheduled_at, status)
       VALUES (?, ?, ?, ?, 'scheduled')`
    )
    .run(account_id, message || null, media_url || null, when);

  res.status(201).json({ post: db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.id FROM posts p JOIN accounts a ON a.id = p.account_id
       WHERE p.id = ? AND a.user_id = ?`
    )
    .get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Post not found' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
