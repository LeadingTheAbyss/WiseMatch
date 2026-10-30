import time

import jwt
from fastapi import Header, HTTPException

from .config import settings
from .store import USERS

ALGO = "HS256"
TTL = 60 * 60 * 24 * 30


def make_token(user_id: int) -> str:
    return jwt.encode({"sub": str(user_id), "exp": int(time.time()) + TTL}, settings.jwt_secret, algorithm=ALGO)


def current_user(authorization: str = Header(default="")) -> dict:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(authorization[7:], settings.jwt_secret, algorithms=[ALGO])
        uid = int(payload["sub"])
    except Exception:
        raise HTTPException(401, "Invalid token")
    me = USERS.get(uid)
    if not me:
        raise HTTPException(401, "Unknown user")
    return me
