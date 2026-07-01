import datetime
def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc)
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Table, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

# Association Table: Room Members (Siswa joining a classroom Room)
room_members = Table(
    "room_members",
    Base.metadata,
    Column("room_id", String, ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True),
    Column("siswa_id", String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("joined_at", DateTime, default=get_utc_now)
)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="siswa")  # 'siswa', 'guru', 'admin'
    nisn_nip = Column(String, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    # Relationships
    rooms_created = relationship("Room", back_populates="creator")
    rooms_joined = relationship("Room", secondary=room_members, back_populates="members")
    ct_scores = relationship("CTScore", back_populates="siswa")
    learning_submissions = relationship("LearningSubmission", back_populates="siswa")
    project_submissions = relationship("ProjectSubmission", back_populates="siswa")
    creative_projects = relationship("CreativeProject", back_populates="siswa", cascade="all, delete-orphan")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, index=True)
    guru_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)  # 6-digit code
    is_active = Column(Boolean, default=True)
    announcement = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    # Relationships
    creator = relationship("User", back_populates="rooms_created")
    members = relationship("User", secondary=room_members, back_populates="rooms_joined")
    pertemuan = relationship("Pertemuan", back_populates="room", cascade="all, delete-orphan")

class Pertemuan(Base):
    __tablename__ = "pertemuan"

    id = Column(String, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    urutan = Column(Integer, nullable=False)
    judul = Column(String, nullable=False)
    is_published = Column(Boolean, default=True)
    
    # CBL Contexts JSON: {big_idea, essential_question, challenge, media_url}
    cbl_engage_json = Column(JSON, nullable=True)
    guiding_questions_json = Column(JSON, nullable=True)      # List of strings
    reflection_questions_json = Column(JSON, nullable=True)    # List of strings
    materi_list_json = Column(JSON, nullable=True, default=[]) # List of dicts: [{title, type, content, url}]

    # Relationships
    room = relationship("Room", back_populates="pertemuan")
    learning_tasks = relationship("LearningTask", back_populates="pertemuan", cascade="all, delete-orphan")
    project_tasks = relationship("ProjectTask", back_populates="pertemuan", cascade="all, delete-orphan")
    ct_scores = relationship("CTScore", back_populates="pertemuan", cascade="all, delete-orphan")

class LearningTask(Base):
    __tablename__ = "learning_tasks"

    id = Column(String, primary_key=True, index=True)
    pertemuan_id = Column(String, ForeignKey("pertemuan.id", ondelete="CASCADE"), nullable=False)
    judul = Column(String, nullable=False)
    
    # Validator Rules JSON: [{type, selector, parent, child, value, min, max, error_message}]
    validator_rules_json = Column(JSON, nullable=False)
    max_attempts_before_ai_hint = Column(Integer, default=4)

    # Relationships
    pertemuan = relationship("Pertemuan", back_populates="learning_tasks")
    submissions = relationship("LearningSubmission", back_populates="task", cascade="all, delete-orphan")

class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id = Column(String, primary_key=True, index=True)
    pertemuan_id = Column(String, ForeignKey("pertemuan.id", ondelete="CASCADE"), nullable=False)
    judul = Column(String, nullable=False)
    studi_kasus = Column(Text, nullable=False)
    deadline = Column(DateTime, nullable=True)
    
    # Rubric Rubrik JSON: [{kriteria, bobot, deskripsi}]
    rubrik_json = Column(JSON, nullable=False)

    # Relationships
    pertemuan = relationship("Pertemuan", back_populates="project_tasks")
    submissions = relationship("ProjectSubmission", back_populates="task", cascade="all, delete-orphan")

class CTJourneySession(Base):
    __tablename__ = "ct_journey_sessions"

    id = Column(String, primary_key=True, index=True)
    siswa_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String, nullable=False)  # Associated task id
    challenge_context = Column(JSON, nullable=False)
    
    # Step Responses JSON
    decomposition_answer_json = Column(JSON, nullable=True)
    abstraction_answer_json = Column(JSON, nullable=True)
    pattern_answer_json = Column(JSON, nullable=True)
    algorithm_answer_json = Column(JSON, nullable=True)
    
    # Pre-coding Scores: {decomposition, pattern, abstraction, algorithm}
    ct_pre_score_json = Column(JSON, nullable=True)
    is_locked = Column(Boolean, default=False)
    completed_at = Column(DateTime, default=get_utc_now)

