import hmac
from typing import Any

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

DEMO_USERNAME = "user"
DEMO_PASSWORD = "password"
PUBLIC_API_PATHS = {
    "/api/health",
    "/api/auth/login",
    "/api/auth/session",
    "/api/auth/logout",
}


def valid_demo_credentials(username: str, password: str) -> bool:
    return hmac.compare_digest(username.encode("utf-8"), DEMO_USERNAME.encode("utf-8")) and hmac.compare_digest(
        password.encode("utf-8"), DEMO_PASSWORD.encode("utf-8")
    )


class AuthenticatedAPIMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            path = scope.get("path", "")
            is_api = path.startswith("/api/")
            is_public = path in PUBLIC_API_PATHS
            session: dict[str, Any] = scope.get("session", {})

            if is_api and not is_public and session.get("username") != DEMO_USERNAME:
                response = JSONResponse(
                    status_code=401,
                    content={"detail": "Authentication required"},
                )
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)