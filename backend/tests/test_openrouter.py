from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app import openrouter
from app.main import app


class FakeResponse:
    def __init__(self, payload: Any = None, status_code: int = 200) -> None:
        self.payload = payload
        self.status_code = status_code
        self.request = httpx.Request("POST", openrouter.OPENROUTER_CHAT_COMPLETIONS_URL)

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            response = httpx.Response(self.status_code, request=self.request, json={"error": {"message": "upstream-private-detail"}})
            raise httpx.HTTPStatusError("upstream-private-detail", request=self.request, response=response)

    def json(self) -> Any:
        return self.payload


class FakeAsyncClient:
    def __init__(self, response: FakeResponse | None = None, error: Exception | None = None) -> None:
        self.response = response
        self.error = error
        self.calls: list[dict[str, Any]] = []
        self.timeout: float | None = None

    def __call__(self, *, timeout: float) -> FakeAsyncClient:
        self.timeout = timeout
        return self

    async def __aenter__(self) -> FakeAsyncClient:
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def post(self, url: str, *, headers: dict[str, str], json: dict[str, Any]) -> FakeResponse:
        self.calls.append({"url": url, "headers": headers, "json": json})
        if self.error:
            raise self.error
        assert self.response is not None
        return self.response


def patch_client(monkeypatch: pytest.MonkeyPatch, client: FakeAsyncClient) -> None:
    monkeypatch.setattr(openrouter.httpx, "AsyncClient", client)


def test_openrouter_success_uses_server_key_model_and_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    fake = FakeAsyncClient(FakeResponse({"choices": [{"message": {"content": "  4  "}}]}))
    patch_client(monkeypatch, fake)

    reply = asyncio.run(openrouter.create_chat_completion([{"role": "user", "content": "2 + 2"}]))

    assert reply == "4"
    assert fake.timeout == 30.0
    assert fake.calls[0]["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert fake.calls[0]["headers"]["Authorization"] == "Bearer fake-test-key"
    assert fake.calls[0]["json"]["model"] == "openai/gpt-oss-120b"
    assert fake.calls[0]["json"]["messages"] == [{"role": "user", "content": "2 + 2"}]


def test_openrouter_timeout_is_classified_without_provider_detail(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    patch_client(monkeypatch, FakeAsyncClient(error=httpx.ReadTimeout("private-upstream-detail")))

    with pytest.raises(openrouter.OpenRouterError) as raised:
        asyncio.run(openrouter.create_chat_completion([{"role": "user", "content": "2 + 2"}]))

    assert raised.value.kind == "timeout"
    assert "private-upstream-detail" not in str(raised.value)
    assert "fake-test-key" not in str(raised.value)


def test_openrouter_network_error_is_classified(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    patch_client(monkeypatch, FakeAsyncClient(error=httpx.ConnectError("private-connection-detail")))

    with pytest.raises(openrouter.OpenRouterError) as raised:
        asyncio.run(openrouter.create_chat_completion([{"role": "user", "content": "2 + 2"}]))

    assert raised.value.kind == "request"
    assert "private-connection-detail" not in str(raised.value)
    assert "fake-test-key" not in str(raised.value)


def test_openrouter_http_error_is_sanitized(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    patch_client(monkeypatch, FakeAsyncClient(FakeResponse(status_code=429)))

    with pytest.raises(openrouter.OpenRouterError) as raised:
        asyncio.run(openrouter.create_chat_completion([{"role": "user", "content": "2 + 2"}]))

    assert raised.value.kind == "upstream"
    assert "upstream-private-detail" not in str(raised.value)
    assert "fake-test-key" not in str(raised.value)


@pytest.mark.parametrize("payload", [None, [], {}, {"choices": []}, {"choices": [{"message": {"content": None}}]}])
def test_openrouter_invalid_response_is_rejected(monkeypatch: pytest.MonkeyPatch, payload: Any) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    patch_client(monkeypatch, FakeAsyncClient(FakeResponse(payload)))

    with pytest.raises(openrouter.OpenRouterError) as raised:
        asyncio.run(openrouter.create_chat_completion([{"role": "user", "content": "2 + 2"}]))

    assert raised.value.kind == "invalid_response"


def test_missing_openrouter_key_is_reported_without_a_request(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    fake = FakeAsyncClient(FakeResponse({"choices": [{"message": {"content": "4"}}]}))
    patch_client(monkeypatch, fake)

    with pytest.raises(openrouter.OpenRouterError) as raised:
        asyncio.run(openrouter.create_chat_completion([{"role": "user", "content": "2 + 2"}]))

    assert raised.value.kind == "not_configured"
    assert fake.calls == []


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("KANBAN_DATA_DIR", str(tmp_path))
    with TestClient(app) as test_client:
        yield test_client


def sign_in(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200


def test_openrouter_test_endpoint_is_development_only(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KANBAN_ENV", "production")
    sign_in(client)

    response = client.post("/api/ai/test")

    assert response.status_code == 404
    assert response.json() == {"detail": "Not found"}


def test_openrouter_test_endpoint_requires_key_without_disclosing_it(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KANBAN_ENV", "development")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    sign_in(client)

    response = client.post("/api/ai/test")

    assert response.status_code == 503
    assert "OPENROUTER_API_KEY" in response.json()["detail"]
    assert "fake-test-key" not in response.text


def test_openrouter_test_endpoint_returns_mocked_completion(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KANBAN_ENV", "development")
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    fake = FakeAsyncClient(FakeResponse({"choices": [{"message": {"content": "4"}}]}))
    patch_client(monkeypatch, fake)
    sign_in(client)

    response = client.post("/api/ai/test")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "model": "openai/gpt-oss-120b", "reply": "4"}
    assert "fake-test-key" not in response.text


def test_openrouter_test_endpoint_sanitizes_upstream_errors(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KANBAN_ENV", "development")
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    patch_client(monkeypatch, FakeAsyncClient(FakeResponse(status_code=429)))
    sign_in(client)

    response = client.post("/api/ai/test")

    assert response.status_code == 502
    assert response.json() == {"detail": "OpenRouter could not complete the request."}
    assert "fake-test-key" not in response.text
    assert "upstream-private-detail" not in response.text


def test_openrouter_test_endpoint_returns_safe_timeout(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KANBAN_ENV", "development")
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    patch_client(monkeypatch, FakeAsyncClient(error=httpx.ReadTimeout("private-upstream-detail")))
    sign_in(client)

    response = client.post("/api/ai/test")

    assert response.status_code == 504
    assert response.json() == {"detail": "OpenRouter request timed out. Try again."}
    assert "fake-test-key" not in response.text
    assert "private-upstream-detail" not in response.text


def test_openrouter_passes_structured_response_and_provider_preferences(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-test-key")
    fake = FakeAsyncClient(FakeResponse({"choices": [{"message": {"content": "{\\\"ok\\\":true}"}}]}))
    patch_client(monkeypatch, fake)
    schema = {"type": "json_schema", "json_schema": {"name": "test", "strict": True, "schema": {"type": "object"}}}
    provider = {"require_parameters": True}

    reply = asyncio.run(
        openrouter.create_chat_completion(
            [{"role": "user", "content": "Return JSON."}],
            response_format=schema,
            provider=provider,
        )
    )

    assert reply == "{\\\"ok\\\":true}"
    assert fake.calls[0]["json"]["response_format"] == schema
    assert fake.calls[0]["json"]["provider"] == provider
