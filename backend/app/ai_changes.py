from __future__ import annotations

from datetime import date
from typing import Annotated, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from app.board import BoardCardPayload, BoardStatePayload

CardPriority = Literal["low", "medium", "high"]
AIText = Annotated[str, Field(min_length=1, max_length=200)]


class AIChecklistItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=200)
    text: str = Field(max_length=1000)
    done: bool

    @field_validator("id")
    @classmethod
    def normalize_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Checklist item id cannot be empty")
        return normalized


class AIModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class AIAction(AIModel):
    type: Literal["create_card", "update_card"]
    card_id: str | None = Field(..., alias="cardId", max_length=200)
    column_id: str | None = Field(..., alias="columnId", max_length=200)
    title: str | None = Field(..., max_length=200)
    details: str | None = Field(..., max_length=5000)
    priority: CardPriority | None
    clear_priority: bool = Field(..., alias="clearPriority")
    due_date: str | None = Field(..., alias="dueDate")
    clear_due_date: bool = Field(..., alias="clearDueDate")
    labels: Annotated[list[AIText] | None, Field(max_length=20)]
    checklist: Annotated[list[AIChecklistItem] | None, Field(max_length=50)]
    assignee_ids: Annotated[list[AIText] | None, Field(max_length=20, alias="assigneeIds")]

    @field_validator("card_id", "column_id")
    @classmethod
    def normalize_ids(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("labels", "assignee_ids")
    @classmethod
    def normalize_string_lists(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        normalized = [value.strip() for value in values]
        if any(not value for value in normalized):
            raise ValueError("List values cannot be empty")
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


class AIResponse(AIModel):
    reply: str = Field(min_length=1, max_length=4000)
    changes: Annotated[list[AIAction], Field(max_length=20)]

    @field_validator("reply")
    @classmethod
    def normalize_reply(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Reply cannot be empty")
        return normalized


CHECKLIST_ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "minLength": 1, "maxLength": 200},
        "text": {"type": "string", "maxLength": 1000},
        "done": {"type": "boolean"},
    },
    "required": ["id", "text", "done"],
    "additionalProperties": False,
}

NULLABLE_ID = {"anyOf": [{"type": "string", "maxLength": 200}, {"type": "null"}]}
NULLABLE_PRIORITY = {
    "anyOf": [{"type": "string", "enum": ["low", "medium", "high"]}, {"type": "null"}]
}

STRICT_AI_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string", "minLength": 1, "maxLength": 4000},
        "changes": {
            "type": "array",
            "maxItems": 20,
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["create_card", "update_card"]},
                    "cardId": NULLABLE_ID,
                    "columnId": NULLABLE_ID,
                    "title": {"anyOf": [{"type": "string", "maxLength": 200}, {"type": "null"}]},
                    "details": {"anyOf": [{"type": "string", "maxLength": 5000}, {"type": "null"}]},
                    "priority": NULLABLE_PRIORITY,
                    "clearPriority": {"type": "boolean"},
                    "dueDate": {
                        "anyOf": [
                            {"type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
                            {"type": "null"},
                        ]
                    },
                    "clearDueDate": {"type": "boolean"},
                    "labels": {
                        "anyOf": [
                            {"type": "array", "maxItems": 20, "items": {"type": "string", "minLength": 1, "maxLength": 200}},
                            {"type": "null"},
                        ]
                    },
                    "checklist": {
                        "anyOf": [
                            {"type": "array", "maxItems": 50, "items": CHECKLIST_ITEM_SCHEMA},
                            {"type": "null"},
                        ]
                    },
                    "assigneeIds": {
                        "anyOf": [
                            {"type": "array", "maxItems": 20, "items": {"type": "string", "minLength": 1, "maxLength": 200}},
                            {"type": "null"},
                        ]
                    },
                },
                "required": [
                    "type",
                    "cardId",
                    "columnId",
                    "title",
                    "details",
                    "priority",
                    "clearPriority",
                    "dueDate",
                    "clearDueDate",
                    "labels",
                    "checklist",
                    "assigneeIds",
                ],
                "additionalProperties": False,
            },
        },
    },
    "required": ["reply", "changes"],
    "additionalProperties": False,
}


def response_format() -> dict[str, object]:
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "kanban_ai_response",
            "strict": True,
            "schema": STRICT_AI_RESPONSE_SCHEMA,
        },
    }


class AIOutputError(ValueError):
    """The model proposed a change outside the supported, valid board operations."""


