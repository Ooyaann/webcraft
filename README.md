---
title: WebCraft Backend
emoji: 🧩
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# WebCraft

Platform pembelajaran web interaktif berbasis **Challenge-Based Learning (CBL)** dan
**Computational Thinking (CT)** untuk siswa SMP. Siswa merakit halaman web secara
visual (blok → AST) dengan pendampingan AI, sementara guru mengelola kelas,
pertemuan, aturan validasi misi, konten CT Journey, dan penilaian.

> Catatan: frontmatter YAML di atas dipakai Hugging Face Spaces (deploy backend
> via Docker). GitHub akan menampilkannya sebagai tabel kecil — aman diabaikan.

## Arsitektur

- **Frontend** — React + Vite (folder `frontend/`). Di-deploy ke **Vercel**.
- **Backend** — FastAPI + SQLAlchemy async (folder `backend/`). Di-deploy ke
  **Hugging Face Spaces** (Docker, port 7860) via `.github/workflows/deploy.yml`.

## Menjalankan secara lokal

Backend:
```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # (Windows) / source .venv/bin/activate (Unix)
pip install -r requirements.txt
cp .env.example .env   # lalu isi JWT_SECRET & GEMINI_API_KEY
python seed.py         # data awal: 1 guru (budi) + 1 siswa (andi)
uvicorn main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev            # Vite proxy /api -> http://localhost:8000
```

Akun demo: guru `budi@guru.com` / `guru123`, siswa `andi@siswa.com` / `siswa123`.

## Deploy

Lihat [DEPLOYMENT.md](DEPLOYMENT.md) untuk langkah lengkap (Vercel + Hugging Face),
variabel lingkungan, dan checklist.
