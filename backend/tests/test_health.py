from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_returns_ok() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_serves_static_page() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "<title>Kanban Codex</title>" in response.text