import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any

from app.database import get_db
from app.models import Room, Pertemuan, LearningTask, ProjectTask, User
from app.schemas import PertemuanCreate, PertemuanResponse, PertemuanUpdate
from app.routers.auth import get_current_user

router = APIRouter(tags=["pertemuan"])

# Router POST: Create Pertemuan (Guru only)
@router.post("/rooms/{room_id}/pertemuan", response_model=PertemuanResponse)
async def create_pertemuan(
    room_id: str, 
    pert_in: PertemuanCreate, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # Check room ownership
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kelas tidak ditemukan.")
    
    if room.guru_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pembuat kelas yang diizinkan menambahkan pertemuan."
        )

    new_pert = Pertemuan(
        id=str(uuid.uuid4()),
        room_id=room_id,
        urutan=pert_in.urutan,
        judul=pert_in.judul,
        is_published=True,
        cbl_engage_json=pert_in.cbl_engage_json,
        guiding_questions_json=pert_in.guiding_questions_json,
        reflection_questions_json=pert_in.reflection_questions_json,
        materi_list_json=pert_in.materi_list_json or []
    )
    db.add(new_pert)
    await db.flush()

    # Seeding dynamic tasks for the newly created meeting
    rules = [
        { "type": "exists", "selector": "body", "error_message": "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
        { "type": "exists", "selector": "h1", "error_message": "Misi belum selesai: Kamu belum menambahkan judul utama <h1>!" }
    ]
    studi_kasus = f"Buatlah halaman web edukatif tentang {pert_in.judul} menggunakan pemikiran komputasional."
    
    judul_lower = pert_in.judul.lower()
    if "profil" in judul_lower or "kartu" in judul_lower:
        rules = [
            { "type": "exists", "selector": "body", "error_message": "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
            { "type": "exists", "selector": "h1", "error_message": "Misi belum selesai: Kamu belum menambahkan judul utama <h1>!" },
            { "type": "child_of", "parent": "body", "child": "h1", "error_message": "Misi belum selesai: Judul <h1> harus berada di dalam wadah <body>!" },
            { "type": "exists", "selector": "p", "error_message": "Misi belum selesai: Kamu belum menambahkan paragraf penjelasan <p>!" },
            { "type": "child_of", "parent": "body", "child": "p", "error_message": "Misi belum selesai: Paragraf <p> harus berada di dalam wadah <body>!" }
        ]
        studi_kasus = "Buatlah halaman web kartu profil pribadi kreatif lengkap dengan judul profil <h1>, paragraf perkenalan diri <p> di dalam wadah <body>."
    elif "musik" in judul_lower or "galeri" in judul_lower:
        rules = [
            { "type": "exists", "selector": "body", "error_message": "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
            { "type": "exists", "selector": "div", "error_message": "Misi belum selesai: Kamu belum membuat kotak grup <div>!" },
            { "type": "child_of", "parent": "body", "child": "div", "error_message": "Misi belum selesai: Kotak grup <div> harus berada di dalam <body>!" },
            { "type": "exists", "selector": "h2", "error_message": "Misi belum selesai: Kamu belum menambahkan judul sedang <h2>!" },
            { "type": "child_of", "parent": "div", "child": "h2", "error_message": "Misi belum selesai: Judul sedang <h2> harus berada di dalam kotak grup <div>!" }
        ]
        studi_kasus = "Buatlah halaman web galeri musik favorit. Gunakan tag div sebagai pembungkus utama informasi playlist, dengan judul sedang h2 tentang musik kesukaanmu di dalamnya."
    elif "proyek" in judul_lower or "portofolio" in judul_lower:
        rules = [
            { "type": "exists", "selector": "body", "error_message": "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
            { "type": "exists", "selector": "h1", "error_message": "Misi belum selesai: Kamu belum menambahkan judul utama <h1>!" },
            { "type": "exists", "selector": "style", "error_message": "Misi belum selesai: Kamu belum menambahkan gaya halaman <style>!" },
            { "type": "exists", "selector": "ul", "error_message": "Misi belum selesai: Kamu belum membuat daftar <ul>!" },
            { "type": "exists", "selector": "li", "error_message": "Misi belum selesai: Kamu belum menambahkan item daftar <li>!" }
        ]
        studi_kasus = "Buatlah proyek portofolio impian kreatif. Hiasi halaman dengan CSS style yang mendefinisikan warna latar belakang solid kontras dan buat daftar keterampilanmu menggunakan tag <ul> dan <li>."

    new_learning_task = LearningTask(
        id=str(uuid.uuid4()),
        pertemuan_id=new_pert.id,
        judul=pert_in.judul,
        validator_rules_json=rules,
        max_attempts_before_ai_hint=4
    )
    db.add(new_learning_task)

    new_project_task = ProjectTask(
        id=str(uuid.uuid4()),
        pertemuan_id=new_pert.id,
        judul=f"Proyek: {pert_in.judul}",
        studi_kasus=studi_kasus,
        rubrik_json=[
            { "name": "Kelengkapan elemen", "bobot": 30 },
            { "name": "Kebenaran semantik", "bobot": 35 },
            { "name": "Kreativitas desain", "bobot": 35 }
        ]
    )
    db.add(new_project_task)
    
    await db.commit()
    return new_pert

# Router GET: List all Pertemuan in a room
@router.get("/rooms/{room_id}/pertemuan", response_model=List[PertemuanResponse])
async def list_pertemuan(
    room_id: str, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    query = select(Pertemuan).where(Pertemuan.room_id == room_id)
    if current_user.role == "siswa":
        query = query.where(Pertemuan.is_published == True)
        
    result = await db.execute(query.order_by(Pertemuan.urutan.asc()))
    return result.scalars().all()

# Router GET: Get all Tasks inside a Pertemuan (Learning Tasks + Project Tasks)
@router.get("/pertemuan/{pertemuan_id}/tasks")
async def get_pertemuan_tasks(
    pertemuan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch learning tasks
    learning_result = await db.execute(
        select(LearningTask).where(LearningTask.pertemuan_id == pertemuan_id)
    )
    learning_tasks = learning_result.scalars().all()

    # Fetch project tasks
    project_result = await db.execute(
        select(ProjectTask).where(ProjectTask.pertemuan_id == pertemuan_id)
    )
    project_tasks = project_result.scalars().all()

    return {
        "learning_tasks": learning_tasks,
        "project_tasks": project_tasks
    }

# Router PUT: Update Pertemuan (Guru only)
@router.put("/pertemuan/{pertemuan_id}", response_model=PertemuanResponse)
async def update_pertemuan(
    pertemuan_id: str,
    pert_update: PertemuanUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Pertemuan)
        .options(selectinload(Pertemuan.room))
        .where(Pertemuan.id == pertemuan_id)
    )
    pert = result.scalars().first()
    if not pert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pertemuan tidak ditemukan.")
        
    if pert.room.guru_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Hanya guru pembuat kelas yang dapat mengedit pertemuan."
        )

    # Update fields
    if pert_update.judul is not None:
        pert.judul = pert_update.judul
    if pert_update.urutan is not None:
        pert.urutan = pert_update.urutan
    if pert_update.is_published is not None:
        pert.is_published = pert_update.is_published
    if pert_update.cbl_engage_json is not None:
        pert.cbl_engage_json = pert_update.cbl_engage_json
    if pert_update.guiding_questions_json is not None:
        pert.guiding_questions_json = pert_update.guiding_questions_json
    if pert_update.reflection_questions_json is not None:
        pert.reflection_questions_json = pert_update.reflection_questions_json
    if pert_update.materi_list_json is not None:
        pert.materi_list_json = pert_update.materi_list_json

    await db.flush()
    await db.commit()
    return pert

# Router DELETE: Delete Pertemuan (Guru only)
@router.delete("/pertemuan/{pertemuan_id}")
async def delete_pertemuan(
    pertemuan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Pertemuan)
        .options(selectinload(Pertemuan.room))
        .where(Pertemuan.id == pertemuan_id)
    )
    pert = result.scalars().first()
    if not pert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pertemuan tidak ditemukan.")
        
    if pert.room.guru_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Hanya guru pembuat kelas yang dapat menghapus pertemuan."
        )

    await db.delete(pert)
    await db.commit()
    return {"message": "Pertemuan berhasil dihapus.", "id": pertemuan_id}

# Router GET: Fetch specific task details by task ID (LearningTask or ProjectTask)
@router.get("/pertemuan/tasks/{task_id}")
async def get_task_details(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Try finding in LearningTask
    lt_res = await db.execute(select(LearningTask).where(LearningTask.id == task_id))
    lt = lt_res.scalars().first()
    if lt:
        # Pull the real challenge/mission text from the parent pertemuan (CBL Engage)
        misi = None
        pert_res = await db.execute(select(Pertemuan).where(Pertemuan.id == lt.pertemuan_id))
        pert = pert_res.scalars().first()
        if pert and pert.cbl_engage_json:
            misi = pert.cbl_engage_json.get("challenge")
        return {
            "id": lt.id,
            "judul": lt.judul,
            "type": "learning",
            "pertemuan_id": lt.pertemuan_id,
            "misi": misi,
            "validator_rules_json": lt.validator_rules_json,
            "max_attempts_before_ai_hint": lt.max_attempts_before_ai_hint
        }

    # Try finding in ProjectTask
    pt_res = await db.execute(select(ProjectTask).where(ProjectTask.id == task_id))
    pt = pt_res.scalars().first()
    if pt:
        misi = pt.studi_kasus
        pert_res = await db.execute(select(Pertemuan).where(Pertemuan.id == pt.pertemuan_id))
        pert = pert_res.scalars().first()
        if pert and pert.cbl_engage_json and pert.cbl_engage_json.get("challenge"):
            misi = pert.cbl_engage_json.get("challenge")
        return {
            "id": pt.id,
            "judul": pt.judul,
            "type": "project",
            "pertemuan_id": pt.pertemuan_id,
            "studi_kasus": pt.studi_kasus,
            "misi": misi,
            "rubrik_json": pt.rubrik_json
        }
        
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan.")