class LearningSubmission(Base):
    __tablename__ = "learning_submissions"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("learning_tasks.id", ondelete="CASCADE"), nullable=False)
    siswa_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Attempt list snapshots JSON: [{attempt, timestamp, ast, errors, delta}]
    ast_snapshots_json = Column(JSON, nullable=False)
    attempt_count = Column(Integer, default=0)
    final_score = Column(Integer, default=0)
    
    # Process Metrics
    accuracy_score = Column(Integer, default=0)
    efficiency_score = Column(Integer, default=0)
    
    # CT assessment connection
    ct_session_id = Column(String, ForeignKey("ct_journey_sessions.id", ondelete="SET NULL"), nullable=True)
    reflection_answers_json = Column(JSON, nullable=True)
    
    # CT Scores: {decomposition, pattern, abstraction, algorithm}
    ct_post_score_json = Column(JSON, nullable=True)
    
    # Socratic Assistant log
    ai_tutor_log_json = Column(JSON, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=get_utc_now)

    # Relationships
    siswa = relationship("User", back_populates="learning_submissions")
    task = relationship("LearningTask", back_populates="submissions")

class ProjectSubmission(Base):
    __tablename__ = "project_submissions"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("project_tasks.id", ondelete="CASCADE"), nullable=False)
    siswa_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    final_ast_json = Column(JSON, nullable=False)
    ct_session_id = Column(String, ForeignKey("ct_journey_sessions.id", ondelete="SET NULL"), nullable=True)
    
    # AI suggestion to assist teachers in grading
    ai_suggestion_json = Column(JSON, nullable=True)
    
    # Teacher marks
    teacher_score = Column(Integer, nullable=True)
    teacher_comment = Column(Text, nullable=True)
    rubrik_scores_json = Column(JSON, nullable=True) # {kriteria: score}
    
    is_published_to_gallery = Column(Boolean, default=False)
    submitted_at = Column(DateTime, default=get_utc_now)
    graded_at = Column(DateTime, nullable=True)

    # Relationships
    siswa = relationship("User", back_populates="project_submissions")
    task = relationship("ProjectTask", back_populates="submissions")
    gallery_item = relationship("GalleryItem", back_populates="submission", uselist=False, cascade="all, delete-orphan")

class CTScore(Base):
    __tablename__ = "ct_scores"

    id = Column(String, primary_key=True, index=True)
    siswa_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pertemuan_id = Column(String, ForeignKey("pertemuan.id", ondelete="CASCADE"), nullable=False)
    
    # CT Dimensions
    decomposition = Column(Integer, nullable=False)
    pattern_recognition = Column(Integer, nullable=False)
    abstraction = Column(Integer, nullable=False)
    algorithm_design = Column(Integer, nullable=False)
    
    composite_ct_score = Column(Integer, nullable=False)
    recorded_at = Column(DateTime, default=get_utc_now)

    # Relationships
    siswa = relationship("User", back_populates="ct_scores")
    pertemuan = relationship("Pertemuan", back_populates="ct_scores")

class GalleryItem(Base):
    __tablename__ = "gallery_items"

    id = Column(String, primary_key=True, index=True)
    project_submission_id = Column(String, ForeignKey("project_submissions.id", ondelete="CASCADE"), unique=True, nullable=False)
    published_at = Column(DateTime, default=get_utc_now)
    appreciation_count = Column(Integer, default=0)

    # Relationships
    submission = relationship("ProjectSubmission", back_populates="gallery_item")
    appreciators = relationship("AppreciationLog", back_populates="gallery_item", cascade="all, delete-orphan")

class AppreciationLog(Base):
    __tablename__ = "appreciation_logs"

    id = Column(String, primary_key=True, index=True)
    siswa_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    gallery_item_id = Column(String, ForeignKey("gallery_items.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    # Relationships
    gallery_item = relationship("GalleryItem", back_populates="appreciators")

class CreativeProject(Base):
    __tablename__ = "creative_projects"

    id = Column(String, primary_key=True, index=True)
    siswa_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    ast_json = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    siswa = relationship("User", back_populates="creative_projects")

