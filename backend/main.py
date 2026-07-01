import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.routers import auth, rooms, pertemuan, submissions, ct_journey, gallery, ai, ct_scores, creative

app = FastAPI(
    title="WebCraft API",
    description="Backend API platform untuk pembelajaran Computational Thinking dan Web Development SMP.",
    version="2.0.0"
)

# CORS Configuration for React Frontend requests
import os
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Subrouters
app.include_router(auth.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")
app.include_router(pertemuan.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(ct_journey.router, prefix="/api")
app.include_router(gallery.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(ct_scores.router, prefix="/api")
app.include_router(creative.router, prefix="/api")

# Startup database initialization
@app.on_event("startup")
async def startup_db_initialization():
    from app.database import engine, Base
    import app.models # Enforce metadata import
    
    print("Membuka koneksi database async...")
    async with engine.connect() as conn:
        # 1. Create all tables on startup inside its own transaction
        try:
            async with conn.begin():
                await conn.run_sync(Base.metadata.create_all)
            print("Database Base.metadata.create_all dipanggil.")
        except Exception as e:
            print("Gagal menjalankan create_all:", e)
            
        # 2. Alter rooms table to add announcement column
        try:
            async with conn.begin():
                await conn.execute("ALTER TABLE rooms ADD COLUMN announcement TEXT")
            print("Migrasi: Kolom 'announcement' berhasil ditambahkan ke tabel 'rooms'.")
        except Exception as e:
            print("Rooms migration skipped/already exists:", e)
            
        # 3. Alter pertemuan table to add materi_list_json column
        try:
            async with conn.begin():
                await conn.execute("ALTER TABLE pertemuan ADD COLUMN materi_list_json JSON")
            print("Migrasi: Kolom 'materi_list_json' berhasil ditambahkan ke tabel 'pertemuan'.")
        except Exception as e:
            print("Pertemuan migration skipped/already exists:", e)
            
    print("Database berhasil diinisialisasi & tabel-tabel berhasil dibuat!")

# Root route
@app.get("/")
def get_root():
    return {
        "status": "online",
        "service": "WebCraft API",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
