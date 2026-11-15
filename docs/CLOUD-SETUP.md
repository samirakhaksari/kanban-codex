# Full app hosting

The existing Vercel project builds frontend/. The Python backend must run separately with a persistent disk. Vercel proxies /api/* to it, preserving same-origin session cookies and keeping provider credentials out of the browser.

## Railway backend

1. Deploy this repository from its root using Dockerfile and railway.toml. Use one replica.
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
