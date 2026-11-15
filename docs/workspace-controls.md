# Workspace corrections — 2026-11-15

Implemented the seven requested corrections in the existing local app.

- Removed the login motion pause/play control. Decorative CSS motion and prefers-reduced-motion support remain; mobile retains the plain background.
- Persian task labels now use تسک, including creation, search, empty states, counts and the assistant. Account/workspace words and user-authored task content are preserved.
- Reports appears directly below Project board. Existing charts moved there and report the whole project independently of saved board filters. The old statistics-details toggle is removed.
- Summary, project progress, search and narrow filters share one compact desktop control bar; small screens wrap naturally. The permanent saved message is removed. Save errors still appear with Retry, and pending saves retain an accessible status.
- New columns have actions immediately. Rename commits on blur/Enter and cancels on Escape, with a guard against duplicate blur/submit commits.
- Navigation starts as a 76px right rail. Desktop mouse hover or keyboard focus expands it to 236px; a button pins it open and supports touch. A short 180ms leave delay lets clicks finish before the layout moves. Hover expansion is disabled on narrow screens.
- Chat uses a reserved 360px right column, with a static panel inside the sidebar. The board resizes beside it. Mobile chat stays in normal flow above the board.

## Additional defect found during verification

A real GET /api/board/initialize returned 500 in the browser suite. The server traceback showed sqlite3.ProgrammingError because FastAPI created and used a request connection on different worker threads. Request-scoped connections now use check_same_thread=False and still close in finally. A regression test explicitly uses and closes one request connection from another worker. No database schema or credentials changed.

## Verification

- Runtime Docker build and TypeScript compilation passed. ESLint passed; 26 Vitest tests passed; 56 backend tests passed.
- The 17 existing browser scenarios passed against the final app. All four new workspace scenarios passed in the final focused run after correcting the keyboard test's starting focus: hover/focus/pin navigation, compact controls and Reports, immediate new-column actions and rename/cancel/delete, and docked desktop/mobile chat. Together, 21 distinct scenarios were verified.
- Persian light/dark desktop board and Reports, collapsed/expanded navigation, and desktop/mobile chat were inspected in real screenshots. The production board was also inspected after rollout.
- AI behavior uses the existing mocked response test; no live OpenRouter request was made.
- Existing Vite configuration and Starlette TestClient deprecation warnings are nonblocking.

## Local rollout

- Updated http://127.0.0.1:8000 using the existing D:/Projects/vibe-coding-pr/2nd/project-kanban/kanban-codex/data bind mount and existing environment file.
- SQLite backup: data/kanban-before-controls-20261115.sqlite3.
- Before/after counts were identical: 1 user, 1 board, 5 columns, 9 cards, 3 teams, 4 team members, 13 assignments, 1 profile. Health endpoint and actual sign-in/board rendering passed.
- Browser tests used a separate disposable container on port 8001. Test profile names/photos were never written to production.
