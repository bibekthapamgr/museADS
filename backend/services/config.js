/**
 * Central configuration for Meta credentials.
 *
 * Resolution order for every key:
 *   1. `settings` table (values entered in the Settings UI / API)
 *   2. environment variable of the same name
 *   3. built-in default (only GRAPH_VERSION has one)
 *
 * Secret values are never returned in full — listSettings() only exposes a
 * masked preview. Raw values stay server-side.
 */
const db = require('../db');

const DEFINITIONS = [
  { key: 'APP_ID', label: 'App ID', secret: false, hint: 'Your Meta app ID (developers.facebook.com → your app).' },
  { key: 'APP_SECRET', label: 'App Secret', secret: true, hint: 'App secret, used for token exchange and webhook signatures.' },
  { key: 'SYSTEM_USER_TOKEN', label: 'System user token', secret: true, hint: 'Business Manager system user token. Used as the API token fallback for ads and connection tests.' },
  { key: 'REDIRECT_URI', label: 'OAuth redirect URI', secret: false, hint: 'Must match the Valid OAuth Redirect URI in Facebook Login settings, e.g. http://localhost:5000/auth/callback' },
  { key: 'WEBHOOK_VERIFY_TOKEN', label: 'Webhook verify token', secret: true, hint: 'Token you invent; Meta sends it back during webhook verification.' },
  { key: 'GRAPH_VERSION', label: 'Graph API version', secret: false, hint: 'e.g. v21.0', fallback: 'v21.0' },
];

const ALLOWED = new Set(DEFINITIONS.map((d) => d.key));

/** Raw value for a key (DB first, then env, then definition fallback). */
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (row && row.value) return row.value;
  if (process.env[key]) return process.env[key];
  const def = DEFINITIONS.find((d) => d.key === key);
  return (def && def.fallback) || '';
}

/** All known keys with metadata. Secrets are masked — never returned in full. */
function listSettings() {
  return DEFINITIONS.map((d) => {
    const value = getSetting(d.key);
    const fromDb = !!db.prepare('SELECT 1 FROM settings WHERE key = ?').get(d.key);
    const source = !value ? 'none' : fromDb ? 'settings' : process.env[d.key] ? 'env' : 'default';
    return {
      key: d.key,
      label: d.label,
      secret: d.secret,
      hint: d.hint,
      configured: !!value,
      preview: !value ? '' : d.secret ? mask(value) : value,
      source,
    };
  });
}

function mask(value) {
  if (!value) return '';
  return value.length > 4 ? `••••••${value.slice(-4)}` : '••••';
}

/**
 * Save settings. Only known keys are accepted; a blank value clears the key
 * (falls back to the environment variable).
 */
function saveSettings(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Request body must be an object of setting keys to values.');
  }
  const upsert = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  const remove = db.prepare('DELETE FROM settings WHERE key = ?');
  const now = Math.floor(Date.now() / 1000);
  for (const [key, raw] of Object.entries(obj)) {
    if (!ALLOWED.has(key)) throw new Error(`Unknown setting: ${key}`);
    if (typeof raw !== 'string') throw new Error(`Invalid value for ${key}: must be a string.`);
    const value = raw.trim();
    if (value === '') remove.run(key);
    else upsert.run(key, value, now);
  }
}

/** Throw a friendly, catchable error when required credentials are missing. */
function requireSettings(keys) {
  const missing = keys.filter((k) => !getSetting(k));
  if (missing.length) {
    const err = new Error(`Missing Meta credentials (${missing.join(', ')}). Add them in Settings first.`);
    err.status = 400;
    err.code = 'CREDENTIALS_MISSING';
    throw err;
  }
}

/**
 * API token for a request: the connected user's OAuth token when present,
 * otherwise the system user token from Settings (Business Manager use case).
 */
function apiToken(req) {
  return (req.user && req.user.access_token) || getSetting('SYSTEM_USER_TOKEN') || '';
}

function graphVersion() {
  return getSetting('GRAPH_VERSION') || 'v21.0';
}

module.exports = { DEFINITIONS, getSetting, listSettings, saveSettings, requireSettings, apiToken, graphVersion };
