import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models import CTScore, User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/ct-scores", tags=["ct-scores"])

class CTScoreCreate(BaseModel):
    decomposition: int
    abstraction: int
    pattern_recognition: int
    algorithm_design: int
    pertemuan_id: str

class CTScoreResponse(BaseModel):
    id: str
    siswa_id: str
    pertemuan_id: str
    decomposition: int
    pattern_recognition: int
    abstraction: int
    algorithm_design: int
    composite_ct_score: int
    recorded_at: datetime.datetime

    class Config:
        from_attributes = True

# Router POST: Save a student's CT score
@router.post("", response_model=CTScoreResponse, status_code=status.HTTP_201_CREATED)
async def create_ct_score(
    score_in: CTScoreCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "siswa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya siswa yang dapat menyimpan data nilai CT."
        )

    composite = int(
        (score_in.decomposition + score_in.abstraction + score_in.pattern_recognition + score_in.algorithm_design) / 4
    )

    new_score = CTScore(
        id=str(uuid.uuid4()),
        siswa_id=current_user.id,
        pertemuan_id=score_in.pertemuan_id,
        decomposition=score_in.decomposition,
        abstraction=score_in.abstraction,
        pattern_recognition=score_in.pattern_recognition,
        algorithm_design=score_in.algorithm_design,
        composite_ct_score=composite,
        recorded_at=datetime.datetime.now(datetime.timezone.utc)
    )

    db.add(new_score)
    await db.flush()
    return new_score

# Router GET: Get all CT scores for current logged-in student
@router.get("/me", response_model=List[CTScoreResponse])
async def get_my_ct_scores(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CTScore)
        .where(CTScore.siswa_id == current_user.id)
        .order_by(CTScore.recorded_at.asc())
    )
    return result.scalars().all()
