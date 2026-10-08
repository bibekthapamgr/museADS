/**
 * Publish logic shared by "publish now" and the scheduler.
 *
 * Facebook Page: POST /{page-id}/feed (message, link) or POST /{page-id}/photos
 *   for a single image URL. Uses the Page access token.
 * Instagram business account: two-step flow —
 *   1. POST /{ig-user-id}/media  (image_url, caption) -> container id
 *   2. POST /{ig-user-id}/media_publish (creation_id) -> media id
 *   (Video would use media_type=VIDEO / REEL; left as an extension.)
 */
const graph = require('./graph');

function pageToken(row) {
  if (!row.page_access_token) throw new Error('No Page access token stored for this account');
  return row.page_access_token;
}

async function publishPagePost(row) {
  const token = pageToken(row);
  const pageId = row.account_remote_id;
  if (row.media_url) {
    const res = await graph.post(`/${pageId}/photos`, token, {
      url: row.media_url,
      caption: row.message,
      published: true,
    });
    return res.post_id || res.id;
  }
  const res = await graph.post(`/${pageId}/feed`, token, { message: row.message });
  return res.id;
}

async function publishInstagramPost(row) {
  // NOTE: Instagram content publishing requires the user's token; the
  // account row must carry the token it was linked with.
  const token = row.page_access_token || row.user_token;
  if (!token) throw new Error('No access token stored for this Instagram account');
  const igId = row.account_remote_id;
  if (!row.media_url) throw new Error('Instagram publishing requires a media_url');
  const container = await graph.post(`/${igId}/media`, token, {
    image_url: row.media_url,
    caption: row.message || '',
  });
  const published = await graph.post(`/${igId}/media_publish`, token, { creation_id: container.id });
  return published.id;
}

async function publishPost(row) {
  if (row.account_type === 'page') return publishPagePost(row);
  if (row.account_type === 'instagram') return publishInstagramPost(row);
  throw new Error(`Unknown account type: ${row.account_type}`);
}

module.exports = { publishPost };
