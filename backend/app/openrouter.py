from __future__ import annotations

import os
from typing import Any, Literal

import httpx

from app.config import (
    OPENROUTER_CHAT_COMPLETIONS_URL,
    OPENROUTER_MODEL,
    OPENROUTER_TIMEOUT_SECONDS,
)

OpenRouterFailureKind = Literal["not_configured", "timeout", "request", "upstream", "invalid_response"]


class OpenRouterError(Exception):
    def __init__(self, kind: OpenRouterFailureKind) -> None:
        super().__init__(kind)
        self.kind = kind


def is_development_environment() -> bool:
    return os.environ.get("KANBAN_ENV", "production").strip().lower() == "development"


async def create_chat_completion(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 64,
    response_format: dict[str, Any] | None = None,
    provider: dict[str, Any] | None = None,
) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise OpenRouterError("not_configured")

    body: dict[str, Any] = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0,
    }
    if response_format is not None:
        body["response_format"] = response_format
    if provider is not None:
        body["provider"] = provider

    try:
        async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT_SECONDS) as client:
            response = await client.post(
                OPENROUTER_CHAT_COMPLETIONS_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.TimeoutException:
        raise OpenRouterError("timeout") from None
    except httpx.HTTPStatusError:
        raise OpenRouterError("upstream") from None
    except httpx.RequestError:
        raise OpenRouterError("request") from None
    except (ValueError, TypeError):
        raise OpenRouterError("invalid_response") from None

    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise OpenRouterError("invalid_response") from None
    if not isinstance(content, str) or not content.strip():
        raise OpenRouterError("invalid_response")
    return content.strip()
