/**
 * Marketing API wrappers (v21.0, same Graph host).
 *
 * Conventions:
 *  - Ad accounts are addressed as `act_<account_id>`.
 *  - Insights use standard metric names; breakdowns are caller-supplied.
 *  - Creating a campaign end-to-end is intentionally a guided, sequential
 *    call in routes/ads.js (campaign -> ad set -> ad creative -> ad).
 */
const graph = require('./graph');

/** List ad accounts the user can manage: GET /me/adaccounts. */
function listAdAccounts(accessToken) {
  return graph.get('/me/adaccounts', accessToken, {
    fields: 'account_id,name,account_status,currency,timezone_name',
  });
}

/** List campaigns for an ad account: GET /act_<id>/campaigns. */
function listCampaigns(accessToken, accountId, extraFields = '') {
  const fields = ['id', 'name', 'objective', 'status', 'daily_budget', 'lifetime_budget', 'created_time', extraFields]
    .filter(Boolean)
    .join(',');
  return graph.get(`/act_${accountId}/campaigns`, accessToken, { fields, limit: 100 });
}

/** Create a campaign: POST /act_<id>/campaigns. */
function createCampaign(accessToken, accountId, { name, objective, status = 'PAUSED', specialAdCategories = [] }) {
  return graph.post(`/act_${accountId}/campaigns`, accessToken, {
    name,
    objective,
    status,
    special_ad_categories: specialAdCategories,
  });
}

/** Create an ad set: POST /act_<id>/adsets. */
function createAdSet(accessToken, accountId, adSet) {
  return graph.post(`/act_${accountId}/adsets`, accessToken, adSet);
}

/** Create an ad creative: POST /act_<id>/adcreatives. */
function createAdCreative(accessToken, accountId, creative) {
  return graph.post(`/act_${accountId}/adcreatives`, accessToken, creative);
}

/** Create an ad: POST /act_<id>/ads. */
function createAd(accessToken, accountId, { name, adsetId, creativeId, status = 'PAUSED' }) {
  return graph.post(`/act_${accountId}/ads`, accessToken, {
    name,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status,
  });
}

/** Update a campaign (pause / resume / budgets). */
function updateCampaign(accessToken, campaignId, updates) {
  return graph.post(`/${campaignId}`, accessToken, updates);
}

/** Insights: GET /act_<id>/insights with level + date range. */
function getInsights(accessToken, accountId, { level = 'campaign', fields, datePreset = 'last_30d', since, until, filtering }) {
  const params = {
    level,
    fields: fields || 'campaign_id,campaign_name,spend,impressions,reach,clicks,cpc,cpm,actions',
    date_preset: datePreset,
  };
  if (since) {
    delete params.date_preset;
    params.time_range = JSON.stringify({ since, until: until || since });
  }
  if (filtering) params.filtering = JSON.stringify(filtering);
  return graph.get(`/act_${accountId}/insights`, accessToken, params);
}

module.exports = {
  listAdAccounts,
  listCampaigns,
  createCampaign,
  createAdSet,
  createAdCreative,
  createAd,
  updateCampaign,
  getInsights,
};
