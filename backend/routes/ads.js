/**
 * Ads API (Marketing API).
 *
 * GET    /api/ads/accounts                        ad accounts the user manages
 * GET    /api/ads/campaigns?account_id=act_id     campaigns for an account
 * POST   /api/ads/campaigns                       guided create:
 *          { account_id, campaign: {name, objective},
 *            adset: {...}, creative: {...}, ad: {name} }
 *          -> creates campaign, ad set, creative, ad (all PAUSED), returns ids
 * PATCH  /api/ads/campaigns/:id                   { status: ACTIVE|PAUSED,
 *                                                   daily_budget?, lifetime_budget? }
 * GET    /api/ads/insights?account_id=&level=     campaign/adset/ad insights
 */
const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware');
const marketing = require('../services/marketing');
const config = require('../services/config');

const router = express.Router();
router.use(requireUser);

// Per-user OAuth token when connected, otherwise the system user token from Settings.
const token = (req) => {
  const t = config.apiToken(req);
  if (!t) {
    const err = new Error('No API token available. Connect via OAuth or save a system user token in Settings.');
    err.status = 400;
    err.code = 'CREDENTIALS_MISSING';
    throw err;
  }
  return t;
};

router.get('/accounts', async (req, res) => {
  try {
    const data = await marketing.listAdAccounts(token(req));
    res.json({ ad_accounts: data.data || [] });
  } catch (err) {
    res.status(502).json({ error: err?.response?.data?.error?.message || err.message });
  }
});

router.get('/campaigns', async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id query param is required' });
  try {
    const data = await marketing.listCampaigns(token(req), account_id.replace(/^act_/, ''));
    res.json({ campaigns: data.data || [] });
  } catch (err) {
    res.status(502).json({ error: err?.response?.data?.error?.message || err.message });
  }
});

router.post('/campaigns', async (req, res) => {
  const { account_id, campaign, adset, creative, ad } = req.body || {};
  if (!account_id || !campaign?.name || !campaign?.objective) {
    return res.status(400).json({ error: 'account_id, campaign.name and campaign.objective are required' });
  }
  const actId = String(account_id).replace(/^act_/, '');
  const t = token(req);
  try {
    const createdCampaign = await marketing.createCampaign(t, actId, campaign);
    const ids = { campaign_id: createdCampaign.id };

    if (adset) {
      const createdAdSet = await marketing.createAdSet(t, actId, {
        ...adset,
        campaign_id: createdCampaign.id,
      });
      ids.adset_id = createdAdSet.id;
    }
    if (creative) {
      const createdCreative = await marketing.createAdCreative(t, actId, creative);
      ids.creative_id = createdCreative.id;
    }
    if (ad && ids.adset_id && ids.creative_id) {
      const createdAd = await marketing.createAd(t, actId, {
        name: ad.name || `${campaign.name} — ad`,
        adsetId: ids.adset_id,
        creativeId: ids.creative_id,
      });
      ids.ad_id = createdAd.id;
    }
    res.status(201).json(ids);
  } catch (err) {
    res.status(502).json({ error: err?.response?.data?.error?.message || err.message });
  }
});

router.patch('/campaigns/:id', async (req, res) => {
  const { status, daily_budget, lifetime_budget } = req.body || {};
  const updates = {};
  if (status) {
    if (!['ACTIVE', 'PAUSED'].includes(status)) return res.status(400).json({ error: 'status must be ACTIVE or PAUSED' });
    updates.status = status;
  }
  if (daily_budget) updates.daily_budget = daily_budget;
  if (lifetime_budget) updates.lifetime_budget = lifetime_budget;
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });

  try {
    const data = await marketing.updateCampaign(token(req), req.params.id, updates);
    res.json({ updated: true, result: data });
  } catch (err) {
    res.status(502).json({ error: err?.response?.data?.error?.message || err.message });
  }
});

router.get('/insights', async (req, res) => {
  const { account_id, level = 'campaign', date_preset, since, until } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id query param is required' });
  try {
    const data = await marketing.getInsights(token(req), String(account_id).replace(/^act_/, ''), {
      level,
      datePreset: date_preset || 'last_30d',
      since,
      until,
    });
    res.json({ insights: data.data || [] });
  } catch (err) {
    res.status(502).json({ error: err?.response?.data?.error?.message || err.message });
  }
});

module.exports = router;
