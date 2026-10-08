/**
 * Demo auth: resolves the internal user from the X-User-Id header.
 * (Replace with session cookies / JWT in production.)
 */
const db = require('./db');

function requireUser(req, res, next) {
  const userId = req.header('X-User-Id');
  if (!userId) return res.status(401).json({ error: 'Missing X-User-Id header. Connect via /auth/login first.' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'Unknown user. Connect via /auth/login first.' });
  req.user = user;
  next();
}

module.exports = { requireUser };
