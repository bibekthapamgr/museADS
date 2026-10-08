/**
 * Webhooks for Meta platform updates.
 *
 * GET  /webhooks?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 *   Verification handshake. The verify token must match WEBHOOK_VERIFY_TOKEN.
 *
 * POST /webhooks
 *   Receives page/feed and permissions updates. Every request's
 *   X-Hub-Signature-256 is verified against APP_SECRET_FOR_SIGNATURE (or
 *   APP_SECRET) before the body is trusted.
 */
const express = require('express');
const crypto = require('crypto');
const config = require('../services/config');

const router = express.Router();

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === config.getSetting('WEBHOOK_VERIFY_TOKEN')) {
    console.log('[webhooks] verification succeeded');
    return res.status(200).send(challenge);
  }
  console.warn('[webhooks] verification failed');
  res.sendStatus(403);
});

// Need the raw body for signature verification.
router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = config.getSetting('APP_SECRET');
  const signature = req.header('X-Hub-Signature-256') || '';

  if (!secret) {
    console.error('[webhooks] no app secret configured; rejecting payload');
    return res.sendStatus(500);
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!valid) {
    console.warn('[webhooks] invalid signature');
    return res.sendStatus(401);
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.sendStatus(400);
  }

  // Route by object type; extend as needed (page, instagram, permissions, ...).
  console.log('[webhooks] received event for object:', event.object);
  for (const entry of event.entry || []) {
    for (const change of entry.changes || []) {
      console.log(`[webhooks] ${event.object}/${change.field}:`, JSON.stringify(change.value || {}).slice(0, 500));
    }
  }

  res.sendStatus(200);
});

module.exports = router;
