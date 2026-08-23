# Deployment walkthrough

The hosted demo is three free services: **Neon** (PostgreSQL), **Render** (the
API), and **Vercel** (the web app). Follow the steps in order — the API is
deployed first because the web app needs its URL, and the API's CORS setting
needs the web URL, so there is one deliberate redeploy at the end.

Config already in the repo: [`render.yaml`](../render.yaml),
[`apps/web/vercel.json`](../apps/web/vercel.json). The app binds `$PORT`
(injected by Render) and, with `COOKIE_SECURE=true`, issues `SameSite=None;
Secure` session cookies so the Vercel frontend can authenticate against the
Render API cross-site.

## 1. Neon — database

1. Create a project at [neon.tech](https://neon.tech) (region close to Render, e.g. Singapore).
2. From the dashboard copy **two** connection strings:
   - **Pooled** → `DATABASE_URL` (host contains `-pooler`).
   - **Direct/unpooled** → `DIRECT_URL` (used by `prisma migrate`).
   Both should include `?sslmode=require`.

## 2. Render — API

1. New → **Blueprint**, connect this GitHub repo. Render reads `render.yaml`.
2. Set the secret env vars (marked `sync:false`) in the dashboard:
   - `DATABASE_URL`, `DIRECT_URL` — from Neon.
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random strings
     (`openssl rand -base64 32`).
   - `CORS_ORIGIN` — leave as a placeholder for now (e.g. `http://localhost:3000`); you set the real Vercel URL in step 4.
   - Notification keys — leave blank to use the console notifier.
3. Deploy. The build runs `prisma migrate deploy`, so the schema is created
   automatically. Wait for **Live**, then note the URL, e.g.
   `https://lmd-api.onrender.com`.
4. **Seed once.** In the Render service **Shell** (or locally with `DATABASE_URL`
   pointed at Neon), run:
   ```bash
   npm run seed
   ```
5. Check `https://lmd-api.onrender.com/health` → `{"status":"ok"}` and
   `/docs` for Swagger.

> Render free instances sleep after inactivity; the first request after a while
> takes ~30 s to wake. That is expected on the free tier.

## 3. Vercel — web

1. New Project → import the repo. Set **Root Directory** to `apps/web`
   (Vercel picks up `apps/web/vercel.json`, which installs and builds from the
   workspace root).
2. Add an environment variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://lmd-api.onrender.com/api/v1`
     (your Render URL + `/api/v1`). This is inlined at build time.
3. Deploy. Note the URL, e.g. `https://lmd.vercel.app`.

## 4. Close the loop — CORS

1. Back in Render, set `CORS_ORIGIN` = `https://lmd.vercel.app` (your Vercel URL,
   no trailing slash) and **redeploy** the API.
2. This lets the browser send credentials cross-site and the API accept them.

## 5. Verify the hosted demo

- Open `https://lmd.vercel.app` in a **private window**.
- Track a public order: `https://lmd.vercel.app/track/LMD-2608-000001`.
- Log in with each demo account (`admin@demo.io` / `customer@demo.io` /
  `agent@demo.io`, password `Demo@1234`) — the session should persist across
  navigation (confirms cross-site cookies work).
- As admin, open **Rate simulator** (Bhopal → Pune) and confirm **₹296.18**.
- Create an order, auto-assign, walk it through statuses, fail and reschedule.

## Update the README

Add the live URLs to the top of the README:

```md
**Live demo:** https://lmd.vercel.app · **API docs:** https://lmd-api.onrender.com/docs
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Login "works" but you're logged out on the next page | `CORS_ORIGIN` not set to the exact Vercel URL, or `COOKIE_SECURE` not `true` (needed for `SameSite=None`). |
| CORS error in the browser console | `CORS_ORIGIN` mismatch (trailing slash / http vs https). |
| API 500 on boot | `DATABASE_URL`/`DIRECT_URL` wrong, or migrations didn't run — check the Render build log. |
| Web builds but calls `localhost:4000` | `NEXT_PUBLIC_API_BASE_URL` not set before the Vercel build (it is build-time inlined — redeploy after setting it). |
