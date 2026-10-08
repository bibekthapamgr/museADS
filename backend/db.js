/**
 * SQLite persistence layer (better-sqlite3).
 *
 * Tables:
 *  - users: one row per connected Meta user, holding the long-lived token.
 *  - accounts: the user's Facebook Pages and linked Instagram business accounts.
 *  - posts: scheduled / published / failed posts, processed by the scheduler.
 *  - ad_accounts: ad accounts the user can manage.
 *  - settings: server-level Meta credentials entered via the Settings UI
 *    (key/value). Values here take precedence over environment variables.
 */
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'data.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fb_user_id TEXT UNIQUE,
    access_token TEXT NOT NULL,
    token_expires_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('page', 'instagram')),
    remote_id TEXT NOT NULL,
    name TEXT,
    page_access_token TEXT,
    UNIQUE (user_id, type, remote_id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    message TEXT,
    media_url TEXT,
    scheduled_at INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed')),
    remote_post_id TEXT,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS ad_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    name TEXT,
    UNIQUE (user_id, account_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

module.exports = db;
