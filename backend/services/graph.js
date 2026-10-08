/**
 * Thin wrapper around the Meta Graph API.
 *
 * All endpoint paths are built from the single GRAPH_BASE constant so a
 * version bump only touches GRAPH_VERSION in the environment.
 * API version: v21.0.
 */
require('dotenv').config();
const axios = require('axios');
const config = require('./config');

function graphBase() {
  return `https://graph.facebook.com/${config.graphVersion()}`;
}

/** Backwards-compatible constant; prefer config.graphVersion() for fresh reads. */
const GRAPH_VERSION = config.graphVersion();
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function client() {
  return axios.create({ baseURL: GRAPH_BASE, timeout: 20000 });
}

/** GET /{path} with the caller's access token. */
async function get(path, accessToken, params = {}) {
  const { data } = await axios.create({ baseURL: graphBase(), timeout: 20000 }).get(path, {
    params: { access_token: accessToken, ...params },
  });
  return data;
}

/** POST /{path} with the caller's access token. */
async function post(path, accessToken, body = {}) {
  const { data } = await axios.create({ baseURL: graphBase(), timeout: 20000 }).post(path, body, {
    params: { access_token: accessToken },
  });
  return data;
}

/** DELETE /{path} with the caller's access token. */
async function del(path, accessToken) {
  const { data } = await axios.create({ baseURL: graphBase(), timeout: 20000 }).delete(path, {
    params: { access_token: accessToken },
  });
  return data;
}

/** Follow paged results until exhausted (or until maxPages). */
async function paginate(path, accessToken, params = {}, maxPages = 10) {
  const items = [];
  let url = path;
  let query = { access_token: accessToken, ...params };
  for (let i = 0; i < maxPages; i++) {
    const { data } = await axios.get(url.startsWith('http') ? url : `${graphBase()}${url}`, {
      params: url.startsWith('http') ? {} : query,
      timeout: 20000,
    });
    items.push(...(data.data || []));
    if (data.paging && data.paging.next) {
      url = data.paging.next; // full URL, params embedded
      query = {};
    } else {
      break;
    }
  }
  return items;
}

/** The signed session cookie style helper: resolve a code to a short-lived token. */
async function exchangeCodeForToken(code) {
  const { data } = await axios.get(`${graphBase()}/oauth/access_token`, {
    params: {
      client_id: config.getSetting('APP_ID'),
      client_secret: config.getSetting('APP_SECRET'),
      redirect_uri: config.getSetting('REDIRECT_URI'),
      code,
    },
    timeout: 20000,
  });
  return data; // { access_token, token_type, expires_in }
}

/** Upgrade a short-lived user token to a long-lived (~60 day) token. */
async function toLongLivedToken(shortToken) {
  const { data } = await axios.get(`${graphBase()}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config.getSetting('APP_ID'),
      client_secret: config.getSetting('APP_SECRET'),
      fb_exchange_token: shortToken,
    },
    timeout: 20000,
  });
  return data; // { access_token, token_type, expires_in }
}

module.exports = { GRAPH_VERSION, GRAPH_BASE, graphVersion: config.graphVersion, graphBase, get, post, del, paginate, exchangeCodeForToken, toLongLivedToken };
