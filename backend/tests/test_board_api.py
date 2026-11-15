from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.database import get_database_path
from app.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("KANBAN_DATA_DIR", str(tmp_path))
    with TestClient(app) as test_client:
        yield test_client


def sign_in(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
    )
    assert response.status_code == 200


def test_startup_creates_database_and_first_read_seeds_sample(client, tmp_path: Path) -> None:
    path = get_database_path()
    assert path == tmp_path / "kanban.sqlite3"
    assert path.exists()

    connection = sqlite3.connect(path)
    try:
        assert connection.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM boards").fetchone()[0] == 0
    finally:
        connection.close()

    sign_in(client)
    response = client.get("/api/board")
    assert response.status_code == 200
    board = response.json()
    assert [column["id"] for column in board["columns"]] == [
        "backlog", "up-next", "in-progress", "review", "done",
    ]
    assert len(board["cards"]) == 8
    assert all(card["labels"] for card in board["cards"])
    assert all(card["checklist"] for card in board["cards"])

    connection = sqlite3.connect(path)
    try:
        assert connection.execute("SELECT COUNT(*) FROM boards").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM teams").fetchone()[0] == 3
        assert connection.execute("SELECT COUNT(*) FROM team_members").fetchone()[0] == 4
        assert connection.execute(
            "SELECT source FROM user_data_migrations WHERE user_id = 'demo-user' AND migration_key = 'localStorage-v1'"
        ).fetchone()[0] == "sample-seed"
    finally:
        connection.close()


def test_board_and_card_routes_require_authentication(client) -> None:
    assert client.get("/api/board").status_code == 401
    assert client.post(
        "/api/board/cards",
        json={"id": "private", "columnId": "backlog", "title": "Private", "details": ""},
    ).status_code == 401


def test_column_and_card_crud_preserves_canonical_board_state(client) -> None:
    sign_in(client)
    initial = client.get("/api/board").json()

    response = client.post(
        "/api/board/columns",
        json={"id": "ready", "title": "Ready"},
    )
    assert response.status_code == 201
    assert response.json()["columns"][-1] == {"id": "ready", "title": "Ready"}

    response = client.patch("/api/board/columns/ready", json={"title": "Ready to share"})
    assert response.status_code == 200
    assert response.json()["columns"][-1]["title"] == "Ready to share"

    response = client.post(
        "/api/board/cards",
        json={
            "id": "new-card",
            "columnId": "ready",
            "title": "Prepare release notes",
            "details": "Summarize the changes.",
            "priority": "high",
            "dueDate": "2027-03-02",
            "labels": ["Release", "Writing"],
            "checklist": [{"id": "draft", "text": "Draft notes", "done": False}],
            "assigneeIds": ["sara-ahmadi"],
        },
    )
    assert response.status_code == 201
    created = next(card for card in response.json()["cards"] if card["id"] == "new-card")
    assert created["labels"] == ["Release", "Writing"]
    assert created["checklist"] == [{"id": "draft", "text": "Draft notes", "done": False}]
    assert created["assigneeIds"] == ["sara-ahmadi"]
    assert created["dueDate"] == "2027-03-02"

    response = client.patch(
        "/api/board/cards/new-card",
        json={
            "title": "Publish release notes",
            "priority": "medium",
            "labels": ["Published"],
            "checklist": [{"id": "published", "text": "Publish notes", "done": True}],
            "assigneeIds": ["arman-karimi", "sara-ahmadi"],
        },
    )
    assert response.status_code == 200
    edited = next(card for card in response.json()["cards"] if card["id"] == "new-card")
    assert edited["title"] == "Publish release notes"
    assert edited["priority"] == "medium"
    assert edited["labels"] == ["Published"]
    assert edited["checklist"] == [{"id": "published", "text": "Publish notes", "done": True}]
    assert edited["assigneeIds"] == ["arman-karimi", "sara-ahmadi"]

    response = client.post(
        "/api/board/cards/new-card/move",
        json={"columnId": "up-next"},
    )
    assert response.status_code == 200
    moved = next(card for card in response.json()["cards"] if card["id"] == "new-card")
    assert moved["columnId"] == "up-next"

    assert client.delete("/api/board/columns/up-next").status_code == 409
    assert client.delete("/api/board/cards/new-card").status_code == 204
    assert client.delete("/api/board/columns/ready").status_code == 204

    final = client.get("/api/board").json()
    assert len(final["columns"]) == len(initial["columns"])
    assert all(card["id"] != "new-card" for card in final["cards"])


