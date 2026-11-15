import os
import secrets
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware

from app.auth import AuthenticatedAPIMiddleware, DEMO_USERNAME, valid_demo_credentials
from app.ai import router as ai_router
from app.board import router as board_router
from app.profile import router as profile_router
from app.config import STATIC_DIR
from app.database import initialize_database


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


app = FastAPI(title="Kanban Codex API", version="0.1.0", lifespan=lifespan)

# Register auth before sessions; Starlette applies middleware in reverse order,
# so the session cookie is decoded before API requests are checked.
app.add_middleware(AuthenticatedAPIMiddleware)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("KANBAN_SESSION_SECRET") or secrets.token_urlsafe(32),
    session_cookie="kanban_session",
    max_age=60 * 60 * 24 * 7,
    same_site="lax",
    https_only=False,
)


class LoginCredentials(BaseModel):
    username: str
    password: str


@app.get("/api/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/auth/session", tags=["authentication"])
def get_session(request: Request) -> dict[str, str | bool | None]:
    username = request.session.get("username")
    authenticated = username == DEMO_USERNAME
    return {
        "authenticated": authenticated,
        "username": DEMO_USERNAME if authenticated else None,
    }


@app.post("/api/auth/login", tags=["authentication"])
def login(credentials: LoginCredentials, request: Request) -> dict[str, str | bool]:
    if not valid_demo_credentials(credentials.username, credentials.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    request.session.clear()
    request.session["username"] = DEMO_USERNAME
    return {"authenticated": True, "username": DEMO_USERNAME}


@app.post("/api/auth/logout", tags=["authentication"])
def logout(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"authenticated": False}


app.include_router(board_router)
app.include_router(profile_router)
app.include_router(ai_router)
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="frontend")

