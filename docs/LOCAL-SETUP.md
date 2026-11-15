# Local setup

This project runs locally in one Docker container. Install Docker Desktop on Windows or Docker Engine on macOS/Linux.

## Configure

Copy .env.example to .env in the project root. Add your OpenRouter API key to OPENROUTER_API_KEY in .env. Keep that file private and do not commit it. The development-only connectivity check is available while KANBAN_ENV=development.

The demo login is username user and password password. The signed session lasts up to seven days in the same browser. Set KANBAN_SESSION_SECRET in the root .env to keep sessions valid across service restarts; if omitted, a temporary key is generated at startup.

The container binds only to 127.0.0.1. It uses host port 8000 by default and stores persistent project data under the root data directory. SQLite is stored at data/kanban.sqlite3.

To choose another host port, set KANBAN_PORT before starting:
- Windows PowerShell: $env:KANBAN_PORT = "3107"
- macOS/Linux: KANBAN_PORT=3107

## Start

From the project root:
- Windows PowerShell: powershell -ExecutionPolicy Bypass -File scripts/start.ps1
- macOS/Linux: bash scripts/start.sh

Then open http://127.0.0.1:8000, or the selected KANBAN_PORT. The health endpoint is http://127.0.0.1:8000/api/health. After signing in, send POST /api/ai/test to check OpenRouter from the backend. This makes one short model request and is available only in development mode.

## Stop

From the project root:
- Windows PowerShell: powershell -ExecutionPolicy Bypass -File scripts/stop.ps1
- macOS/Linux: bash scripts/stop.sh