def test_invalid_relations_and_bad_updates_roll_back(client) -> None:
    sign_in(client)
    initial = client.get("/api/board").json()
    original_title = next(card["title"] for card in initial["cards"] if card["id"] == "brief")

    response = client.post(
        "/api/board/cards",
        json={"id": "bad-column", "columnId": "other-board-column", "title": "Invalid", "details": ""},
    )
    assert response.status_code == 422

    response = client.post(
        "/api/board/cards",
        json={
            "id": "bad-assignee",
            "columnId": "backlog",
            "title": "Invalid assignment",
            "details": "",
            "assigneeIds": ["not-this-user"],
        },
    )
    assert response.status_code == 422

    response = client.patch(
        "/api/board/cards/brief",
        json={"title": "Should roll back", "assigneeIds": ["not-this-user"]},
    )
    assert response.status_code == 422
    after = client.get("/api/board").json()
    assert next(card["title"] for card in after["cards"] if card["id"] == "brief") == original_title
    assert all(card["id"] not in {"bad-column", "bad-assignee"} for card in after["cards"])

    assert client.post(
        "/api/board/cards/brief/move",
        json={"columnId": "not-a-column"},
    ).status_code == 422
    assert client.patch("/api/board/cards/not-a-card", json={"title": "Missing"}).status_code == 404
    assert client.delete("/api/board/cards/not-a-card").status_code == 404


def test_owner_scope_allows_same_sample_ids_but_hides_other_users_data(client, tmp_path: Path) -> None:
    sign_in(client)
    own_board = client.get("/api/board").json()
    own_title = next(card["title"] for card in own_board["cards"] if card["id"] == "brief")

    connection = sqlite3.connect(tmp_path / "kanban.sqlite3")
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:
            connection.execute(
                "INSERT INTO users (id, username) VALUES ('other-user', 'other')"
            )
            connection.execute(
                "INSERT INTO boards (id, owner_user_id) VALUES ('other-board', 'other-user')"
            )
            connection.execute(
                "INSERT INTO board_columns (board_id, id, title, position) VALUES ('other-board', 'backlog', 'Private backlog', 0)"
            )
            connection.execute(
                """
                INSERT INTO cards (board_id, id, column_id, position, title, details)
                VALUES ('other-board', 'brief', 'backlog', 0, 'Private card', '')
                """
            )
            connection.execute(
                """
                INSERT INTO team_members
                    (owner_user_id, id, name_fa, name_en, color, gender, position)
                VALUES ('other-user', 'private-member', 'Private', 'Private', '#123456', 'female', 0)
                """
            )
    finally:
        connection.close()

    own_board_again = client.get("/api/board").json()
    assert next(card["title"] for card in own_board_again["cards"] if card["id"] == "brief") == own_title
    assert client.patch("/api/board/cards/private-card", json={"title": "Attempt"}).status_code == 404
    assert client.post(
        "/api/board/cards",
        json={
            "id": "cross-owner-assignment",
            "columnId": "backlog",
            "title": "Invalid owner",
            "details": "",
            "assigneeIds": ["private-member"],
        },
    ).status_code == 422


