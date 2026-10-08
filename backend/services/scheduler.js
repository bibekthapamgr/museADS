/**
 * Post scheduler: every minute, publish due scheduled posts.
 *
 * A post is "due" when scheduled_at <= now and status = 'scheduled'.
 * On success the row is marked 'published' with the remote post/media id;
 * on failure it is marked 'failed' with the error message (surfaced in the
 * Calendar UI so the user can retry or delete).
 */
const cron = require('node-cron');
const db = require('../db');
const { publishPost } = require('./publisher');

function duePosts() {
  return db
    .prepare(
      `SELECT p.*, a.type AS account_type, a.remote_id AS account_remote_id, a.page_access_token
       FROM posts p
       JOIN accounts a ON a.id = p.account_id
       WHERE p.status = 'scheduled' AND p.scheduled_at <= ?`
    )
    .all(Math.floor(Date.now() / 1000));
}

function markPublished(id, remotePostId) {
  db.prepare("UPDATE posts SET status = 'published', remote_post_id = ?, error = NULL WHERE id = ?").run(
    remotePostId,
    id
  );
}

function markFailed(id, error) {
  db.prepare("UPDATE posts SET status = 'failed', error = ? WHERE id = ?").run(String(error).slice(0, 1000), id);
}

async function runOnce() {
  const posts = duePosts();
  for (const row of posts) {
    try {
      const remoteId = await publishPost(row);
      markPublished(row.id, remoteId);
      console.log(`[scheduler] published post ${row.id} -> ${remoteId}`);
    } catch (err) {
      const message = err?.response?.data?.error?.message || err.message;
      markFailed(row.id, message);
      console.error(`[scheduler] post ${row.id} failed: ${message}`);
    }
  }
}

function start() {
  cron.schedule('* * * * *', runOnce);
  console.log('[scheduler] started (every minute)');
}

module.exports = { start, runOnce };
