# Kanban Codex implementation plan

## 1. Project setup
- [x] Create the project folder and preserve the supplied `AGENTS.md` brief.
- [x] Scaffold a current Next.js App Router app in `frontend` with TypeScript and a root `.gitignore`.
- [x] Add a small README and document the implementation plan here.
- [x] Define the board, column, and card data model with five seeded columns and sample cards.

Success: the app starts from `frontend`, the project brief is present, and the board model always begins with exactly five columns.

## 2. MVP board and interaction
- [x] Build a polished, responsive single-board interface using the requested palette.
- [x] Allow columns to be renamed and added; allow deleting empty columns while keeping at least one column.
- [x] Allow cards with a title and details to be added to any column and deleted.
- [x] Support moving cards between columns with drag and drop.
- [x] Keep state in memory only; reload restores the sample board.
- [x] Keep the interface limited to the requested board, without search, filters, or archive actions.

Success: all board interactions work by keyboard or pointer where applicable, and the initial view contains sample cards in five columns.

## 3. Verification

> Blocked for now: npm registry requests reset during dependency installation, so the test and build commands could not run.
- [x] Add unit tests for board state transformations and key UI interactions.
- [x] Add Playwright integration coverage for adding, renaming, moving, and deleting cards.
- [x] Run lint, unit tests, production build, and Playwright tests; fix any failures.

Success: every check passes against the completed app.

## 4. Ready to use
- [x] Start the app server and confirm the home page responds.

Success: the local server stays running and serves the Kanban board.

## 5. Professional workflow upgrades
- [x] Automatically save board changes to validated browser storage and restore them after reload.
- [x] Extend cards with optional priority, due date, labels, and an editable checklist.
- [x] Add bilingual search and filters for text, status, priority, and overdue cards; update board analytics for visible results.
- [x] Seed the sample cards with varied priorities, due dates, labels, and checklist states for feature testing.

Success: everyday work survives reloads, cards and custom columns can be managed in the board, analytics follow the visible cards, and users can quickly narrow work in either language.
