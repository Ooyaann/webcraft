from tests.conftest import register, auth_header, unique_email


def test_register_returns_access_and_refresh(client):
    data = register(client)
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["user"]["role"] == "siswa"


def test_login_and_me(client):
    email = unique_email()
    register(client, email=email)
    r = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers=auth_header(token))
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_short_password_rejected(client):
    r = client.post("/api/auth/register", json={
        "name": "x", "email": unique_email(), "password": "123",
        "role": "siswa", "nisn_nip": "1234567890",
    })
    assert r.status_code == 422


def test_refresh_rotates_and_revokes_old(client):
    data = register(client)
    old_refresh = data["refresh_token"]
    r = client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
    assert r.status_code == 200
    new_refresh = r.json()["refresh_token"]
    assert new_refresh != old_refresh
    # The rotated (old) refresh token must no longer work.
    assert client.post("/api/auth/refresh", json={"refresh_token": old_refresh}).status_code == 401


def test_logout_revokes_refresh(client):
    refresh = register(client)["refresh_token"]
    assert client.post("/api/auth/logout", json={"refresh_token": refresh}).status_code == 200
    assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_invalid_refresh_rejected(client):
    r = client.post("/api/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert r.status_code == 401
