import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any

from app.database import get_db
from app.models import GalleryItem, ProjectSubmission, LearningSubmission, User, AppreciationLog, ProjectTask, LearningTask, Pertemuan, Room
from app.routers.auth import get_current_user

router = APIRouter(prefix="/gallery", tags=["gallery"])

# Router GET: List all published gallery creations and classroom submissions
@router.get("")
async def list_gallery_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get all room ids the current user is associated with
    room_ids = []
    if current_user.role == "siswa":
        # Query room IDs joined by student
        room_select = select(Room.id).join(Room.members).where(User.id == current_user.id)
        room_res = await db.execute(room_select)
        room_ids = list(room_res.scalars().all())
    elif current_user.role == "guru":
        # Query room IDs created by teacher
        room_select = select(Room.id).where(Room.guru_id == current_user.id)
        room_res = await db.execute(room_select)
        room_ids = list(room_res.scalars().all())

    if not room_ids:
        return []

    # 1. Fetch Learning Submissions
    learning_query = (
        select(LearningSubmission)
        .join(LearningTask, LearningSubmission.task_id == LearningTask.id)
        .join(Pertemuan, LearningTask.pertemuan_id == Pertemuan.id)
        .where(Pertemuan.room_id.in_(room_ids))
        .options(
            selectinload(LearningSubmission.siswa),
            selectinload(LearningSubmission.task).selectinload(LearningTask.pertemuan).selectinload(Pertemuan.room)
        )
    )
    learning_res = await db.execute(learning_query)
    learning_subs = learning_res.scalars().all()

    # 2. Fetch Project Submissions
    project_query = (
        select(ProjectSubmission)
        .join(ProjectTask, ProjectSubmission.task_id == ProjectTask.id)
        .join(Pertemuan, ProjectTask.pertemuan_id == Pertemuan.id)
        .where(Pertemuan.room_id.in_(room_ids))
        .options(
            selectinload(ProjectSubmission.siswa),
            selectinload(ProjectSubmission.task).selectinload(ProjectTask.pertemuan).selectinload(Pertemuan.room),
            selectinload(ProjectSubmission.gallery_item)
        )
    )
    project_res = await db.execute(project_query)
    project_subs = project_res.scalars().all()

    # Format response nicely
    formatted = []

    # Process learning submissions
    for sub in learning_subs:
        room = sub.task.pertemuan.room if sub.task and sub.task.pertemuan else None
        
        # Get final AST safely
        ast = []
        if sub.ast_snapshots_json and len(sub.ast_snapshots_json) > 0:
            last_snap = sub.ast_snapshots_json[-1]
            if isinstance(last_snap, dict):
                ast = last_snap.get("ast", [])

        # Contextual Socratic AI Feedback
        ai_feedback = sub.ai_feedback or "AI telah memvalidasi kode visual Anda dengan sukses. Hasil rakitan blok telah terstruktur secara semantik."

        formatted.append({
            "id": sub.id,
            "type": "learning",
            "title": sub.task.judul,
            "student_id": sub.siswa_id,
            "student_name": sub.siswa.name,
            "ast": ast,
            "appreciations": 0,
            "published_at": sub.submitted_at,
            "room_id": room.id if room else None,
            "room_name": room.name if room else None,
            "ai_feedback": ai_feedback,
            "score": sub.final_score
        })

    # Process project submissions
    for sub in project_subs:
        room = sub.task.pertemuan.room if sub.task and sub.task.pertemuan else None
        
        # Contextual AI Feedback from teacher grading helper
        ai_feedback = "AI telah menganalisis kode visual Anda dengan sukses. Hasil rakitan blok telah terstruktur secara semantik."
        if sub.ai_suggestion_json:
            if isinstance(sub.ai_suggestion_json, dict):
                ai_feedback = sub.ai_suggestion_json.get("analysis", ai_feedback)

        # Get appreciation count if gallery item exists
        app_count = sub.gallery_item.appreciation_count if sub.gallery_item else 0
        gallery_item_id = sub.gallery_item.id if sub.gallery_item else None

        formatted.append({
            "id": sub.id,
            "gallery_item_id": gallery_item_id,
            "type": "project",
            "title": sub.task.judul,
            "student_id": sub.siswa_id,
            "student_name": sub.siswa.name,
            "ast": sub.final_ast_json,
            "appreciations": app_count,
            "published_at": sub.submitted_at,
            "room_id": room.id if room else None,
            "room_name": room.name if room else None,
            "ai_feedback": ai_feedback,
            "score": sub.teacher_score or 0
        })

    # Sort items by date submitted descending
    formatted.sort(key=lambda x: x["published_at"], reverse=True)
    return formatted

# Router POST: Appreciate / Like gallery creation (by submission ID)
@router.post("/{submission_id}/appreciate")
async def appreciate_gallery_item(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if this is a project submission
    result = await db.execute(
        select(ProjectSubmission)
        .where(ProjectSubmission.id == submission_id)
        .options(selectinload(ProjectSubmission.gallery_item))
    )
    sub = result.scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Karya proyek tidak ditemukan.")

    # Get or create GalleryItem
    item = sub.gallery_item
    if not item:
        item = GalleryItem(
            id=str(uuid.uuid4()),
            project_submission_id=sub.id,
            appreciation_count=0
        )
        db.add(item)
        await db.flush()

    # Check if user already appreciated this item
    log_check = await db.execute(
        select(AppreciationLog).where(
            AppreciationLog.siswa_id == current_user.id,
            AppreciationLog.gallery_item_id == item.id
        )
    )
    if log_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kamu sudah memberikan apresiasi untuk karya ini!"
        )

    # Record appreciation log
    new_log = AppreciationLog(
        id=str(uuid.uuid4()),
        siswa_id=current_user.id,
        gallery_item_id=item.id
    )
    db.add(new_log)
    item.appreciation_count += 1
    sub.is_published_to_gallery = True
    await db.flush()
    return {"submission_id": submission_id, "appreciations": item.appreciation_count}