def _action_has_update(action: AIAction) -> bool:
    return any(
        value is not None
        for value in (
            action.column_id,
            action.title,
            action.details,
            action.priority,
            action.due_date,
            action.labels,
            action.checklist,
            action.assignee_ids,
        )
    ) or action.clear_priority or action.clear_due_date


def apply_ai_changes(
    board_snapshot: dict[str, object],
    response: AIResponse,
    allowed_member_ids: set[str],
) -> BoardStatePayload:
    """Validate all model actions and build a complete replacement in memory."""
    try:
        current = BoardStatePayload.model_validate(board_snapshot)
    except ValidationError as error:
        raise AIOutputError("The saved board is invalid") from error

    columns = {column.id for column in current.columns}
    cards = [card.model_dump(by_alias=True, exclude_none=True) for card in current.cards]
    card_indices = {str(card["id"]): index for index, card in enumerate(cards)}
    seen_updates: set[str] = set()

    for action in response.changes:
        if action.clear_priority and action.priority is not None:
            raise AIOutputError("Conflicting priority values")
        if action.clear_due_date and action.due_date is not None:
            raise AIOutputError("Conflicting due date values")

        if action.type == "create_card":
            if action.card_id is not None or action.column_id not in columns or not action.title:
                raise AIOutputError("Invalid card creation")
            if action.clear_priority or action.clear_due_date:
                raise AIOutputError("Invalid card creation flags")
            card_id = f"ai-{uuid4().hex}"
            while card_id in card_indices:
                card_id = f"ai-{uuid4().hex}"
            card: dict[str, object] = {
                "id": card_id,
                "columnId": action.column_id,
                "title": action.title,
                "details": action.details if action.details is not None else "",
                "labels": action.labels if action.labels is not None else [],
                "checklist": [item.model_dump() for item in action.checklist or []],
                "assigneeIds": action.assignee_ids if action.assignee_ids is not None else [],
            }
            if action.priority is not None:
                card["priority"] = action.priority
            if action.due_date is not None:
                card["dueDate"] = action.due_date
            try:
                validated_card = BoardCardPayload.model_validate(card)
            except ValidationError as error:
                raise AIOutputError("Invalid card creation values") from error
            if any(member_id not in allowed_member_ids for member_id in validated_card.assignee_ids):
                raise AIOutputError("Unknown assignee")
            card_indices[card_id] = len(cards)
            cards.append(validated_card.model_dump(by_alias=True, exclude_none=True))
            continue

        if action.card_id is None or action.card_id not in card_indices:
            raise AIOutputError("Card is not on this user's board")
        if action.card_id in seen_updates:
            raise AIOutputError("A card can only be updated once per response")
        if not _action_has_update(action):
            raise AIOutputError("Empty card update")
        seen_updates.add(action.card_id)

        index = card_indices[action.card_id]
        updated = dict(cards[index])
        moved_to_another_column = False
        if action.column_id is not None:
            if action.column_id not in columns:
                raise AIOutputError("Column is not on this user's board")
            moved_to_another_column = action.column_id != updated["columnId"]
            updated["columnId"] = action.column_id
        if action.title is not None:
            if not action.title:
                raise AIOutputError("Card title cannot be empty")
            updated["title"] = action.title
        if action.details is not None:
            updated["details"] = action.details
        if action.clear_priority:
            updated.pop("priority", None)
        elif action.priority is not None:
            updated["priority"] = action.priority
        if action.clear_due_date:
            updated.pop("dueDate", None)
        elif action.due_date is not None:
            updated["dueDate"] = action.due_date
        if action.labels is not None:
            updated["labels"] = action.labels
        if action.checklist is not None:
            updated["checklist"] = [item.model_dump() for item in action.checklist]
        if action.assignee_ids is not None:
            updated["assigneeIds"] = action.assignee_ids

        try:
            validated_card = BoardCardPayload.model_validate(updated)
        except ValidationError as error:
            raise AIOutputError("Invalid card update values") from error
        if any(member_id not in allowed_member_ids for member_id in validated_card.assignee_ids):
            raise AIOutputError("Unknown assignee")
        validated_data = validated_card.model_dump(by_alias=True, exclude_none=True)
        if moved_to_another_column:
            cards.pop(index)
            cards.append(validated_data)
            card_indices = {str(card["id"]): card_index for card_index, card in enumerate(cards)}
        else:
            cards[index] = validated_data

    try:
        return BoardStatePayload.model_validate(
            {
                "columns": [column.model_dump() for column in current.columns],
                "cards": cards,
            }
        )
    except ValidationError as error:
        raise AIOutputError("Invalid resulting board") from error
