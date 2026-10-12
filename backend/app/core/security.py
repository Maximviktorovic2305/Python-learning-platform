import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hasher.verify(password, hashed)


def access_token(user_id: UUID, session_id: UUID) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {"sub": str(user_id), "sid": str(session_id), "iat": now, "exp": now + timedelta(minutes=15),
         "iss": "python-lab", "aud": "python-lab-web", "type": "access"},
        get_settings().jwt_secret, algorithm="HS256",
    )


def decode_access(token: str) -> tuple[UUID, UUID]:
    claims = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"],
                        issuer="python-lab", audience="python-lab-web",
                        options={"require": ["sub", "sid", "iat", "exp", "type"]})
    if claims["type"] != "access":
        raise ValueError("Invalid token type")
    return UUID(claims["sub"]), UUID(claims["sid"])


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
