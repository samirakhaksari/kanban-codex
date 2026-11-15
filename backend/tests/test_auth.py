from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("KANBAN_DATA_DIR", str(tmp_path))
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.parametrize(
    ("username", "password"),
    [
        ("wrong", "password"),
        ("user", "wrong"),
    ],
)
def test_invalid_credentials_do_not_create_a_session(client, username, password) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password"
    assert client.get("/api/auth/session").json() == {
        "authenticated": False,
        "username": None,
    }


def test_valid_login_creates_a_signed_http_only_session(client) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
    )

    assert response.status_code == 200
    assert response.json() == {"authenticated": True, "username": "user"}
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=lax" in response.headers["set-cookie"].lower()
    assert client.get("/api/auth/session").json() == {
        "authenticated": True,
        "username": "user",
    }


def test_private_api_requires_a_valid_session(client) -> None:
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/board").status_code == 401

    client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
    )

    assert client.get("/api/board").status_code == 200


def test_logout_clears_the_session_and_relocks_private_api(client) -> None:
    client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
    )

    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"authenticated": False}
    assert client.get("/api/auth/session").json() == {
        "authenticated": False,
        "username": None,
    }
    assert client.get("/api/board").status_code == 401

