from __future__ import annotations

import base64
import binascii
import sqlite3
from contextlib import closing
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.database import connect_database

router = APIRouter(prefix="/api/profile", tags=["profile"])
MAX_BODY_BYTES = 750_000


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    firstName: str = Field(max_length=80)
    lastName: str = Field(max_length=80)
    avatarDataUrl: str | None = Field(default=None, max_length=700_000)

    @field_validator("firstName", "lastName")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Name cannot be empty")
        return value

    @field_validator("avatarDataUrl")
    @classmethod
    def validate_avatar(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            header, encoded = value.split(",", 1)
            raw = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error) as error:
            raise ValueError("Invalid image data") from error
        valid = (
            header == "data:image/png;base64" and raw.startswith(b"\x89PNG\r\n\x1a\n")
            or header == "data:image/jpeg;base64" and raw.startswith(b"\xff\xd8\xff")
            or header == "data:image/webp;base64" and raw.startswith(b"RIFF") and raw[8:12] == b"WEBP"
        )
        if not valid or len(raw) > 512_000:
            raise ValueError("Use a PNG, JPEG or WebP image under 512 KB")
        return value


def current_user(request: Request, connection: sqlite3.Connection) -> sqlite3.Row:
    user = connection.execute("SELECT id, username FROM users WHERE username = ?", (request.session.get("username"),)).fetchone()
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def read_profile(connection: sqlite3.Connection, user: sqlite3.Row) -> dict[str, str | None]:
    profile = connection.execute("SELECT first_name, last_name, avatar_data_url FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
    return {
        "id": user["id"], "username": user["username"],
        "firstName": profile["first_name"] if profile else "",
        "lastName": profile["last_name"] if profile else "",
        "avatarDataUrl": profile["avatar_data_url"] if profile else None,
    }


@router.get("")
def get_profile(request: Request) -> dict[str, str | None]:
    with closing(connect_database()) as connection:
        return read_profile(connection, current_user(request, connection))


async def parse_profile_body(request: Request) -> ProfileUpdate:
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_BODY_BYTES:
            raise HTTPException(status_code=413, detail="Profile image is too large")
        body.extend(chunk)
    try:
        return ProfileUpdate.model_validate_json(bytes(body))
    except ValidationError as error:
        # Validation details may contain the uploaded image; do not echo or log it.
        raise HTTPException(status_code=422, detail="Invalid profile information") from error


@router.put("")
def update_profile(request: Request, values: Annotated[ProfileUpdate, Depends(parse_profile_body)]) -> dict[str, str | None]:
    with closing(connect_database()) as connection:
        user = current_user(request, connection)
        with connection:
            connection.execute(
                """INSERT INTO user_profiles (user_id, first_name, last_name, avatar_data_url)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(user_id) DO UPDATE SET
                     first_name = excluded.first_name, last_name = excluded.last_name,
                     avatar_data_url = excluded.avatar_data_url""",
                (user["id"], values.firstName, values.lastName, values.avatarDataUrl),
            )
        return read_profile(connection, user)
