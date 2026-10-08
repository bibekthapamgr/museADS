# Meta Platform

A full-stack scaffold for building on Meta's APIs: Facebook/Instagram
**Graph API** (posts, publishing, insights) and the **Marketing API**
(campaigns, ad sets, ads, insights).

## Architecture

```
┌──────────────┐        ┌───────────────────────────┐        ┌──────────────────┐
│  React + Vite │        │  Express backend (:5000)   │        │  Meta Graph API  │
│  frontend     │───────▶│                           │───────▶│  graph.facebook  │
│  :5173        │ /api   │  routes/  services/       │ axios  │  .com / v21.0    │
└──────────────┘ proxy   │  better-sqlite3  node-cron │        └──────────────────┘
                         └───────────────────────────┘
```

- **Backend** (`backend/`): OAuth login, account sync, post queue + scheduler,
  immediate publishing, page/post insights, ad management, webhook receiver.
- **Frontend** (`frontend/`): Login, Dashboard, Composer, Calendar, Analytics,
  Ads — hand-rolled SVG charts, no heavy chart library.
- **Graph API version** lives in one place: `GRAPH_VERSION` in the backend
  `.env` (see `services/graph.js` `GRAPH_BASE`).

## Features

1. **Post management & scheduling** — write once, publish now or schedule for a
   Page or Instagram business account; a cron job publishes due posts every
   minute and records success/failure.
2. **Analytics & insights dashboard** — page KPIs (fans, impressions,
   engagements), 28-day charts, per-post/per-media insight lookups.
3. **Ad campaign management** — list ad accounts, guided campaign creation
   (campaign → ad set → creative → ad), pause/resume, budget updates,
   campaign-level spend insights.

## Prerequisites

- A Meta developer app (see `backend/README.md` for the full setup guide):
  Facebook Login + Webhooks products, the permissions below, and (for public
  users) app review.
- Node.js 18+.

## Quickstart

```bash
# backend
cd backend && npm install
cp .env.example .env   # add APP_ID, APP_SECRET, REDIRECT_URI
npm run dev            # http://localhost:5000

# frontend (new terminal)
cd frontend && npm install
npm run dev            # http://localhost:5173
```

Open the frontend → **Connect with Facebook** → paste the internal user id from
the callback page → pick an account on the Dashboard.

## Permissions used

| Permission | Used for |
|---|---|
| `pages_show_list` | Listing Pages |
| `pages_read_engagement` | Page insights |
| `pages_manage_posts` | Publishing to Pages |
| `instagram_basic` | Linked IG accounts + media insights |
| `instagram_content_publish` | Publishing to Instagram |
| `ads_read` | Ad accounts, campaigns, insights |
| `ads_management` | Creating / pausing campaigns |
| `business_management` | Reading business assets |

## Roadmap ideas

- Real session auth (signed cookies / JWT) instead of the demo `X-User-Id` header.
- Instagram video/reel publishing and carousel support.
- Webhook-driven cache invalidation (e.g. auto-refresh insights on new comments).
- Multi-user teams and roles.
- Ad creative builder with image upload + preview.
- Budget pacing alerts and scheduled reports.
