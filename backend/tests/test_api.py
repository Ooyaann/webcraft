import asyncio
from types import SimpleNamespace

from fastapi import HTTPException

from tests.conftest import register, auth_header


def test_rate_limiter_blocks_after_limit():
    from app.rate_limit import rate_limiter
    dep = rate_limiter(max_requests=3, window_seconds=60)
    req = SimpleNamespace(client=SimpleNamespace(host="9.9.9.9"))

    async def run():
        for _ in range(3):
            await dep(req, user=None)
        try:
            await dep(req, user=None)
            return False
        except HTTPException as exc:
            return exc.status_code == 429

    assert asyncio.run(run())


def test_ct_journey_session_idor(client):
    a = register(client, role="siswa")
    ha = auth_header(a["access_token"])
    save = client.post("/api/ct-journey/session", json={
        "task_id": "easy-1", "step": "decomposition", "answer": "jawaban", "score": 80,
    }, headers=ha)
    assert save.status_code == 201, save.text
    session_id = save.json()["session_id"]

    # Owner can read their own session.
    assert client.get(f"/api/ct-journey/session/{session_id}", headers=ha).status_code == 200

    # A different student must not (IDOR protection).
    b = register(client, role="siswa")
    hb = auth_header(b["access_token"])
    assert client.get(f"/api/ct-journey/session/{session_id}", headers=hb).status_code == 403


def test_ct_score_is_persisted_not_hardcoded(client):
    a = register(client, role="siswa")
    ha = auth_header(a["access_token"])
    save = client.post("/api/ct-journey/session", json={
        "task_id": "easy-1", "step": "decomposition", "answer": "x", "score": 42,
    }, headers=ha)
    assert save.status_code == 201
    assert save.json()["ct_pre_scores"]["decomposition"] == 42


def _room_with_pertemuan(client, guru_header):
    room = client.post("/api/rooms", json={"name": "Kelas Uji"}, headers=guru_header)
    room_id = room.json()["id"]
    pert = client.post(f"/api/rooms/{room_id}/pertemuan",
                       json={"urutan": 1, "judul": "Profil Kreatif"}, headers=guru_header)
    return room_id, pert.json()["id"]


def test_validator_rules_edit_and_ownership(client):
    g1 = register(client, role="guru")
    h1 = auth_header(g1["access_token"])
    _, pid = _room_with_pertemuan(client, h1)

    lt = client.get(f"/api/pertemuan/{pid}/learning-task", headers=h1)
    assert lt.status_code == 200
    task_id = lt.json()["id"]

    rules = {"rules": [{"type": "exists", "selector": "h1", "error_message": "Butuh h1"}]}
    ok = client.put(f"/api/pertemuan/learning-tasks/{task_id}/rules", json=rules, headers=h1)
    assert ok.status_code == 200
    assert len(ok.json()["validator_rules_json"]) == 1

    # A different teacher cannot edit rules of a room they don't own.
    g2 = register(client, role="guru")
    h2 = auth_header(g2["access_token"])
    assert client.put(f"/api/pertemuan/learning-tasks/{task_id}/rules", json=rules, headers=h2).status_code == 403


def test_gallery_accepts_pagination_params(client):
    s = register(client, role="siswa")
    hs = auth_header(s["access_token"])
    r = client.get("/api/gallery?limit=5&offset=0", headers=hs)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
