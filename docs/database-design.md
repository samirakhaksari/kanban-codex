# Database design proposal

Status: Phase 5 design approved on 2026-11-14. Phase 6 implements the SQLite schema and board API in backend/app/database.py and backend/app/board.py.

## Scope

SQLite will become the durable source for the existing Kanban board. The schema mirrors BoardState: ordered columns and cards; title and details; optional priority and due date; ordered labels and checklist items; and multiple card assignees. It also preserves the current team directory, including bilingual names, colors, gender, team membership, and member order.

The design supports multiple users and enforces at most one board per user. The MVP still uses the configured demo account. A database user row identifies ownership; it does not store the demo password. Login remains governed by configured credentials in the application.

The table proposal and sample references are in database-schema.json.

## Ownership and relationships

- users is the root owner table. The initial row is demo-user with username user.
- boards.owner_user_id is unique, so each user has at most one board.
- board_columns and cards use composite keys scoped by board_id. A composite foreign key ensures a card can refer only to a column on its own board; identical sample IDs can safely exist on different users' boards.
- Cards have a position within a column; columns have a position within their board. These positions preserve the ordering represented by frontend arrays.
- Labels and checklist items are child rows with positions. Labels remain free-form strings. Checklist done maps to SQLite 0 or 1.
- Teams and team_members use composite keys scoped by owner_user_id and belong to that owner. team_memberships supports several teams per member and preserves membership order.
- card_assignees supports several members per card and uses composite foreign keys to keep a card, board, and member within one owner.

Enable SQLite foreign-key enforcement on every connection. Keep existing string IDs when importing. Scope column and card keys by board_id, and team and member keys by owner_user_id, because the sample IDs repeat for every user. Checklist item keys are scoped to their card.

## Field mapping

| Frontend value | SQLite representation |
| --- | --- |
| BoardState.columns | board_columns rows ordered by position |
| BoardState.cards | cards rows ordered by column_id and position |
| BoardCard.priority | nullable text limited to low, medium, or high |
| BoardCard.dueDate | nullable ISO date text in YYYY-MM-DD form |
| BoardCard.labels | card_labels rows ordered by position |
| BoardCard.checklist | checklist_items rows ordered by position; done maps to 0/1 |
| BoardCard.assigneeIds | card_assignees rows |
| TeamDirectory.members | team_members rows ordered by position |
| TeamDirectory.teams | teams rows ordered by position |
| Team.memberIds | team_memberships rows ordered by position |

The existing model has no board title, so boards has no invented display-name field. Card and column titles are not unique.

## Initialization and one-time browser import

The current browser keys are kanban-codex.board.v1 and kanban-codex.teams.v1. Because the MVP demo login is shared, browser storage is not one global dataset. This proposal preserves the first signed-in browser's valid local board and directory, then makes SQLite canonical.

At application startup, create the schema and demo user but leave the board uninitialized. Phase 7 must offer localStorage import before its first normal board read. On first initialization for the user, the backend accepts local state supplied by that browser, validates both model shapes and their relationships, then writes the board and a localStorage-v1 row in user_data_migrations in the same transaction. If a normal board read happens first, seed the sample board and record sample-seed instead. If one key is absent, use the corresponding sample data; if both are absent, seed the complete sample. Seed due dates are computed from the UTC calendar date at initialization using the offsets in database-schema.json, matching the current frontend behavior.

If a present payload is malformed or contains an unknown column/member reference, reject the transaction and do not write the migration marker. Keep the original browser values available for retry. A completed migration cannot be repeated to overwrite server data. Later browsers using the shared demo login see the same SQLite board; their separate localStorage values are not automatically merged. That tradeoff needs review before Phase 6.

## Seed profile

The default sample comes from frontend/src/lib/board.ts and frontend/src/lib/team-directory.ts: one demo user, one board, five columns, eight cards, four members, three teams, and the existing multi-member assignments. Sample due dates use relative UTC day offsets so they do not become stale.

## Delete and update behavior

- Deleting a card removes its labels, checklist rows, and assignee links by cascade.
- A column with cards cannot be deleted. The backend rejects that operation; the foreign key uses RESTRICT as a second guard. Empty columns can be deleted.
- The current UI permits deleting a team only when it is empty; preserve that API rule.
- Removing a member from one team deletes only that membership if the member belongs to another team. If the member has no remaining teams, remove the member and card assignments in the same transaction.
- Board and user deletion are outside the MVP. User ownership rows are protected with RESTRICT.
- Reordering changes position values transactionally. Use temporary non-conflicting positions or another safe sequence because position constraints are unique.

## Constraints and approval gate

Enable foreign keys on every SQLite connection. Keep multi-row board writes, import, and initialization transactional. Scope every API query to the signed-in owner as well as relying on foreign keys.

The first browser wins the automatic legacy import for the shared demo account. The proposal does not merge other browser-local boards; that would need a conflict and duplicate-ID policy. Export or merge UI is outside this proposal.

Please review and approve this schema and one-time import behavior before Phase 6 creates tables or persistence APIs.






## Personal profiles — approved on 2026-11-15

The approved profile design adds user_profiles, keyed by user_id with a cascading foreign key to users. It stores first_name, last_name and optional avatar_data_url. Startup creates the additional table without replacing existing board/team records. GET/PUT /api/profile resolve the account from its signed session; credentials and the username are unchanged. Profile names are not matched to sample team members by display name. Photo validation and implementation notes are in workspace-profile.md.
