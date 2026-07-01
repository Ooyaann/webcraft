import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any

from app.database import get_db
from app.models import CTJourneySession, User, LearningTask, ProjectTask
from app.schemas import CTJourneyRequest, CTSessionSave
from app.routers.auth import get_current_user

router = APIRouter(prefix="/ct-journey", tags=["ct-journey"])

@router.post("/session", status_code=status.HTTP_201_CREATED)
async def save_ct_journey_step(
    payload: CTSessionSave,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "siswa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya akun Siswa yang dapat menyimpan data CT Journey."
        )

    session_id = payload.session_id
    task_id = payload.task_id
    step = payload.step
    answer = payload.answer

    if step not in ["decomposition", "abstraction", "pattern", "algorithm"]:
        raise HTTPException(status_code=400, detail="Langkah CT (step) tidak valid.")

    session = None
    if session_id:
        result = await db.execute(select(CTJourneySession).where(CTJourneySession.id == session_id))
        session = result.scalars().first()

    if not session:
        challenge_title = "Misi Coding Web"
        lt_res = await db.execute(select(LearningTask).where(LearningTask.id == task_id))
        lt = lt_res.scalars().first()
        if lt:
            challenge_title = lt.judul
        else:
            pt_res = await db.execute(select(ProjectTask).where(ProjectTask.id == task_id))
            pt = pt_res.scalars().first()
            if pt:
                challenge_title = pt.judul

        session = CTJourneySession(
            id=str(uuid.uuid4()),
            siswa_id=current_user.id,
            task_id=task_id,
            challenge_context={"title": challenge_title},
            decomposition_answer_json=[],
            abstraction_answer_json=[],
            pattern_answer_json=[],
            algorithm_answer_json=[],
            ct_pre_score_json={"decomposition": 0, "abstraction": 0, "pattern_recognition": 0, "algorithm_design": 0}
        )
        db.add(session)
    else:
        if session.is_locked:
            raise HTTPException(status_code=400, detail="Sesi CT ini sudah dikunci dan tidak dapat diubah lagi.")

    # Update step answer
    scores = session.ct_pre_score_json or {}
    if step == "decomposition":
        session.decomposition_answer_json = answer
        scores["decomposition"] = 85
    elif step == "abstraction":
        session.abstraction_answer_json = answer
        scores["abstraction"] = 88
    elif step == "pattern":
        session.pattern_answer_json = answer
        scores["pattern_recognition"] = 80
    elif step == "algorithm":
        session.algorithm_answer_json = answer
        scores["algorithm_design"] = 85

    session.ct_pre_score_json = scores
    session.completed_at = datetime.datetime.now(datetime.timezone.utc)
    if step == "algorithm":
        session.is_locked = True
    
    await db.flush()
    return {
        "session_id": session.id,
        "step_completed": step,
        "ct_pre_scores": scores
    }

# Router GET: Get CT Journey Session by ID
@router.get("/session/{session_id}")
async def get_journey_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(CTJourneySession).where(CTJourneySession.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi CT Journey tidak ditemukan.")
    # Ownership check (prevents IDOR): a siswa may only read their own session.
    if current_user.role == "siswa" and session.siswa_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki akses ke sesi CT Journey ini."
        )
    return session
