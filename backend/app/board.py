from __future__ import annotations

import sqlite3
from datetime import date
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from app.auth import DEMO_USERNAME
from app.database import (
    DEMO_USER_ID,
    ensure_board_initialized,
    initialize_user_data,
    sample_board_state,
    sample_team_directory,
    get_database_connection,
)

CardPriority = Literal["low", "medium", "high"]


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class ColumnCreate(APIModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)

    @field_validator("id", "title")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be empty")
        return normalized


class ColumnRename(APIModel):
    title: str = Field(min_length=1)

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Title cannot be empty")
        return normalized


class ChecklistItemInput(APIModel):
    id: str = Field(min_length=1)
    text: str
    done: bool

    @field_validator("id")
    @classmethod
    def trim_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Checklist item id cannot be empty")
        return normalized


class CardCreate(APIModel):
    id: str = Field(min_length=1)
    column_id: str = Field(alias="columnId", min_length=1)
    title: str = Field(min_length=1)
    details: str = ""
    priority: CardPriority | None = None
    due_date: str | None = Field(default=None, alias="dueDate")
    labels: list[str] = Field(default_factory=list)
    checklist: list[ChecklistItemInput] = Field(default_factory=list)
    assignee_ids: list[str] = Field(default_factory=list, alias="assigneeIds")

    @field_validator("id", "column_id", "title")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be empty")
        return normalized

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            parsed = date.fromisoformat(value)
        except ValueError as error:
            raise ValueError("Due date must be YYYY-MM-DD") from error
        if parsed.isoformat() != value:
            raise ValueError("Due date must be YYYY-MM-DD")
        return value

    @field_validator("checklist")
    @classmethod
    def unique_checklist_ids(cls, items: list[ChecklistItemInput]) -> list[ChecklistItemInput]:
        ids = [item.id for item in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Checklist item ids must be unique within a card")
        return items

    @field_validator("assignee_ids")
    @classmethod
    def unique_assignees(cls, ids: list[str]) -> list[str]:
        if len(ids) != len(set(ids)):
            raise ValueError("Assignee ids must be unique")
        return ids


class CardUpdate(APIModel):
    title: str | None = None
    details: str | None = None
    priority: CardPriority | None = None
    due_date: str | None = Field(default=None, alias="dueDate")
    labels: list[str] | None = None
    checklist: list[ChecklistItemInput] | None = None
    assignee_ids: list[str] | None = Field(default=None, alias="assigneeIds")

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Title cannot be empty")
        return normalized

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            parsed = date.fromisoformat(value)
        except ValueError as error:
            raise ValueError("Due date must be YYYY-MM-DD") from error
        if parsed.isoformat() != value:
            raise ValueError("Due date must be YYYY-MM-DD")
        return value

    @field_validator("checklist")
    @classmethod
    def unique_checklist_ids(cls, items: list[ChecklistItemInput] | None) -> list[ChecklistItemInput] | None:
        if items is None:
            return None
        ids = [item.id for item in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Checklist item ids must be unique within a card")
        return items

    @field_validator("assignee_ids")
    @classmethod
    def unique_assignees(cls, ids: list[str] | None) -> list[str] | None:
        if ids is not None and len(ids) != len(set(ids)):
            raise ValueError("Assignee ids must be unique")
        return ids

    @model_validator(mode="after")
    def required_fields_cannot_be_cleared(self) -> CardUpdate:
        for field_name in ("title", "details"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class MoveCard(APIModel):
    column_id: str = Field(alias="columnId", min_length=1)

    @field_validator("column_id")
    @classmethod
    def trim_column_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Column id cannot be empty")
        return normalized


class BoardColumnPayload(APIModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)

    @field_validator("id", "title")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be empty")
        return normalized


class BoardCardPayload(APIModel):
    id: str = Field(min_length=1)
    column_id: str = Field(alias="columnId", min_length=1)
    title: str = Field(min_length=1)
    details: str = ""
    priority: CardPriority | None = None
    due_date: str | None = Field(default=None, alias="dueDate")
    labels: list[str] = Field(default_factory=list)
    checklist: list[ChecklistItemInput] = Field(default_factory=list)
    assignee_ids: list[str] = Field(default_factory=list, alias="assigneeIds")

    @field_validator("id", "column_id", "title")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be empty")
        return normalized

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            parsed = date.fromisoformat(value)
        except ValueError as error:
            raise ValueError("Due date must be YYYY-MM-DD") from error
        if parsed.isoformat() != value:
            raise ValueError("Due date must be YYYY-MM-DD")
        return value

    @field_validator("checklist")
    @classmethod
    def unique_checklist_ids(cls, items: list[ChecklistItemInput]) -> list[ChecklistItemInput]:
        ids = [item.id for item in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Checklist item ids must be unique within a card")
        return items

    @field_validator("assignee_ids")
    @classmethod
    def unique_assignees(cls, ids: list[str]) -> list[str]:
        if len(ids) != len(set(ids)):
            raise ValueError("Assignee ids must be unique")
        return ids


class BoardStatePayload(APIModel):
    columns: list[BoardColumnPayload] = Field(min_length=1)
    cards: list[BoardCardPayload]

    @model_validator(mode="after")
    def validate_board_references(self) -> BoardStatePayload:
        column_ids = [column.id for column in self.columns]
        if len(column_ids) != len(set(column_ids)):
            raise ValueError("Column ids must be unique")
        card_ids = [card.id for card in self.cards]
        if len(card_ids) != len(set(card_ids)):
            raise ValueError("Card ids must be unique")
        allowed_columns = set(column_ids)
        if any(card.column_id not in allowed_columns for card in self.cards):
            raise ValueError("Every card must point to a column on this board")
        return self


class TeamMemberPayload(APIModel):
    id: str = Field(min_length=1)
    name_fa: str = Field(alias="nameFa", min_length=1)
    name_en: str = Field(alias="nameEn", min_length=1)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    gender: Literal["female", "male"]

    @field_validator("id", "name_fa", "name_en")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be empty")
        return normalized


class TeamPayload(APIModel):
    id: str = Field(min_length=1)
    name_fa: str = Field(alias="nameFa", min_length=1)
    name_en: str = Field(alias="nameEn", min_length=1)
    member_ids: list[str] = Field(alias="memberIds")

    @field_validator("id", "name_fa", "name_en")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be empty")
        return normalized


class TeamDirectoryPayload(APIModel):
    teams: list[TeamPayload]
    members: list[TeamMemberPayload]

    @model_validator(mode="after")
    def validate_directory_references(self) -> TeamDirectoryPayload:
        member_ids = [member.id for member in self.members]
        team_ids = [team.id for team in self.teams]
        if len(member_ids) != len(set(member_ids)):
            raise ValueError("Member ids must be unique")
        if len(team_ids) != len(set(team_ids)):
            raise ValueError("Team ids must be unique")
        allowed_members = set(member_ids)
        for team in self.teams:
            if len(team.member_ids) != len(set(team.member_ids)):
                raise ValueError("Team membership ids must be unique")
            if any(member_id not in allowed_members for member_id in team.member_ids):
                raise ValueError("Every team member must exist in the directory")
        return self


class InitializeBoardRequest(APIModel):
    board_present: bool = Field(alias="boardPresent")
    board: Any = None
    team_directory_present: bool = Field(alias="teamDirectoryPresent")
    team_directory: Any = Field(default=None, alias="teamDirectory")
    use_sample: bool = Field(default=False, alias="useSample")


Connection = Annotated[sqlite3.Connection, Depends(get_database_connection)]
router = APIRouter(prefix="/api/board", tags=["board"])


def owner_user_id(request: Request) -> str:
    if request.session.get("username") != DEMO_USERNAME:
        raise HTTPException(status_code=401, detail="Authentication required")
    return DEMO_USER_ID


def board_id_for(connection: sqlite3.Connection, user_id: str) -> str:
    try:
        return ensure_board_initialized(connection, user_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail="Board owner not found") from error


def read_board_state(connection: sqlite3.Connection, user_id: str) -> dict[str, object]:
    board_id = board_id_for(connection, user_id)
    return read_board_state_by_id(connection, user_id, board_id)


def read_board_state_by_id(
    connection: sqlite3.Connection,
    user_id: str,
    board_id: str,
) -> dict[str, object]:
    columns = connection.execute(
        """
        SELECT id, title
        FROM board_columns
        WHERE board_id = ?
        ORDER BY position
        """,
        (board_id,),
    ).fetchall()
    rows = connection.execute(
        """
        SELECT id, column_id, title, details, priority, due_date
        FROM cards
        WHERE board_id = ?
        ORDER BY (SELECT position FROM board_columns WHERE board_id = cards.board_id AND id = cards.column_id),
                 position
        """,
        (board_id,),
    ).fetchall()

    cards: list[dict[str, object]] = []
    for row in rows:
        card_id = row["id"]
        card: dict[str, object] = {
            "id": card_id,
            "columnId": row["column_id"],
            "title": row["title"],
            "details": row["details"],
            "labels": [
                item["label"]
                for item in connection.execute(
                    """
                    SELECT label FROM card_labels
                    WHERE board_id = ? AND card_id = ?
                    ORDER BY position
                    """,
                    (board_id, card_id),
                ).fetchall()
            ],
            "checklist": [
                {
                    "id": item["id"],
                    "text": item["text"],
                    "done": bool(item["done"]),
                }
                for item in connection.execute(
                    """
                    SELECT id, text, done FROM checklist_items
                    WHERE board_id = ? AND card_id = ?
                    ORDER BY position
                    """,
                    (board_id, card_id),
                ).fetchall()
            ],
            "assigneeIds": [
                item["member_id"]
                for item in connection.execute(
                    """
                    SELECT member_id FROM card_assignees
                    WHERE owner_user_id = ? AND board_id = ? AND card_id = ?
                    ORDER BY member_id
                    """,
                    (user_id, board_id, card_id),
                ).fetchall()
            ],
        }
        if row["priority"] is not None:
            card["priority"] = row["priority"]
        if row["due_date"] is not None:
            card["dueDate"] = row["due_date"]
        cards.append(card)

    return {
        "columns": [{"id": row["id"], "title": row["title"]} for row in columns],
        "cards": cards,
    }


def read_team_directory(connection: sqlite3.Connection, user_id: str) -> dict[str, object]:
    members = connection.execute(
        """
        SELECT id, name_fa, name_en, color, gender
        FROM team_members
        WHERE owner_user_id = ?
        ORDER BY position
        """,
        (user_id,),
    ).fetchall()
    teams = connection.execute(
        """
        SELECT id, name_fa, name_en
        FROM teams
        WHERE owner_user_id = ?
        ORDER BY position
        """,
        (user_id,),
    ).fetchall()
    team_values: list[dict[str, object]] = []
    for team in teams:
        member_ids = connection.execute(
            """
            SELECT member_id FROM team_memberships
            WHERE owner_user_id = ? AND team_id = ?
            ORDER BY position
            """,
            (user_id, team["id"]),
        ).fetchall()
        team_values.append(
            {
                "id": team["id"],
                "nameFa": team["name_fa"],
                "nameEn": team["name_en"],
                "memberIds": [row["member_id"] for row in member_ids],
            }
        )
    return {
        "teams": team_values,
        "members": [
            {
                "id": member["id"],
                "nameFa": member["name_fa"],
                "nameEn": member["name_en"],
                "color": member["color"],
                "gender": member["gender"],
            }
            for member in members
        ],
    }


def validate_board_assignees(
    connection: sqlite3.Connection,
    user_id: str,
    board_state: BoardStatePayload,
) -> None:
    member_ids = {
        row["id"]
        for row in connection.execute(
            "SELECT id FROM team_members WHERE owner_user_id = ?",
            (user_id,),
        ).fetchall()
    }
    if any(member_id not in member_ids for card in board_state.cards for member_id in card.assignee_ids):
        raise HTTPException(status_code=422, detail="One or more assignees do not belong to this user")


def ensure_column(connection: sqlite3.Connection, board_id: str, column_id: str) -> None:
    exists = connection.execute(
        "SELECT 1 FROM board_columns WHERE board_id = ? AND id = ?",
        (board_id, column_id),
    ).fetchone()
    if not exists:
        raise HTTPException(status_code=422, detail="Column does not belong to this board")


def ensure_assignees(
    connection: sqlite3.Connection,
    user_id: str,
    assignee_ids: list[str],
) -> None:
    if not assignee_ids:
        return
    placeholders = ",".join("?" for _ in assignee_ids)
    rows = connection.execute(
        f"""
        SELECT id FROM team_members
        WHERE owner_user_id = ? AND id IN ({placeholders})
        """,
        (user_id, *assignee_ids),
    ).fetchall()
    if len(rows) != len(assignee_ids):
        raise HTTPException(status_code=422, detail="One or more assignees do not belong to this user")


def replace_card_children(
    connection: sqlite3.Connection,
    user_id: str,
    board_id: str,
    card_id: str,
    *,
    labels: list[str] | None = None,
    checklist: list[ChecklistItemInput] | None = None,
    assignee_ids: list[str] | None = None,
) -> None:
    if labels is not None:
        connection.execute(
            "DELETE FROM card_labels WHERE board_id = ? AND card_id = ?",
            (board_id, card_id),
        )
        connection.executemany(
            "INSERT INTO card_labels (board_id, card_id, position, label) VALUES (?, ?, ?, ?)",
            [(board_id, card_id, position, label) for position, label in enumerate(labels)],
        )

    if checklist is not None:
        connection.execute(
            "DELETE FROM checklist_items WHERE board_id = ? AND card_id = ?",
            (board_id, card_id),
        )
        connection.executemany(
            """
            INSERT INTO checklist_items (board_id, card_id, id, position, text, done)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (board_id, card_id, item.id, position, item.text, int(item.done))
                for position, item in enumerate(checklist)
            ],
        )

    if assignee_ids is not None:
        ensure_assignees(connection, user_id, assignee_ids)
        connection.execute(
            """
            DELETE FROM card_assignees
            WHERE owner_user_id = ? AND board_id = ? AND card_id = ?
            """,
            (user_id, board_id, card_id),
        )
        connection.executemany(
            """
            INSERT INTO card_assignees (owner_user_id, board_id, card_id, member_id)
            VALUES (?, ?, ?, ?)
            """,
            [(user_id, board_id, card_id, member_id) for member_id in assignee_ids],
        )


def card_exists(connection: sqlite3.Connection, board_id: str, card_id: str) -> bool:
    return connection.execute(
        "SELECT 1 FROM cards WHERE board_id = ? AND id = ?",
        (board_id, card_id),
    ).fetchone() is not None


@router.get("/initialize")
def check_board_initialization(
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    existing = connection.execute(
        "SELECT 1 FROM boards WHERE owner_user_id = ?",
        (user_id,),
    ).fetchone()
    if not existing:
        return {"initialized": False}
    return {
        "initialized": True,
        "board": read_board_state(connection, user_id),
        "teamDirectory": read_team_directory(connection, user_id),
    }


@router.post("/initialize")
def initialize_board(
    body: InitializeBoardRequest,
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    existing = connection.execute(
        "SELECT 1 FROM boards WHERE owner_user_id = ?",
        (user_id,),
    ).fetchone()
    if existing:
        return {
            "board": read_board_state(connection, user_id),
            "teamDirectory": read_team_directory(connection, user_id),
        }

    board_payload: BoardStatePayload | None = None
    team_payload: TeamDirectoryPayload | None = None
    if not body.use_sample:
        try:
            if body.board_present:
                board_payload = BoardStatePayload.model_validate(body.board)
            if body.team_directory_present:
                team_payload = TeamDirectoryPayload.model_validate(body.team_directory)
        except ValidationError as error:
            raise HTTPException(
                status_code=422,
                detail="Saved browser data is invalid. Retry the import or choose the sample board.",
            ) from error

        selected_board = board_payload or BoardStatePayload.model_validate(sample_board_state())
        selected_teams = team_payload or TeamDirectoryPayload.model_validate(sample_team_directory())
        member_ids = {member.id for member in selected_teams.members}
        if any(
            assignee_id not in member_ids
            for card in selected_board.cards
            for assignee_id in card.assignee_ids
        ):
            raise HTTPException(
                status_code=422,
                detail="A saved card refers to a team member that is missing. Retry or choose the sample board.",
            )
        board_data = selected_board.model_dump(by_alias=True, exclude_none=True)
        team_data = selected_teams.model_dump(by_alias=True, exclude_none=True)
    else:
        board_data = None
        team_data = None

    try:
        initialize_user_data(
            connection,
            user_id,
            board_data,
            team_data,
            use_sample=body.use_sample,
        )
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=422,
            detail="Saved data conflicts with the database model. Retry or choose the sample board.",
        ) from error

    return {
        "board": read_board_state(connection, user_id),
        "teamDirectory": read_team_directory(connection, user_id),
    }


def write_board_state_rows(
    connection: sqlite3.Connection,
    user_id: str,
    board_id: str,
    body: BoardStatePayload,
) -> None:
    next_positions: dict[str, int] = {}
    connection.execute("DELETE FROM cards WHERE board_id = ?", (board_id,))
    connection.execute("DELETE FROM board_columns WHERE board_id = ?", (board_id,))
    for position, column in enumerate(body.columns):
        connection.execute(
            "INSERT INTO board_columns (board_id, id, title, position) VALUES (?, ?, ?, ?)",
            (board_id, column.id, column.title, position),
        )

    for card in body.cards:
        position = next_positions.get(card.column_id, 0)
        next_positions[card.column_id] = position + 1
        connection.execute(
            """
            INSERT INTO cards
                (board_id, id, column_id, position, title, details, priority, due_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                board_id,
                card.id,
                card.column_id,
                position,
                card.title,
                card.details,
                card.priority,
                card.due_date,
            ),
        )
        replace_card_children(
            connection,
            user_id,
            board_id,
            card.id,
            labels=card.labels,
            checklist=card.checklist,
            assignee_ids=card.assignee_ids,
        )
    connection.execute(
        """
        UPDATE boards SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE owner_user_id = ? AND id = ?
        """,
        (user_id, board_id),
    )


def persist_board_state(
    connection: sqlite3.Connection,
    user_id: str,
    body: BoardStatePayload,
) -> dict[str, object]:
    board_id = board_id_for(connection, user_id)
    validate_board_assignees(connection, user_id, body)
    try:
        with connection:
            write_board_state_rows(connection, user_id, board_id, body)
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Board update conflicts with existing data") from error
    return read_board_state_by_id(connection, user_id, board_id)


@router.put("")
def replace_board(
    body: BoardStatePayload,
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    return persist_board_state(connection, user_id, body)

@router.get("/team-directory")
def get_team_directory(
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    board_id_for(connection, user_id)
    return read_team_directory(connection, user_id)


@router.put("/team-directory")
def replace_team_directory(
    body: TeamDirectoryPayload,
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    board_id_for(connection, user_id)
    member_ids = [member.id for member in body.members]
    member_id_set = set(member_ids)

    with connection:
        connection.execute("DELETE FROM teams WHERE owner_user_id = ?", (user_id,))
        if member_ids:
            placeholders = ",".join("?" for _ in member_ids)
            connection.execute(
                f"DELETE FROM team_members WHERE owner_user_id = ? AND id NOT IN ({placeholders})",
                (user_id, *member_ids),
            )
        else:
            connection.execute("DELETE FROM team_members WHERE owner_user_id = ?", (user_id,))

        connection.execute(
            "UPDATE team_members SET position = position + 1000000 WHERE owner_user_id = ?",
            (user_id,),
        )
        for position, member in enumerate(body.members):
            connection.execute(
                """
                INSERT INTO team_members
                    (owner_user_id, id, name_fa, name_en, color, gender, position)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_user_id, id) DO UPDATE SET
                    name_fa = excluded.name_fa,
                    name_en = excluded.name_en,
                    color = excluded.color,
                    gender = excluded.gender,
                    position = excluded.position
                """,
                (
                    user_id,
                    member.id,
                    member.name_fa,
                    member.name_en,
                    member.color,
                    member.gender,
                    position,
                ),
            )

        for position, team in enumerate(body.teams):
            connection.execute(
                """
                INSERT INTO teams (owner_user_id, id, name_fa, name_en, position)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, team.id, team.name_fa, team.name_en, position),
            )
            for member_position, member_id in enumerate(team.member_ids):
                if member_id not in member_id_set:
                    raise HTTPException(status_code=422, detail="Team member does not belong to this user")
                connection.execute(
                    """
                    INSERT INTO team_memberships
                        (owner_user_id, team_id, member_id, position)
                    VALUES (?, ?, ?, ?)
                    """,
                    (user_id, team.id, member_id, member_position),
                )

    return read_team_directory(connection, user_id)


@router.get("")
def get_board(
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    return read_board_state(connection, owner_user_id(request))


@router.post("/columns", status_code=201)
def create_column(
    body: ColumnCreate,
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    board_id = board_id_for(connection, user_id)
    try:
        with connection:
            position = connection.execute(
                "SELECT COALESCE(MAX(position), -1) + 1 FROM board_columns WHERE board_id = ?",
                (board_id,),
            ).fetchone()[0]
            connection.execute(
                "INSERT INTO board_columns (board_id, id, title, position) VALUES (?, ?, ?, ?)",
                (board_id, body.id, body.title, position),
            )
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Column id already exists") from error
    return read_board_state(connection, user_id)


@router.patch("/columns/{column_id}")
def rename_column(
    column_id: str,
    body: ColumnRename,
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    board_id = board_id_for(connection, user_id)
    with connection:
        cursor = connection.execute(
            "UPDATE board_columns SET title = ? WHERE board_id = ? AND id = ?",
            (body.title, board_id, column_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Column not found")
    return read_board_state(connection, user_id)


@router.delete("/columns/{column_id}", status_code=204)
def delete_column(
    column_id: str,
    request: Request,
    connection: Connection,
) -> Response:
    user_id = owner_user_id(request)
    board_id = board_id_for(connection, user_id)
    with connection:
        column = connection.execute(
            "SELECT 1 FROM board_columns WHERE board_id = ? AND id = ?",
            (board_id, column_id),
        ).fetchone()
        if not column:
            raise HTTPException(status_code=404, detail="Column not found")
        column_count = connection.execute(
            "SELECT COUNT(*) FROM board_columns WHERE board_id = ?",
            (board_id,),
        ).fetchone()[0]
        if column_count <= 1:
            raise HTTPException(status_code=409, detail="A board must keep at least one column")
        has_cards = connection.execute(
            "SELECT 1 FROM cards WHERE board_id = ? AND column_id = ? LIMIT 1",
            (board_id, column_id),
        ).fetchone()
        if has_cards:
            raise HTTPException(status_code=409, detail="Move or delete this column's cards first")
        connection.execute(
            "DELETE FROM board_columns WHERE board_id = ? AND id = ?",
            (board_id, column_id),
        )

    return Response(status_code=204)


@router.post("/cards", status_code=201)
def create_card(
    body: CardCreate,
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    board_id = board_id_for(connection, user_id)
    ensure_column(connection, board_id, body.column_id)
    ensure_assignees(connection, user_id, body.assignee_ids)
    try:
        with connection:
            position = connection.execute(
                """
                SELECT COALESCE(MAX(position), -1) + 1
                FROM cards WHERE board_id = ? AND column_id = ?
                """,
                (board_id, body.column_id),
            ).fetchone()[0]
            connection.execute(
                """
                INSERT INTO cards
                    (board_id, id, column_id, position, title, details, priority, due_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    board_id,
                    body.id,
                    body.column_id,
                    position,
                    body.title,
                    body.details,
                    body.priority,
                    body.due_date,
                ),
            )
            replace_card_children(
                connection,
                user_id,
                board_id,
                body.id,
                labels=body.labels,
                checklist=body.checklist,
                assignee_ids=body.assignee_ids,
            )
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Card id or child item id already exists") from error
    return read_board_state(connection, user_id)


@router.patch("/cards/{card_id}")
def update_card(
    card_id: str,
    body: CardUpdate,
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    board_id = board_id_for(connection, user_id)
    if not card_exists(connection, board_id, card_id):
        raise HTTPException(status_code=404, detail="Card not found")

    updates = body.model_dump(exclude_unset=True)
    if "title" in updates and updates["title"] is None:
        raise HTTPException(status_code=422, detail="Card title cannot be null")
    if "details" in updates and updates["details"] is None:
        raise HTTPException(status_code=422, detail="Card details cannot be null")
    if "assignee_ids" in updates and updates["assignee_ids"] is not None:
        ensure_assignees(connection, user_id, updates["assignee_ids"])

    scalar_columns = {
        "title": "title",
        "details": "details",
        "priority": "priority",
        "due_date": "due_date",
    }
    scalar_updates = {
        column: updates[field]
        for field, column in scalar_columns.items()
        if field in updates
    }

    try:
        with connection:
            if scalar_updates:
                assignments = ", ".join(f"{column} = ?" for column in scalar_updates)
                values = list(scalar_updates.values())
                connection.execute(
                    f"""
                    UPDATE cards
                    SET {assignments}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    WHERE board_id = ? AND id = ?
                    """,
                    (*values, board_id, card_id),
                )
            replace_card_children(
                connection,
                user_id,
                board_id,
                card_id,
                labels=(body.labels or []) if "labels" in body.model_fields_set else None,
                checklist=(body.checklist or []) if "checklist" in body.model_fields_set else None,
                assignee_ids=(body.assignee_ids or []) if "assignee_ids" in body.model_fields_set else None,
            )
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Card update conflicts with existing data") from error
    return read_board_state(connection, user_id)


@router.post("/cards/{card_id}/move")
def move_card(
    card_id: str,
    body: MoveCard,
    request: Request,
    connection: Connection,
) -> dict[str, object]:
    user_id = owner_user_id(request)
    board_id = board_id_for(connection, user_id)
    if not card_exists(connection, board_id, card_id):
        raise HTTPException(status_code=404, detail="Card not found")
    ensure_column(connection, board_id, body.column_id)

    with connection:
        position = connection.execute(
            """
            SELECT COALESCE(MAX(position), -1) + 1
            FROM cards WHERE board_id = ? AND column_id = ?
            """,
            (board_id, body.column_id),
        ).fetchone()[0]
        connection.execute(
            """
            UPDATE cards
            SET column_id = ?, position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE board_id = ? AND id = ?
            """,
            (body.column_id, position, board_id, card_id),
        )
    return read_board_state(connection, user_id)


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(
    card_id: str,
    request: Request,
    connection: Connection,
) -> Response:
    user_id = owner_user_id(request)
    board_id = board_id_for(connection, user_id)
    with connection:
        cursor = connection.execute(
            "DELETE FROM cards WHERE board_id = ? AND id = ?",
            (board_id, card_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Card not found")
    return Response(status_code=204)





