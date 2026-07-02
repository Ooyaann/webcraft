# Deployment Guide — WebCraft

Arsitektur: **Frontend → Vercel**, **Backend → Hugging Face Spaces (Docker)**.

---

## 0. Prasyarat (WAJIB sebelum publik)

- [ ] **Rotasi kunci** yang pernah bocor di repo lama:
  - `JWT_SECRET` baru: `python -c "import secrets; print(secrets.token_urlsafe(48))"`
  - `GEMINI_API_KEY` baru dari Google AI Studio.
- [ ] Pastikan `.env` **tidak** ter-commit (sudah di `.gitignore`).
- [ ] Repo lama `Ooyaann/webcraft-education` dijadikan **private** / dihapus.

---

## 1. Backend — Hugging Face Spaces (Docker)

Deploy otomatis lewat `.github/workflows/deploy.yml` (push ke `main` → GitHub Action
force-push repo ke Space `Ooyaann/webcraft-backend`). Space membangun dari
`Dockerfile` root (port **7860**).

### 1a. GitHub secret
- Di GitHub repo → Settings → Secrets and variables → Actions → tambah:
  - `HF_TOKEN` = token Hugging Face (role **write**).

### 1b. Secrets/Variables di Hugging Face Space
Space → Settings → **Variables and secrets**:

| Nama | Tipe | Nilai |
|------|------|-------|
| `JWT_SECRET` | secret | hasil rotasi (token_urlsafe) |
| `GEMINI_API_KEY` | secret | Gemini API key baru |
| `ALLOWED_ORIGINS` | variable | `https://<domain-vercel-kamu>.vercel.app` (tanpa slash akhir) |
| `DATABASE_URL` | secret | **disarankan Postgres** (lihat 1c) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | variable | `30` (opsional) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | variable | `7` (opsional) |

### 1c. Database — PENTING
- SQLite di HF Spaces bersifat **ephemeral** (hilang saat Space restart/rebuild).
  Untuk data yang persisten (akun, submission), pakai **Postgres** (mis. Supabase):
  ```
  DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME
  ```
  Driver `asyncpg` sudah ada di `requirements.txt`.
- Skema tabel dibuat otomatis saat startup (`create_all`). Untuk migrasi
  terversion, lihat `backend/MIGRATIONS.md` (`alembic upgrade head`).

### 1d. Seeding data awal (akun demo)
Aplikasi tidak auto-seed. Untuk mengisi akun demo (budi/andi) + contoh kelas:
- Jalankan `python seed.py` **sekali** terhadap `DATABASE_URL` produksi.
  > ⚠️ `seed.py` melakukan `drop_all` lebih dulu — jalankan hanya saat setup awal,
  > JANGAN pada database yang sudah berisi data asli.
- Atau daftarkan akun guru/siswa langsung lewat halaman Register.

---

## 2. Frontend — Vercel

1. Vercel → New Project → import repo GitHub ini.
2. **Root Directory**: `frontend`  (penting — bukan root repo).
3. Framework Preset: **Vite** (otomatis). Build: `npm run build`, Output: `dist`.
4. Environment Variables:
   | Nama | Nilai |
   |------|-------|
   | `VITE_API_URL` | `https://<space-kamu>.hf.space/api`  ← **harus diakhiri `/api`** |
5. Deploy. Routing SPA sudah ditangani `frontend/vercel.json`.

Setelah domain Vercel jadi, **update `ALLOWED_ORIGINS`** di HF Space agar cocok,
lalu restart Space (kalau tidak, request diblokir CORS).

---

## 3. Checklist verifikasi pasca-deploy

- [ ] Buka domain Vercel → halaman login tampil, font & ikon muncul (offline-ready).
- [ ] Login `andi@siswa.com` / `siswa123` berhasil (berarti CORS + API + DB OK).
- [ ] Network tab: request ke `https://<space>/api/...` = 200 (bukan CORS error).
- [ ] Buat/lihat kelas, kerjakan misi, cek Rekap & Penilaian guru.
- [ ] Token refresh: biarkan >30 menit atau hapus `webcraft_token`, aksi berikutnya
      auto-refresh mulus.

---

## Ringkasan variabel lingkungan

**Backend (HF Space):** `JWT_SECRET`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS`,
`DATABASE_URL`, (opsional) `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`.

**Frontend (Vercel):** `VITE_API_URL` (diakhiri `/api`).

**GitHub Actions:** `HF_TOKEN`.
