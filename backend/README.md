# Meta Platform — Backend

Express API server that wraps the Meta Graph API (v21.0) and Marketing API,
with SQLite persistence and a one-minute post scheduler.

## Setup

```bash
cd backend
npm install
npm run dev            # or: npm start
```

Credentials can be provided two ways (Settings UI wins over `.env`):
- **Settings page** (recommended): open the dashboard → **Settings** and paste your
  App ID, App Secret, and system user token. Stored in SQLite (`data.sqlite`);
  secrets are shown masked and never returned in full by the API.
- **`.env` file**: `cp .env.example .env` and fill in the values.

The server boots even with no credentials configured and only warns about
what's missing; routes that need them return a clear `CREDENTIALS_MISSING`
error pointing at Settings.

## Meta developer app setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → **Create App**
   (choose the "Business" app type).
2. Add products:
   - **Facebook Login** — set the OAuth redirect URI to your `REDIRECT_URI`
     (e.g. `http://localhost:5000/auth/callback`). For local testing the app
     may stay in Development mode (only test users / admins can log in).
   - **Webhooks** — callback URL `https://<your-tunnel>/webhooks`, verify token
     = your `WEBHOOK_VERIFY_TOKEN`. Subscribe to the `page` object fields you
     need (e.g. `feed`).
3. Request these permissions in **App Review → Permissions and Features**
   (all work in Development mode for app admins/testers):

| Permission | Why we need it |
|---|---|
| `pages_show_list` | List the user's Pages |
| `pages_read_engagement` | Read page insights |
| `pages_manage_posts` | Publish / manage page posts |
| `instagram_basic` | Read linked Instagram business accounts |
| `instagram_content_publish` | Publish to Instagram |
| `ads_read` | Read ad accounts, campaigns, insights |
| `ads_management` | Create / pause / resume campaigns |
| `business_management` | Read business assets (ad accounts) |

**App review notes:** `pages_manage_posts`, `ads_management` and
`instagram_content_publish` require review before public users can grant them.
Until then, test with app roles (Admin / Developer / Tester).

## Webhooks with a tunnel

```bash
# in one terminal
npm run dev
# in another (example: ngrok)
ngrok http 5000
```

Then in the app dashboard → Webhooks → add `https://<tunnel>/webhooks` with
your verify token, and subscribe to the fields you want. Every POST is
signature-verified (`X-Hub-Signature-256`) before being processed.

## API quick reference

| Method & path | Description |
|---|---|
| `GET /auth/login` | Start Facebook Login |
| `GET /auth/callback` | OAuth callback → long-lived token |
| `GET /api/accounts` (+ `POST /api/accounts/sync`) | Pages & IG accounts |
| `GET/POST /api/posts`, `DELETE /api/posts/:id` | Post queue |
| `POST /api/publish/now` | Publish immediately |
| `GET /api/insights/page/:pageId` | Page KPIs |
| `GET /api/insights/post/:id?account_id=` | Post / IG media insights |
| `GET /api/ads/accounts` | Ad accounts |
| `GET /api/ads/campaigns?account_id=` | Campaigns |
| `POST /api/ads/campaigns` | Guided create (campaign → ad set → creative → ad) |
| `PATCH /api/ads/campaigns/:id` | Pause / resume / budgets |
| `GET /api/ads/insights?account_id=&level=` | Ad insights |

Demo auth: pass the internal user id (returned on the callback page) as the
`X-User-Id` request header. Replace with real sessions before production.
