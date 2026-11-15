from __future__ import annotations

import os
import sqlite3
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Iterator

from app.auth import DEMO_USERNAME
from app.config import DATA_DIR

DEMO_USER_ID = "demo-user"
DATABASE_FILENAME = "kanban.sqlite3"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    avatar_data_url TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(owner_user_id, id),
    FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS board_columns (
    board_id TEXT NOT NULL,
    id TEXT NOT NULL,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    position INTEGER NOT NULL CHECK(position >= 0),
    PRIMARY KEY(board_id, id),
    UNIQUE(board_id, position),
    FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cards (
    board_id TEXT NOT NULL,
    id TEXT NOT NULL,
    column_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK(position >= 0),
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    priority TEXT NULL CHECK(priority IS NULL OR priority IN ('low', 'medium', 'high')),
    due_date TEXT NULL CHECK(
        due_date IS NULL OR (
            length(due_date) = 10 AND
            due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        )
    ),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY(board_id, id),
    UNIQUE(board_id, column_id, position),
    FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY(board_id, column_id) REFERENCES board_columns(board_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS card_labels (
    board_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK(position >= 0),
    label TEXT NOT NULL,
    PRIMARY KEY(board_id, card_id, position),
    FOREIGN KEY(board_id, card_id) REFERENCES cards(board_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_items (
    board_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK(position >= 0),
    text TEXT NOT NULL,
    done INTEGER NOT NULL CHECK(done IN (0, 1)),
    PRIMARY KEY(board_id, card_id, id),
    UNIQUE(board_id, card_id, position),
    FOREIGN KEY(board_id, card_id) REFERENCES cards(board_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
    owner_user_id TEXT NOT NULL,
    id TEXT NOT NULL,
    name_fa TEXT NOT NULL CHECK(length(trim(name_fa)) > 0),
    name_en TEXT NOT NULL CHECK(length(trim(name_en)) > 0),
    position INTEGER NOT NULL CHECK(position >= 0),
    PRIMARY KEY(owner_user_id, id),
    UNIQUE(owner_user_id, position),
    FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS team_members (
    owner_user_id TEXT NOT NULL,
    id TEXT NOT NULL,
    name_fa TEXT NOT NULL CHECK(length(trim(name_fa)) > 0),
    name_en TEXT NOT NULL CHECK(length(trim(name_en)) > 0),
    color TEXT NOT NULL CHECK(color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
    gender TEXT NOT NULL CHECK(gender IN ('female', 'male')),
    position INTEGER NOT NULL CHECK(position >= 0),
    PRIMARY KEY(owner_user_id, id),
    UNIQUE(owner_user_id, position),
    FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS team_memberships (
    owner_user_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK(position >= 0),
    PRIMARY KEY(owner_user_id, team_id, member_id),
    UNIQUE(owner_user_id, team_id, position),
    FOREIGN KEY(owner_user_id, team_id) REFERENCES teams(owner_user_id, id) ON DELETE CASCADE,
    FOREIGN KEY(owner_user_id, member_id) REFERENCES team_members(owner_user_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS card_assignees (
    owner_user_id TEXT NOT NULL,
    board_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    PRIMARY KEY(board_id, card_id, member_id),
    FOREIGN KEY(owner_user_id, board_id) REFERENCES boards(owner_user_id, id) ON DELETE CASCADE,
    FOREIGN KEY(board_id, card_id) REFERENCES cards(board_id, id) ON DELETE CASCADE,
    FOREIGN KEY(owner_user_id, member_id) REFERENCES team_members(owner_user_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_data_migrations (
    user_id TEXT NOT NULL,
    migration_key TEXT NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('localStorage-v1', 'sample-seed')),
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY(user_id, migration_key),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_member
    ON team_memberships(owner_user_id, member_id);
CREATE INDEX IF NOT EXISTS idx_card_assignees_member
    ON card_assignees(owner_user_id, member_id);
"""

SAMPLE_COLUMNS = (
    ("backlog", "Backlog"),
    ("up-next", "Up next"),
    ("in-progress", "In progress"),
    ("review", "Review"),
    ("done", "Done"),
)

SAMPLE_MEMBERS = (
    ("sara-ahmadi", "سارا احمدی", "Sara Ahmadi", "#67317f", "female"),
    ("arman-karimi", "آرمان کریمی", "Arman Karimi", "#1476a3", "male"),
    ("nika-moradi", "نیکا مرادی", "Nika Moradi", "#287154", "female"),
    ("reza-farahani", "رضا فرهادی", "Reza Farahani", "#8a5d00", "male"),
)

SAMPLE_TEAMS = (
    ("web-team", "تیم فنی و طراحی وب", "Web Design & Engineering", ("sara-ahmadi", "arman-karimi", "nika-moradi")),
    ("sales-team", "تیم فروش", "Sales Team", ("reza-farahani", "sara-ahmadi")),
    ("marketing-team", "تیم بازاریابی", "Marketing Team", ("nika-moradi", "reza-farahani")),
)

SAMPLE_CARDS = (
    {
        "id": "brief", "column_id": "backlog", "position": 0,
        "title": "Shape the launch story",
        "details": "Align the homepage message with the product promise.",
        "priority": "high", "due_offset": 3, "labels": ("Launch", "Content"),
        "assignees": ("sara-ahmadi", "nika-moradi"),
        "checklist": (
            ("brief-copy", "Align the homepage message", True),
            ("brief-review", "Review the final copy", False),
        ),
    },
    {
        "id": "research", "column_id": "backlog", "position": 1,
        "title": "Review customer notes",
        "details": "Pull out the themes from the latest interview round.",
        "priority": "medium", "due_offset": -2, "labels": ("Research",),
        "assignees": ("reza-farahani",),
        "checklist": (
            ("research-themes", "Group recurring notes", False),
            ("research-summary", "Summarize customer needs", False),
        ),
    },
    {
        "id": "design-system", "column_id": "up-next", "position": 0,
        "title": "Polish the design system",
        "details": "Tighten spacing and document the core components.",
        "priority": "medium", "due_offset": 6, "labels": ("Design System", "UI"),
        "assignees": ("arman-karimi", "sara-ahmadi"),
        "checklist": (
            ("design-spacing", "Audit spacing", True),
            ("design-components", "Document shared components", False),
            ("design-contrast", "Review color contrast", False),
        ),
    },
    {
        "id": "onboarding", "column_id": "up-next", "position": 1,
        "title": "Map the first run",
        "details": "Make the first five minutes feel effortless.",
        "priority": "low", "due_offset": 9, "labels": ("Onboarding",),
        "assignees": ("nika-moradi",),
        "checklist": (
            ("onboarding-steps", "Outline the first-run steps", False),
            ("onboarding-copy", "Review the guidance text", False),
        ),
    },
    {
        "id": "homepage", "column_id": "in-progress", "position": 0,
        "title": "Build the new homepage",
        "details": "Bring the approved direction into the live page.",
        "priority": "high", "due_offset": 1, "labels": ("Development", "Launch"),
        "assignees": ("arman-karimi",),
        "checklist": (
            ("homepage-layout", "Implement the approved layout", True),
            ("homepage-responsive", "Check responsive behavior", False),
            ("homepage-review", "Review the final page", False),
        ),
    },
    {
        "id": "analytics", "column_id": "in-progress", "position": 1,
        "title": "Add launch analytics",
        "details": "Track the few signals that help us learn.",
        "priority": "medium", "due_offset": 5, "labels": ("Analytics",),
        "assignees": ("sara-ahmadi", "reza-farahani"),
        "checklist": (
            ("analytics-events", "Choose key events", False),
            ("analytics-verify", "Verify event tracking", False),
        ),
    },
    {
        "id": "mobile-review", "column_id": "review", "position": 0,
        "title": "Check mobile layouts",
        "details": "Review the key screens at small breakpoints.",
        "priority": "high", "due_offset": -1, "labels": ("Quality", "Mobile"),
        "assignees": ("nika-moradi", "reza-farahani"),
        "checklist": (
            ("mobile-screens", "Review the main screens", True),
            ("mobile-fixes", "List remaining fixes", False),
        ),
    },
    {
        "id": "brand", "column_id": "done", "position": 0,
        "title": "Confirm the visual direction",
        "details": "The team is aligned on the new look and feel.",
        "priority": "low", "due_offset": -5, "labels": ("Brand",),
        "assignees": ("sara-ahmadi",),
        "checklist": (
            ("brand-colors", "Approve the color palette", True),
            ("brand-type", "Confirm typography", True),
        ),
    },
)


def get_database_path() -> Path:
    data_dir = Path(os.environ.get("KANBAN_DATA_DIR", str(DATA_DIR)))
    return data_dir / DATABASE_FILENAME


def connect_database(path: Path | None = None) -> sqlite3.Connection:
    target = path or get_database_path()
    # FastAPI may enter/use/close this request-scoped connection on different
    # worker threads. Each request still owns its own connection.
    connection = sqlite3.connect(target, timeout=10, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def get_database_connection() -> Iterator[sqlite3.Connection]:
    connection = connect_database()
    try:
        yield connection
    finally:
        connection.close()


def initialize_database(path: Path | None = None) -> Path:
    target = path or get_database_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    with connect_database(target) as connection:
        connection.executescript(SCHEMA_SQL)
        connection.execute(
            "INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)",
            (DEMO_USER_ID, DEMO_USERNAME),
        )
    return target


def sample_board_state() -> dict[str, object]:
    seed_day = datetime.now(timezone.utc).date()
    cards: list[dict[str, object]] = []
    for card in SAMPLE_CARDS:
        cards.append(
            {
                "id": card["id"],
                "columnId": card["column_id"],
                "title": card["title"],
                "details": card["details"],
                "priority": card["priority"],
                "dueDate": (seed_day + timedelta(days=card["due_offset"])).isoformat(),
                "labels": list(card["labels"]),
                "checklist": [
                    {"id": item_id, "text": text, "done": done}
                    for item_id, text, done in card["checklist"]
                ],
                "assigneeIds": list(card["assignees"]),
            }
        )
    return {
        "columns": [{"id": column_id, "title": title} for column_id, title in SAMPLE_COLUMNS],
        "cards": cards,
    }


def sample_team_directory() -> dict[str, object]:
    members = [
        {
            "id": member_id,
            "nameFa": name_fa,
            "nameEn": name_en,
            "color": color,
            "gender": gender,
        }
        for member_id, name_fa, name_en, color, gender in SAMPLE_MEMBERS
    ]
    teams = [
        {
            "id": team_id,
            "nameFa": name_fa,
            "nameEn": name_en,
            "memberIds": list(member_ids),
        }
        for team_id, name_fa, name_en, member_ids in SAMPLE_TEAMS
    ]
    return {"teams": teams, "members": members}


def insert_user_state(
    connection: sqlite3.Connection,
    owner_user_id: str,
    board_state: dict[str, object],
    team_directory: dict[str, object],
    source: str,
) -> str:
    board_id = "demo-board" if owner_user_id == DEMO_USER_ID else f"board-{owner_user_id}"
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    connection.execute(
        "INSERT INTO boards (id, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (board_id, owner_user_id, now, now),
    )

    for position, column in enumerate(board_state["columns"]):
        connection.execute(
            "INSERT INTO board_columns (board_id, id, title, position) VALUES (?, ?, ?, ?)",
            (board_id, column["id"], column["title"], position),
        )

    for position, member in enumerate(team_directory["members"]):
        connection.execute(
            """
            INSERT INTO team_members
                (owner_user_id, id, name_fa, name_en, color, gender, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                owner_user_id,
                member["id"],
                member["nameFa"],
                member["nameEn"],
                member["color"],
                member["gender"],
                position,
            ),
        )

    for position, team in enumerate(team_directory["teams"]):
        connection.execute(
            "INSERT INTO teams (owner_user_id, id, name_fa, name_en, position) VALUES (?, ?, ?, ?, ?)",
            (owner_user_id, team["id"], team["nameFa"], team["nameEn"], position),
        )
        for member_position, member_id in enumerate(team["memberIds"]):
            connection.execute(
                """
                INSERT INTO team_memberships
                    (owner_user_id, team_id, member_id, position)
                VALUES (?, ?, ?, ?)
                """,
                (owner_user_id, team["id"], member_id, member_position),
            )

    next_positions: dict[str, int] = {}
    for card in board_state["cards"]:
        column_id = card["columnId"]
        position = next_positions.get(column_id, 0)
        next_positions[column_id] = position + 1
        connection.execute(
            """
            INSERT INTO cards
                (board_id, id, column_id, position, title, details, priority, due_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                board_id,
                card["id"],
                column_id,
                position,
                card["title"],
                card["details"],
                card.get("priority"),
                card.get("dueDate"),
            ),
        )
        for label_position, label in enumerate(card.get("labels", [])):
            connection.execute(
                "INSERT INTO card_labels (board_id, card_id, position, label) VALUES (?, ?, ?, ?)",
                (board_id, card["id"], label_position, label),
            )
        for item_position, item in enumerate(card.get("checklist", [])):
            connection.execute(
                """
                INSERT INTO checklist_items (board_id, card_id, id, position, text, done)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    board_id,
                    card["id"],
                    item["id"],
                    item_position,
                    item["text"],
                    int(item["done"]),
                ),
            )
        for member_id in card.get("assigneeIds", []):
            connection.execute(
                """
                INSERT INTO card_assignees (owner_user_id, board_id, card_id, member_id)
                VALUES (?, ?, ?, ?)
                """,
                (owner_user_id, board_id, card["id"], member_id),
            )

    connection.execute(
        """
        INSERT INTO user_data_migrations (user_id, migration_key, source)
        VALUES (?, 'localStorage-v1', ?)
        """,
        (owner_user_id, source),
    )
    return board_id


def seed_sample_board(connection: sqlite3.Connection, owner_user_id: str) -> str:
    return insert_user_state(
        connection,
        owner_user_id,
        sample_board_state(),
        sample_team_directory(),
        "sample-seed",
    )


def initialize_user_data(
    connection: sqlite3.Connection,
    owner_user_id: str,
    board_state: dict[str, object] | None,
    team_directory: dict[str, object] | None,
    *,
    use_sample: bool = False,
) -> str:
    connection.execute("BEGIN IMMEDIATE")
    try:
        existing = connection.execute(
            "SELECT id FROM boards WHERE owner_user_id = ?",
            (owner_user_id,),
        ).fetchone()
        if existing:
            connection.commit()
            return str(existing["id"])

        user = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (owner_user_id,),
        ).fetchone()
        if not user:
            raise LookupError("Board owner does not exist")

        if use_sample:
            selected_board = sample_board_state()
            selected_teams = sample_team_directory()
            source = "sample-seed"
        else:
            selected_board = board_state if board_state is not None else sample_board_state()
            selected_teams = team_directory if team_directory is not None else sample_team_directory()
            source = "localStorage-v1" if board_state is not None or team_directory is not None else "sample-seed"

        board_id = insert_user_state(
            connection,
            owner_user_id,
            selected_board,
            selected_teams,
            source,
        )
        connection.commit()
        return board_id
    except Exception:
        connection.rollback()
        raise


def ensure_board_initialized(connection: sqlite3.Connection, owner_user_id: str) -> str:
    connection.execute("BEGIN IMMEDIATE")
    try:
        board = connection.execute(
            "SELECT id FROM boards WHERE owner_user_id = ?",
            (owner_user_id,),
        ).fetchone()
        if board:
            connection.commit()
            return str(board["id"])

        user = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (owner_user_id,),
        ).fetchone()
        if not user:
            raise LookupError("Board owner does not exist")

        board_id = seed_sample_board(connection, owner_user_id)
        connection.commit()
        return board_id
    except Exception:
        connection.rollback()
        raise


