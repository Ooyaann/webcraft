import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any

# ==================== AUTH SCHEMAS ====================
class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    role: str = "siswa"  # 'siswa' | 'guru' | 'admin'
    nisn_nip: Optional[str] = Field(default=None, max_length=20)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None


# ==================== ROOM SCHEMAS ====================
class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class RoomJoin(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)

class RoomResponse(BaseModel):
    id: str
    guru_id: str
    name: str
    code: str
    is_active: bool
    announcement: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class RoomUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None
    announcement: Optional[str] = Field(default=None, max_length=2000)


# ==================== PERTEMUAN SCHEMAS ====================
class PertemuanCreate(BaseModel):
    urutan: int
    judul: str = Field(..., min_length=1, max_length=200)
    cbl_engage_json: Optional[Dict[str, Any]] = None
    guiding_questions_json: Optional[List[str]] = None
    reflection_questions_json: Optional[List[str]] = None
    materi_list_json: Optional[List[Dict[str, Any]]] = None

class PertemuanResponse(BaseModel):
    id: str
    room_id: str
    urutan: int
    judul: str
    is_published: bool
    cbl_engage_json: Optional[Dict[str, Any]] = None
    guiding_questions_json: Optional[List[str]] = None
    reflection_questions_json: Optional[List[str]] = None
    materi_list_json: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

class PertemuanUpdate(BaseModel):
    judul: Optional[str] = Field(default=None, min_length=1, max_length=200)
    urutan: Optional[int] = None
    is_published: Optional[bool] = None
    cbl_engage_json: Optional[Dict[str, Any]] = None
    guiding_questions_json: Optional[List[str]] = None
    reflection_questions_json: Optional[List[str]] = None
    materi_list_json: Optional[List[Dict[str, Any]]] = None


# ==================== SUBMISSION & CT SCHEMAS ====================
class LearningSubmissionCreate(BaseModel):
    task_id: str
    ast_snapshots: List[Dict[str, Any]]
    attempt_count: int
    ct_session_id: Optional[str] = None
    reflection_answers: Optional[Dict[str, Any]] = None
    ai_feedback: Optional[str] = None
    ct_post_score: Optional[Dict[str, int]] = None

class ProjectSubmissionCreate(BaseModel):
    task_id: str
    final_ast: List[Dict[str, Any]]
    ct_session_id: Optional[str] = None


# ==================== AI ENDPOINT SCHEMAS ====================
class CTJourneyRequest(BaseModel):
    step: str  # 'decomposition' | 'abstraction' | 'pattern' | 'algorithm'
    question: str
    student_answer: str
    challenge_context: Dict[str, Any]

class CTJourneyResponse(BaseModel):
    feedback: str
    ct_score_delta: int
    next_hint: str

class TutorRequest(BaseModel):
    current_ast: List[Dict[str, Any]]
    target_rules: List[Dict[str, Any]]
    attempt_history: List[Dict[str, Any]]
    student_message: Optional[str] = None
    lesson_context: str
    conversation_history: Optional[List[Dict[str, str]]] = None

class TutorResponse(BaseModel):
    hint: str

class CTSessionRequest(BaseModel):
    attempt_history: List[Dict[str, Any]]
    ct_journey: Dict[str, Any]
    reflection: Dict[str, Any]

class CTSessionResponse(BaseModel):
    decomposition: int
    pattern_recognition: int
    abstraction: int
    algorithm_design: int
    narrative: str
    recommendations: List[str]

class ClassInsightsRequest(BaseModel):
    room_id: str
    pertemuan_id: Optional[str] = None

class SuggestScoreRequest(BaseModel):
    ast: List[Dict[str, Any]]
    rubrik: List[Dict[str, Any]]
    challenge_context: Dict[str, Any]

class SuggestScoreResponse(BaseModel):
    suggested_scores: Dict[str, int]
    analysis: str
    flags: List[str]

class CTSessionSave(BaseModel):
    session_id: Optional[str] = None
    task_id: str = "easy-1"
    step: str
    answer: str = Field(..., max_length=5000)
    # AI-evaluated (or locally computed) score for this step, 0-100.
    # When omitted, the backend falls back to a neutral default.
    score: Optional[int] = Field(default=None, ge=0, le=100)

class ValidateCodeRequest(BaseModel):
    current_html: str
    target_rules: List[Dict[str, Any]]
    lesson_title: str

class ValidateCodeResponse(BaseModel):
    is_valid: bool
    feedback: str

# ==================== CREATIVE PROJECT SCHEMAS ====================
class CreativeProjectCreate(BaseModel):
    name: str
    ast: List[Dict[str, Any]]

class CreativeProjectResponse(BaseModel):
    id: str
    siswa_id: str
    name: str
    ast_json: List[Dict[str, Any]]
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


