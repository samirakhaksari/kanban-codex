# Local script guidance

Read the root AGENTS.md and docs/PLAN.md before changing these scripts.

- start.sh and stop.sh support macOS and Linux; start.ps1 and stop.ps1 support Windows PowerShell.
- Scripts build and manage only the Kanban Codex Docker container.
- Bind the web port to 127.0.0.1. KANBAN_PORT selects the host port and defaults to 8000.
- Mount the project data directory into the container so later SQLite data survives container replacement.
- Pass the root .env file only when it exists; never print its contents.
- Do not stop or remove containers unrelated to this project.
