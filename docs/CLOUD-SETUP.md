# Full app hosting

The existing Vercel project builds frontend/. The Python backend must run separately with a persistent disk. Vercel proxies /api/* to it, preserving same-origin session cookies and keeping provider credentials out of the browser.

## Railway backend

1. Deploy this repository from its root using Dockerfile. Use one replica. In service Settings set the healthcheck path to /api/health, timeout to 120 seconds and restart policy to On Failure (3 retries). New Railway services no longer accept the legacy Config-as-Code format; configure these settings in the dashboard.
2. Attach a persistent volume at /app/data before using the app. KANBAN_DATA_DIR defaults to that path. Do not rely on the container's temporary filesystem for SQLite.
3. Set PORT=8000 and KANBAN_ENV=production. Set a stable random KANBAN_SESSION_SECRET and the existing OPENROUTER_API_KEY privately in Railway's variables. Do not put them in Git, the frontend or chat. The demo credentials remain user/password and all group visitors share one demo account and board.
4. Generate a Railway HTTPS domain with target port 8000. Verify /api/health returns {"status":"ok"}.
5. Enable Railway's serverless/sleep setting for light demonstration use if available. Keep the free/trial plan; do not enable a paid upgrade. Free usage is limited and can stop when the included credits are exhausted. Railway's dashboard shows the actual quota and expiry for this account.

## Vercel frontend

1. Keep the project root set to frontend and framework Next.js. Use npm run build and the default Next.js output settings.
2. Set KANBAN_API_ORIGIN to the backend's HTTPS origin (no /api suffix). Apply it to the intended Vercel environment and redeploy.
3. Only promote the new version to main after the backend and volume are ready. A Vercel build without the backend origin deliberately fails, leaving the previous production deployment available.
4. Verify sign-in, board/profile persistence after reload, Reports, both themes and mobile layout on the Vercel domain. Verify an AI response only after the backend key is configured.

Local Docker keeps using a static Next.js export when KANBAN_API_ORIGIN is unset. Existing local SQLite data and secrets are ignored by Git and are not uploaded automatically. The hosted app starts with separate sample data unless a data migration is explicitly requested.

Official references: https://docs.railway.com/pricing/plans, https://docs.railway.com/volumes/reference, https://docs.railway.com/config-as-code/reference.

## Verification before cloud rollout — 2026-11-16

ESLint, the default static-export build, and the Vercel proxy build passed. A local production Next.js server was checked against the existing backend: health, sign-in cookie, session restoration and an authenticated profile request all passed through /api. No local board/profile data was edited by this check. The prior app checks remain 26 Vitest, 56 backend and 21 distinct browser scenarios.


## Current hosted release — 2026-11-16

- Public app: https://kanban-codex.vercel.app/.
- Backend: https://kanban-api-production-795c7fc6.up.railway.app/.
- Vercel production app revision cef6239 was Ready. The project builds frontend/ with default Next.js output settings. KANBAN_API_ORIGIN is configured for Production and Preview.
- Railway service kanban-api uses Docker from the repository root, one replica, PORT=8000, KANBAN_ENV=production, healthcheck /api/health with 120-second timeout, On Failure with 3 retries, and Serverless enabled.
- A 500 MB persistent volume is mounted at /app/data, verified in the volume settings. Hosted data is separate from the local nine-card board; the hosted board starts with eight sample cards.
- The user added the OpenRouter key directly in Railway. A new cryptographically random 32-byte session secret was generated and saved there without printing or committing it. Both remain private backend variables.
- Hosting uses the account's free trial/credit allowance. The dashboard initially showed 30 days or $5 remaining. No paid upgrade was enabled. Availability after that depends on Railway's current free-plan eligibility and resource quota; this is not an unlimited free server. AI calls use the user's existing OpenRouter account independently of hosting credits.

## Live verification

- The Vercel /api/health proxy returned ok. Sign-in, cookie session, board initialization/read and authenticated profile access succeeded through the public Vercel domain.
- One short real AI request returned “Connection confirmed.” The complete board JSON was identical before/after that request.
- A fresh Chrome tab restored the signed session and displayed the eight-card board. Light/dark theme switching, Reports and the profile form worked. Actual public-page screenshots were saved outside the repository.
- The original long-open browser tab retained stale behavior after deployment; verify the release in a fresh tab, or hard-refresh an already-open tab.
- Local SQLite, backups and .env files were excluded from Git and were not copied to cloud hosting.

## Subsequent full releases

Vercel follows main. Railway currently follows codex/publish-full-app. Keep the backend release branch at the same tested commit when publishing backend changes:

```sh
git push origin main
git push origin main:codex/publish-full-app
```

These are normal fast-forward pushes; do not force-push either branch. A documentation-only commit can be skipped by Vercel's existing root-directory change detection.
