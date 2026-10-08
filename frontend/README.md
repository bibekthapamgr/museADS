# Meta Platform — Frontend

React + Vite UI for the Meta platform scaffold. Proxies `/api` and `/auth` to
the backend at `http://localhost:5000`.

## Setup

```bash
cd frontend
npm install
npm run dev        # serves on http://localhost:5173
```

For a production build: `npm run build` (output in `dist/`).

## Pages

| Route | Page |
|---|---|
| `/login` | Connect with Facebook → paste the internal user id from the OAuth callback page |
| `/` | Dashboard: account switcher (Pages + Instagram), re-sync |
| `/compose` | Composer: message, media URL, publish now or schedule |
| `/calendar` | Scheduled / published / failed posts with cancel |
| `/analytics` | Page KPIs, 28-day impressions chart, post/media insights lookup |
| `/ads` | Ad account picker, campaign table with pause/resume, create-campaign wizard, spend chart |

The active account id is shared between pages via `localStorage`
(`meta_account_id`); the demo user id lives in `meta_user_id`.
