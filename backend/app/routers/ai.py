import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user, get_current_user_optional
from app.models import User, LearningSubmission, LearningTask, Pertemuan
from app.schemas import (
    CTJourneyRequest, CTJourneyResponse, TutorRequest, TutorResponse, 
    ClassInsightsRequest, CTSessionRequest, CTSessionResponse, 
    SuggestScoreRequest, SuggestScoreResponse, ValidateCodeRequest, ValidateCodeResponse
)
from app.services import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai-assistant"])

# Router POST: Evaluate CT Journey answers
@router.post("/ct-journey", response_model=CTJourneyResponse)
async def analyze_ct_journey_step(
    request: CTJourneyRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = await ai_service.analyze_ct_step(
            step=request.step,
            question=request.question,
            student_answer=request.student_answer,
            challenge_context=request.challenge_context
        )
        return CTJourneyResponse(
            feedback=result.get("feedback", "Jawaban Anda telah direkam."),
            ct_score_delta=result.get("ct_score_delta", 80),
            next_hint=result.get("next_hint", "")
        )
    except Exception:
        logger.exception("Failed to analyze CT journey step")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Terjadi kesalahan saat memproses evaluasi AI. Silakan coba lagi."
        )

# Router POST: Socratic Tutor Hint in Workspace
@router.post("/tutor", response_model=TutorResponse)
async def get_socratic_tutor_hint(
    request: TutorRequest,
    current_user: User = Depends(get_current_user_optional)
):
    try:
        hint = await ai_service.get_socratic_hint(
            current_ast=request.current_ast,
            target_rules=request.target_rules,
            attempt_history=request.attempt_history,
            student_message=request.student_message,
            lesson_context=request.lesson_context,
            conversation_history=request.conversation_history
        )
        return TutorResponse(hint=hint)
    except Exception:
        logger.exception("Failed to get socratic tutor hint")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Terjadi kesalahan pada modul AI Tutor. Silakan coba lagi."
        )

# Router POST: Get classroom-wide error heatmap & AI advice (Guru only)
@router.post("/class-insights")
async def get_class_insights(
    request: ClassInsightsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "guru":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Endpoint ini hanya untuk akun Guru."
        )

    # Fetch all submissions for the classroom task in the specific room
    result = await db.execute(
        select(LearningSubmission)
        .join(LearningTask, LearningSubmission.task_id == LearningTask.id)
        .join(Pertemuan, LearningTask.pertemuan_id == Pertemuan.id)
        .where(Pertemuan.room_id == request.room_id)
        .options(selectinload(LearningSubmission.siswa))
    )
    submissions = result.scalars().all()

    if not submissions:
        # Graceful fallback if no submissions exist yet (100% database-backed, no dummy data)
        return {
            "ct_class_average": 0,
            "error_heatmap": [],
            "struggling_students": [],
            "recommendations": "Belum ada data pengerjaan dari siswa untuk membuat analisis rekomendasi belajar kelas."
        }

    class_data = []
    total_score = 0
    error_counts = {}
    struggling = []

    for sub in submissions:
        total_score += sub.final_score
        student_name = sub.siswa.name if sub.siswa else "Siswa"
        
        snapshots = sub.ast_snapshots_json or []
        for snap in snapshots:
            errors = snap.get("errors", [])
            for err in errors:
                err_msg = err.get("message", "Error")
                short_name = "Elemen di luar body" if "body" in err_msg.lower() else \
                             "Salah nesting tag" if "nesting" in err_msg.lower() or "di dalam" in err_msg.lower() else \
                             "CSS style terputus" if "style" in err_msg.lower() else \
                             "Teks judul belum diisi" if "judul" in err_msg.lower() else "Error Validasi"
                error_counts[short_name] = error_counts.get(short_name, 0) + 1
        
        if sub.attempt_count > 5:
            issue = "Banyak melakukan trial-error pada struktur HTML/CSS"
            if snapshots:
                last_errors = snapshots[-1].get("errors", [])
                if last_errors:
                    issue = last_errors[0].get("message", issue)
            struggling.append({
                "name": student_name,
                "error_count": sub.attempt_count,
                "issue": issue
            })
            
        class_data.append({
            "student_name": student_name,
            "attempts": sub.attempt_count,
            "score": sub.final_score
        })

    class_avg = round(total_score / len(submissions), 1)

    error_heatmap = []
    for err_name, count in error_counts.items():
        percentage = min(100, int((count / len(submissions)) * 100))
        error_heatmap.append({"name": err_name, "percentage": percentage})
        
    error_heatmap.sort(key=lambda x: x["percentage"], reverse=True)
    if not error_heatmap:
        error_heatmap = [{"name": "Semua kriteria terpenuhi", "percentage": 0}]

    ai_insights = await ai_service.generate_teacher_insights(class_data)
    recommendations = ai_insights.get("recommendations", "Semua berjalan lancar. Teruskan bimbingan individual bagi siswa yang membutuhkan.")

    return {
        "ct_class_average": class_avg,
        "error_heatmap": error_heatmap,
        "struggling_students": struggling[:3],
        "recommendations": recommendations
    }

@router.post("/analyze-ct", response_model=CTSessionResponse)
async def analyze_ct_session(
    request: CTSessionRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = await ai_service.analyze_ct_session(
            attempt_history=request.attempt_history,
            ct_journey=request.ct_journey,
            reflection=request.reflection
        )
        return CTSessionResponse(**result)
    except Exception:
        logger.exception("Failed to analyze CT session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Terjadi kesalahan saat menganalisis sesi CT. Silakan coba lagi."
        )

@router.post("/suggest-score", response_model=SuggestScoreResponse)
async def suggest_project_score(
    request: SuggestScoreRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = await ai_service.suggest_project_score(
            ast=request.ast,
            rubrik=request.rubrik,
            challenge_context=request.challenge_context
        )
        return SuggestScoreResponse(**result)
    except Exception:
        logger.exception("Failed to suggest project score")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Terjadi kesalahan saat menghitung saran penilaian proyek. Silakan coba lagi."
        )

@router.post("/validate-code", response_model=ValidateCodeResponse)
async def validate_code(
    request: ValidateCodeRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = await ai_service.validate_student_code(
            current_html=request.current_html,
            target_rules=request.target_rules,
            lesson_title=request.lesson_title
        )
        return ValidateCodeResponse(
            is_valid=result.get("is_valid", False),
            feedback=result.get("feedback", "")
        )
    except Exception:
        logger.exception("Failed to validate student code")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Terjadi kesalahan saat melakukan validasi kode AI. Silakan coba lagi."
        )

