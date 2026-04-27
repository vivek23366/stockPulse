"""
Stock Pulse — Auth Module
JWT-based authentication with bcrypt password hashing.
Users are persisted to backend/users.json
"""

import json
import os
import time
from pathlib import Path
from typing import Optional

from passlib.context import CryptContext
from jose import JWTError, jwt

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY  = "stockpulse-super-secret-key-change-in-prod-2025"
ALGORITHM   = "HS256"
TOKEN_HOURS = 24 * 7           # 7-day sessions

USERS_FILE  = Path(__file__).parent / "users.json"

# ── Password hashing ──────────────────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

# ── User store (JSON file) ────────────────────────────────────────────────────
# Seed credentials (hashed lazily on first write to avoid import-time cost)
_SEED_CREDENTIALS = [
    ("demo",  "demo123",  "Demo User", "demo@stockpulse.io",  "📊"),
    ("vivek", "vivek123", "Vivek",      "vivek@stockpulse.io", "🚀"),
    ("admin", "admin123", "Admin",      "admin@stockpulse.io", "⚡"),
]

def _make_seed_users() -> list[dict]:
    return [
        {"username": u, "password": hash_password(p), "name": n, "email": e, "avatar": a}
        for u, p, n, e, a in _SEED_CREDENTIALS
    ]


def _load_users() -> list[dict]:
    if USERS_FILE.exists():
        try:
            return json.loads(USERS_FILE.read_text())
        except Exception:
            pass
    # Seed on first run
    seed = _make_seed_users()
    _save_users(seed)
    return seed


def _save_users(users: list[dict]) -> None:
    USERS_FILE.write_text(json.dumps(users, indent=2))

def get_user(username: str) -> Optional[dict]:
    return next((u for u in _load_users() if u["username"] == username.lower()), None)

def create_user(username: str, password: str, name: str, email: str, avatar: str = "👤") -> dict:
    users = _load_users()
    # Check duplicate username / email
    if any(u["username"] == username.lower() for u in users):
        raise ValueError("username_taken")
    if any(u.get("email", "").lower() == email.lower() for u in users):
        raise ValueError("email_taken")
    new_user = {
        "username": username.lower(),
        "password": hash_password(password),
        "name":     name,
        "email":    email.lower(),
        "avatar":   avatar,
    }
    users.append(new_user)
    _save_users(users)
    return new_user

# ── JWT helpers ───────────────────────────────────────────────────────────────
def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_HOURS * 3600,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[str]:
    """Returns username or None if token is invalid/expired."""
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return data.get("sub")
    except JWTError:
        return None

def authenticate(username: str, password: str) -> Optional[dict]:
    """Returns user dict (without password) if credentials match, else None."""
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, user["password"]):
        return None
    return {k: v for k, v in user.items() if k != "password"}
