/**
 * Accounts API: Pages + linked Instagram business accounts.
 */
const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware');
const { syncAccounts } = require('../services/accountSync');

const router = express.Router();
router.use(requireUser);

router.get('/', (req, res) => {
  const accounts = db
    .prepare('SELECT id, type, remote_id, name FROM accounts WHERE user_id = ? ORDER BY type, name')
    .all(req.user.id);
  res.json({ accounts });
});

router.post('/sync', async (req, res) => {
  try {
    await syncAccounts(req.user.id, req.user.access_token);
    const accounts = db
      .prepare('SELECT id, type, remote_id, name FROM accounts WHERE user_id = ? ORDER BY type, name')
      .all(req.user.id);
    res.json({ accounts });
  } catch (err) {
    const message = err?.response?.data?.error?.message || err.message;
    res.status(502).json({ error: message });
  }
});

module.exports = router;
