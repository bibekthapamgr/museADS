/**
 * Insights API.
 *
 * GET /api/insights/page/:pageId
 *   Page KPIs: page_fans, page_impressions, page_post_engagements (last 28d).
 *   Needs pages_read_engagement. Uses the Page access token.
 *
 * GET /api/insights/post/:id
 *   Query ?account_id=<internal id> to pick the token.
 *   - Facebook post: /{post-id}/insights?metric=post_impressions,post_engaged_users
 *   - Instagram media: /{ig-media-id}/insights?metric=impressions,reach,profile_views
 */
const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware');
const graph = require('../services/graph');

const router = express.Router();
router.use(requireUser);

function getAccount(req, accountId) {
  return db
    .prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
    .get(accountId, req.user.id);
}

router.get('/page/:pageId', async (req, res) => {
  const account = db
    .prepare("SELECT * FROM accounts WHERE remote_id = ? AND user_id = ? AND type = 'page'")
    .get(req.params.pageId, req.user.id);
  if (!account) return res.status(404).json({ error: 'Page not found' });
  const token = account.page_access_token || req.user.access_token;

  try {
    const metrics = ['page_fans', 'page_impressions', 'page_post_engagements'];
    const out = {};
    for (const metric of metrics) {
      const data = await graph.get(`/${account.remote_id}/insights`, token, {
        metric,
        period: 'day',
        date_preset: 'last_28d',
      });
      const series = data.data && data.data[0] ? data.data[0].values : [];
      out[metric] = { total: series.reduce((s, v) => s + (v.value || 0), 0), series };
    }
    res.json({ metrics: out });
  } catch (err) {
    res.status(502).json({ error: err?.response?.data?.error?.message || err.message });
  }
});

router.get('/post/:id', async (req, res) => {
  const account = req.query.account_id ? getAccount(req, req.query.account_id) : null;
  if (!account) return res.status(400).json({ error: 'account_id query param is required' });
  const token = account.page_access_token || req.user.access_token;
  const mediaId = req.params.id;

  try {
    if (account.type === 'instagram') {
      const data = await graph.get(`/${mediaId}/insights`, token, {
        metric: 'impressions,reach,profile_views',
      });
      res.json({ media_id: mediaId, metrics: data.data || [] });
    } else {
      const data = await graph.get(`/${mediaId}/insights`, token, {
        metric: 'post_impressions,post_engaged_users,post_clicks',
      });
      res.json({ post_id: mediaId, metrics: data.data || [] });
    }
  } catch (err) {
    res.status(502).json({ error: err?.response?.data?.error?.message || err.message });
  }
});

module.exports = router;
