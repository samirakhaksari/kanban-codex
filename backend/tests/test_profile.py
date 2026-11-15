import base64
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.database import get_database_path
from app.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("KANBAN_DATA_DIR", str(tmp_path))
    with TestClient(app) as client:
        yield client


def sign_in(client):
    assert client.post("/api/auth/login", json={"username": "user", "password": "password"}).status_code == 200


def test_profile_requires_session_and_starts_with_actual_username(client):
    assert client.get("/api/profile").status_code == 401
    assert client.put("/api/profile", json={"firstName": "A", "lastName": "B"}).status_code == 401
    sign_in(client)
    assert client.get("/api/profile").json() == {
        "id": "demo-user", "username": "user", "firstName": "", "lastName": "", "avatarDataUrl": None,
    }


def test_profile_survives_new_session_and_can_remove_photo(client):
    sign_in(client)
    avatar = "data:image/png;base64," + base64.b64encode(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=")).decode()
    saved = client.put("/api/profile", json={"firstName": "  سارا  ", "lastName": "احمدی", "avatarDataUrl": avatar})
    assert saved.status_code == 200
    assert saved.json()["firstName"] == "سارا"
    client.post("/api/auth/logout")
    sign_in(client)
    assert client.get("/api/profile").json()["avatarDataUrl"] == avatar
    assert client.put("/api/profile", json={"firstName": "سارا", "lastName": "احمدی", "avatarDataUrl": None}).status_code == 200
    assert client.get("/api/profile").json()["avatarDataUrl"] is None


@pytest.mark.parametrize("patch", [
    {"firstName": "   "}, {"lastName": "x" * 81}, {"firstName": 123},
    {"avatarDataUrl": "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="},
    {"avatarDataUrl": "data:image/png;base64,not-base64"},
    {"avatarDataUrl": "https://example.com/photo.png"}, {"id": "another-user"},
])
def test_invalid_profile_does_not_replace_saved_data(client, patch):
    sign_in(client)
    original = {"firstName": "Original", "lastName": "Person", "avatarDataUrl": None}
    assert client.put("/api/profile", json=original).status_code == 200
    assert client.put("/api/profile", json={**original, **patch}).status_code == 422
    assert client.get("/api/profile").json()["firstName"] == "Original"


def test_request_limit_and_profile_ownership(client):
    sign_in(client)
    with sqlite3.connect(get_database_path()) as db:
        db.execute("INSERT INTO users (id, username) VALUES ('other', 'other')")
        db.execute("INSERT INTO user_profiles (user_id, first_name, last_name) VALUES ('other', 'Private', 'Person')")
    assert client.put("/api/profile", content=b"x" * 750_001).status_code == 413
    assert client.put("/api/profile", json={"firstName": "Mine", "lastName": "Only", "avatarDataUrl": None}).status_code == 200
    with sqlite3.connect(get_database_path()) as db:
        assert db.execute("SELECT first_name FROM user_profiles WHERE user_id = 'other'").fetchone()[0] == "Private"
