/**
 * Meta Platform backend — Express entry point.
 *
 * Routes:
 *   /auth/*          Facebook Login (OAuth)
 *   /api/accounts    Pages + Instagram business accounts
 *   /api/posts       scheduled post queue
 *   /api/publish     immediate publishing
 *   /api/insights    page + post/media insights
 *   /api/ads         Marketing API (ad accounts, campaigns, insights)
 *   /api/settings    server Meta credentials (Settings UI)
 *   /webhooks        verification + event receiver
 *   /health          liveness check
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./services/config');

const PORT = process.env.PORT || 5000;

function checkEnv() {
  // Credentials may also come from the Settings UI (SQLite), so a missing
  // .env is only a warning now — the server stays bootable.
  const required = ['APP_ID', 'APP_SECRET', 'REDIRECT_URI'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(`[warn] ${missing.join(', ')} not set in .env — you can add them in the Settings UI instead.`);
  }
}
checkEnv();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true, graph_version: config.graphVersion() }));

app.use('/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/publish', require('./routes/publish'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/ads', require('./routes/ads'));
app.use('/webhooks', require('./routes/webhooks'));

// JSON 404 for unknown API routes.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Last-resort error handler (never leak stack traces to clients).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message, code: err.code });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  require('./services/scheduler').start();
});