def test_board_state_survives_database_reopen(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KANBAN_DATA_DIR", str(tmp_path))
    with TestClient(app) as first_client:
        sign_in(first_client)
        response = first_client.post(
            "/api/board/cards",
            json={
                "id": "persistent-card",
                "columnId": "done",
                "title": "Survive restart",
                "details": "Stored in the data directory.",
            },
        )
        assert response.status_code == 201

    with TestClient(app) as second_client:
        sign_in(second_client)
        board = second_client.get("/api/board").json()
        card = next(card for card in board["cards"] if card["id"] == "persistent-card")
        assert card["title"] == "Survive restart"




def test_initialize_endpoint_imports_browser_state_before_first_board_read(client, tmp_path: Path) -> None:
    sign_in(client)
    assert client.get("/api/board/initialize").json() == {"initialized": False}

    board = {
        "columns": [{"id": "ideas", "title": "Ideas"}],
        "cards": [{"id": "saved-card", "columnId": "ideas", "title": "Saved card", "details": "From this browser", "labels": [], "checklist": [], "assigneeIds": ["member-x"]}],
    }
    directory = {
        "teams": [{"id": "team-x", "nameFa": "تیم ایکس", "nameEn": "Team X", "memberIds": ["member-x"]}],
        "members": [{"id": "member-x", "nameFa": "عضو", "nameEn": "Member", "color": "#123456", "gender": "female"}],
    }
    response = client.post("/api/board/initialize", json={
        "boardPresent": True, "board": board,
        "teamDirectoryPresent": True, "teamDirectory": directory,
    })
    assert response.status_code == 200
    assert response.json() == {"board": board, "teamDirectory": directory}

    connection = sqlite3.connect(tmp_path / "kanban.sqlite3")
    try:
        assert connection.execute("SELECT source FROM user_data_migrations").fetchone()[0] == "localStorage-v1"
    finally:
        connection.close()

    later_browser = client.post("/api/board/initialize", json={
        "boardPresent": False, "teamDirectoryPresent": False, "useSample": True,
    })
    assert later_browser.status_code == 200
    assert later_browser.json() == {"board": board, "teamDirectory": directory}


def test_invalid_import_does_not_create_partial_data_and_sample_choice_recovers(client, tmp_path: Path) -> None:
    sign_in(client)
    response = client.post("/api/board/initialize", json={
        "boardPresent": True,
        "board": {"columns": [{"id": "ideas", "title": "Ideas"}], "cards": [
            {"id": "orphan", "columnId": "ideas", "title": "Orphan", "assigneeIds": ["missing-member"]},
        ]},
        "teamDirectoryPresent": True,
        "teamDirectory": {"teams": [], "members": []},
    })
    assert response.status_code == 422
    assert client.get("/api/board/initialize").json() == {"initialized": False}

    connection = sqlite3.connect(tmp_path / "kanban.sqlite3")
    try:
        assert connection.execute("SELECT COUNT(*) FROM boards").fetchone()[0] == 0
        assert connection.execute("SELECT COUNT(*) FROM user_data_migrations").fetchone()[0] == 0
    finally:
        connection.close()

    recovered = client.post("/api/board/initialize", json={
        "boardPresent": False, "teamDirectoryPresent": False, "useSample": True,
    })
    assert recovered.status_code == 200
    assert len(recovered.json()["board"]["columns"]) == 5
    assert len(recovered.json()["board"]["cards"]) == 8


def test_full_board_and_team_replacement_persist_and_validate_atomically(client) -> None:
    sign_in(client)
    client.get("/api/board")
    replacement = {
        "columns": [{"id": "todo", "title": "To do"}],
        "cards": [{"id": "card-x", "columnId": "todo", "title": "Persist me", "details": "", "labels": ["test"], "checklist": [], "assigneeIds": ["reza-farahani"]}],
    }
    response = client.put("/api/board", json=replacement)
    assert response.status_code == 200
    assert response.json() == replacement

    invalid = {"columns": [{"id": "todo", "title": "To do"}], "cards": [
        {"id": "bad", "columnId": "missing", "title": "Invalid", "details": ""},
    ]}
    assert client.put("/api/board", json=invalid).status_code == 422
    assert client.get("/api/board").json() == replacement

    directory = client.get("/api/board/team-directory").json()
    directory["members"] = [member for member in directory["members"] if member["id"] != "reza-farahani"]
    directory["teams"] = [
        {**team, "memberIds": [member_id for member_id in team["memberIds"] if member_id != "reza-farahani"]}
        for team in directory["teams"]
    ]
    saved_directory = client.put("/api/board/team-directory", json=directory)
    assert saved_directory.status_code == 200
    assert saved_directory.json() == directory
    cleaned_board = client.get("/api/board").json()
    assert cleaned_board["cards"][0]["assigneeIds"] == []
