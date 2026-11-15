from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import ai
from app.database import connect_database, get_database_path
from app.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("KANBAN_DATA_DIR", str(tmp_path))
    with TestClient(app) as test_client:
        yield test_client


def sign_in(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200


def model_action(**overrides: Any) -> dict[str, Any]:
    action: dict[str, Any] = {
        "type": "update_card",
        "cardId": "brief",
        "columnId": None,
        "title": None,
        "details": None,
        "priority": None,
        "clearPriority": False,
        "dueDate": None,
        "clearDueDate": False,
        "labels": None,
        "checklist": None,
        "assigneeIds": None,
    }
    action.update(overrides)
    return action


def model_response(changes: list[dict[str, Any]] | None = None, reply: str = "Done.") -> str:
    return json.dumps({"reply": reply, "changes": changes or []})


def mock_model(monkeypatch: pytest.MonkeyPatch, raw: str):
    calls: list[dict[str, Any]] = []

    async def fake_completion(messages: list[dict[str, str]], **kwargs: Any) -> str:
        calls.append({"messages": messages, **kwargs})
        return raw

    monkeypatch.setattr(ai, "create_chat_completion", fake_completion)
    return calls


def test_chat_without_changes_includes_history_snapshot_and_structured_output(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    sign_in(client)
    initial_board = client.get("/api/board").json()
    calls = mock_model(monkeypatch, model_response(reply="There are five columns."))

    response = client.post(
        "/api/ai/chat",
        json={
            "question": "How many columns are on my board?",
            "history": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi."},
            ],
        },
    )

    assert response.status_code == 200
    assert response.json() == {"reply": "There are five columns.", "board": initial_board}
    assert len(calls) == 1
    call = calls[0]
    assert call["max_tokens"] == 4096
    assert call["provider"] == {"require_parameters": True}
    assert call["response_format"]["type"] == "json_schema"
    assert call["response_format"]["json_schema"]["strict"] is True
    assert call["response_format"]["json_schema"]["schema"]["additionalProperties"] is False
    messages = call["messages"]
    assert [message["role"] for message in messages] == ["system", "user", "assistant", "user"]
    assert "teamDirectory" in messages[0]["content"]
    assert "backlog" in messages[0]["content"]
    assert messages[-2]["content"] == "Hi."
    assert messages[-1]["content"] == "How many columns are on my board?"


def test_chat_creates_a_card_automatically(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    sign_in(client)
    mock_model(
        monkeypatch,
        model_response(
            [
                model_action(
                    type="create_card",
                    cardId=None,
                    columnId="backlog",
                    title="Plan release",
                    details="Prepare the release checklist.",
                    priority="high",
                    dueDate="2026-11-20",
                    labels=["release"],
                    checklist=[{"id": "release-notes", "text": "Write notes", "done": False}],
                    assigneeIds=["sara-ahmadi"],
                )
            ]
        ),
    )

    response = client.post("/api/ai/chat", json={"question": "Create a release card."})

    assert response.status_code == 200
    board = response.json()["board"]
    created = next(card for card in board["cards"] if card["title"] == "Plan release")
    assert created["id"].startswith("ai-")
    assert created["columnId"] == "backlog"
    assert created["priority"] == "high"
    assert created["dueDate"] == "2026-11-20"
    assert created["assigneeIds"] == ["sara-ahmadi"]
    assert client.get("/api/board").json() == board


def test_chat_updates_and_moves_an_existing_card(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    sign_in(client)
    mock_model(
        monkeypatch,
        model_response(
            [
                model_action(
                    columnId="done",
                    title="Brief approved",
                    details="Approved by the team.",
                    priority="low",
                    clearDueDate=True,
                    labels=[],
                    checklist=[],
                    assigneeIds=[],
                )
            ]
        ),
    )

    response = client.post("/api/ai/chat", json={"question": "Approve and move the brief to done."})

    assert response.status_code == 200
    done_cards = [card for card in response.json()["board"]["cards"] if card["columnId"] == "done"]
    card = next(card for card in done_cards if card["id"] == "brief")
    assert done_cards[-1]["id"] == "brief"
    assert card["columnId"] == "done"
    assert card["title"] == "Brief approved"
    assert card["details"] == "Approved by the team."
    assert card["priority"] == "low"
    assert "dueDate" not in card
    assert card["labels"] == []
    assert card["checklist"] == []
    assert card["assigneeIds"] == []


@pytest.mark.parametrize(
    "raw,changes",
    [
        ("not-json", None),
        (json.dumps({"reply": "Missing changes"}), None),
        (None, [model_action(type="delete_card")]),
        (None, [model_action(cardId="belongs-to-another-board", title="Intrude")]),
        (None, [model_action(columnId="missing-column")]),
        (
            None,
            [
                model_action(
                    type="create_card",
                    cardId=None,
                    columnId="backlog",
                    title="Invalid assignee",
                    assigneeIds=["some-other-users-member"],
                )
            ],
        ),
        (
            None,
            [
                model_action(
                    type="create_card",
                    cardId=None,
                    columnId="backlog",
                    title="Invalid checklist text",
                    checklist=[{"id": "long-text", "text": "x" * 1001, "done": False}],
                )
            ],
        ),
    ],
)
def test_invalid_model_output_is_rejected_without_changes(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    raw: str | None,
    changes: list[dict[str, Any]] | None,
) -> None:
    sign_in(client)
    initial_board = client.get("/api/board").json()
    mock_model(monkeypatch, raw if raw is not None else model_response(changes))

    response = client.post("/api/ai/chat", json={"question": "Change my board."})

    assert response.status_code == 502
    assert client.get("/api/board").json() == initial_board


def test_multiple_actions_are_validated_before_any_are_saved(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    sign_in(client)
    initial_board = client.get("/api/board").json()
    mock_model(
        monkeypatch,
        model_response(
            [
                model_action(
                    type="create_card",
                    cardId=None,
                    columnId="backlog",
                    title="Would otherwise be created",
                ),
                model_action(cardId="missing-card", title="Invalid second action"),
            ]
        ),
    )

    response = client.post("/api/ai/chat", json={"question": "Create a card and edit another."})

    assert response.status_code == 502
    assert client.get("/api/board").json() == initial_board


def test_database_failure_rolls_back_all_ai_changes(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    sign_in(client)
    initial_board = client.get("/api/board").json()
    with sqlite3.connect(get_database_path()) as database:
        database.execute(
            """
            CREATE TRIGGER reject_ai_cards BEFORE INSERT ON cards
            WHEN NEW.id LIKE 'ai-%'
            BEGIN SELECT RAISE(ABORT, 'simulated database failure'); END
            """
        )
    mock_model(
        monkeypatch,
        model_response(
            [
                model_action(
                    type="create_card",
                    cardId=None,
                    columnId="backlog",
                    title="Trigger rollback",
                )
            ]
        ),
    )

    response = client.post("/api/ai/chat", json={"question": "Create a card."})

    assert response.status_code == 409
    assert client.get("/api/board").json() == initial_board


def test_stale_ai_result_does_not_overwrite_a_concurrent_board_change(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    sign_in(client)
    initial_board = client.get("/api/board").json()
    path = get_database_path()

    async def concurrent_change_then_complete(messages: list[dict[str, str]], **kwargs: Any) -> str:
        with connect_database(path) as database:
            database.execute("UPDATE cards SET title = ? WHERE board_id = ? AND id = ?", ("Concurrent title", "demo-board", "brief"))
        return model_response([model_action(title="Stale AI title")])

    monkeypatch.setattr(ai, "create_chat_completion", concurrent_change_then_complete)

    response = client.post("/api/ai/chat", json={"question": "Rename the brief."})

    assert response.status_code == 409
    final_board = client.get("/api/board").json()
    assert final_board != initial_board
    card = next(card for card in final_board["cards"] if card["id"] == "brief")
    assert card["title"] == "Concurrent title"
