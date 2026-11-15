# Backend guidance

Read the root AGENTS.md and docs/PLAN.md before changing this folder.

- FastAPI application code lives in app/.
- Keep application APIs under /api and register them before the static frontend mount.
- The root static directory is configured by KANBAN_STATIC_DIR.
- KANBAN_DATA_DIR is the configured location for local persistent data; database work belongs to the approved database phase.
- Use uv for dependencies and commands. Run backend tests with uv run pytest from the backend project.
- Read secrets from environment variables. Never commit or log secret values.
- Keep the service in the single Docker container described by the project plan.
- Personal profile APIs are in app/profile.py. Resolve account ownership from the signed session, never request identity fields. Store bounded raster avatar data in user_profiles; reject SVG, external URLs and oversized bodies. Keep the additive schema compatible with existing SQLite data.

- اتصال SQLite برای هر درخواست مستقل است؛ FastAPI ممکن است ایجاد، استفاده و بستن آن را در workerهای متفاوت انجام دهد. check_same_thread=False و بستن اتصال در finally را حفظ کن.
