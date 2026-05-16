import os
import time
import base64
from dotenv import load_dotenv
from fastapi import Header, HTTPException, status
import jwt

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError('JWT_SECRET environment variable is required')


def safe_b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def safe_b64_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(payload: dict[str, object], expires_in: int) -> str:
    payload_copy = payload.copy()
    payload_copy["exp"] = int(time.time()) + expires_in
    return jwt.encode(payload_copy, JWT_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, object]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


def get_current_user(authorization: str | None = Header(None)) -> dict[str, object]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or malformed",
        )

    token = authorization.split(" ", 1)[1]
    return decode_access_token(token)
