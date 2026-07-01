"""Shared pytest fixtures.

Uses a throwaway SQLite database and a fixed JWT secret so tests never touch
the real dev database or require a configured environment.
"""
import os
import uuid

# Configure the environment BEFORE importing the app (engine is built at import).
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./_pytest_webcraft.db"

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DB_FILE = os.path.join(_BACKEND_DIR, "_pytest_webcraft.db")
if os.path.exists(_DB_FILE):
    os.remove(_DB_FILE)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(main.app) as c:
        yield c


def unique_email(prefix="user"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"


def register(client, role="siswa", password="password123", email=None):
    """Register a user and return the full response JSON (access + refresh + user)."""
    email = email or unique_email(role)
    nisn = "1234567890" if role == "siswa" else "1" * 18
    resp = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": email,
        "password": password,
        "role": role,
        "nisn_nip": nisn,
    })
    assert resp.status_code == 200, resp.text
    return resp.json()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}
