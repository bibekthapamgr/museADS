/**
 * Sync a user's Pages and linked Instagram business accounts into SQLite.
 *
 * GET /me/accounts -> pages with their page access tokens.
 * For each page: GET /{page-id}?fields=instagram_business_account -> linked IG.
 *
 * Called after OAuth callback and refreshable via POST /api/accounts/sync.
 */
const db = require('../db');
const graph = require('./graph');

async function syncAccounts(userId, userToken) {
  const pages = await graph.get('/me/accounts', userToken, {
    fields: 'id,name,access_token,category',
    limit: 100,
  });

  const upsert = db.prepare(
    `INSERT INTO accounts (user_id, type, remote_id, name, page_access_token)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, type, remote_id)
     DO UPDATE SET name = excluded.name, page_access_token = excluded.page_access_token`
  );

  for (const page of pages.data || []) {
    upsert.run(userId, 'page', page.id, page.name, page.access_token);

    // Linked Instagram business account (needs instagram_basic).
    try {
      const linked = await graph.get(`/${page.id}`, userToken, {
        fields: 'instagram_business_account{id,username,name}',
      });
      const ig = linked.instagram_business_account;
      if (ig) {
        // Reuse the page token; publisher falls back to the user's token.
        upsert.run(userId, 'instagram', ig.id, ig.username || ig.name || ig.id, page.access_token);
      }
    } catch (e) {
      // A page may simply have no linked IG account; not fatal.
      console.warn(`[sync] IG lookup failed for page ${page.id}: ${e.message}`);
    }
  }
}

module.exports = { syncAccounts };
