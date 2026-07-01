import random
import string
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.models import Room, User, room_members, LearningSubmission, ProjectSubmission, CTScore, Pertemuan
from app.schemas import RoomCreate, RoomJoin, RoomResponse, RoomUpdate, UserResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["rooms"])

def generate_room_code(length=6) -> str:
    # Generates a random 6-character alphanumeric uppercase code
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(length))

# Router POST: Create Classroom Room (Guru only)
@router.post("", response_model=RoomResponse)
async def create_room(room_in: RoomCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "guru":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya akun Guru yang diizinkan membuat kelas baru."
        )

    # Ensure code is unique
    code = generate_room_code()
    while True:
        existing = await db.execute(select(Room).where(Room.code == code))
        if not existing.scalars().first():
            break
        code = generate_room_code()

    new_room = Room(
        id=str(uuid.uuid4()),
        guru_id=current_user.id,
        name=room_in.name,
        code=code,
        is_active=True
    )
    db.add(new_room)
    await db.flush()
    return new_room

# Router POST: Join Classroom Room (Siswa only)
@router.post("/join", response_model=RoomResponse)
async def join_room(join_in: RoomJoin, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Find room by code
    result = await db.execute(select(Room).where(Room.code == join_in.code))
    room = result.scalars().first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kelas dengan kode tersebut tidak ditemukan."
        )
        
    if not room.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kelas tersebut sudah tidak aktif."
        )

    # Check if user is already a member
    membership_check = await db.execute(
        select(room_members).where(
            room_members.c.room_id == room.id,
            room_members.c.siswa_id == current_user.id
        )
    )
    if membership_check.first():
        return room

    # Add student to classroom room
    # We can do this by appending to room.members (requires loading)
    result_loaded = await db.execute(
        select(Room).where(Room.id == room.id).options(selectinload(Room.members))
    )
    room_loaded = result_loaded.scalars().first()
    room_loaded.members.append(current_user)
    
    return room_loaded

# Router GET: List all classrooms for the user
@router.get("", response_model=List[RoomResponse])
async def list_rooms(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role == "guru":
        # Get rooms created by the guru
        result = await db.execute(select(Room).where(Room.guru_id == current_user.id))
        return result.scalars().all()
    else:
        # Get rooms joined by the student
        result = await db.execute(
            select(Room)
            .join(room_members, Room.id == room_members.c.room_id)
            .where(room_members.c.siswa_id == current_user.id)
        )
        return result.scalars().all()

# Router GET: Get single room details
@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kelas tidak ditemukan.")
    
    if current_user.role == "guru" and room.guru_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda bukan pengajar kelas ini.")
        
    if current_user.role == "siswa":
        membership_check = await db.execute(
            select(room_members).where(
                room_members.c.room_id == room.id,
                room_members.c.siswa_id == current_user.id
            )
        )
        if not membership_check.first():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda bukan anggota kelas ini.")
            
    return room

# Router PUT: Update classroom settings/announcements (Guru only)
@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    room_update: RoomUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kelas tidak ditemukan.")

    if room.guru_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Hanya guru pembuat kelas yang dapat mengedit kelas ini."
        )

    if room_update.name is not None:
        room.name = room_update.name
    if room_update.is_active is not None:
        room.is_active = room_update.is_active
    if room_update.announcement is not None:
        room.announcement = room_update.announcement

    await db.flush()
    await db.commit()
    return room

# Router GET: Get room members (students)
@router.get("/{room_id}/members", response_model=List[UserResponse])
async def get_room_members(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Find room
    result = await db.execute(
        select(Room)
        .options(selectinload(Room.members))
        .where(Room.id == room_id)
    )
    room = result.scalars().first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kelas tidak ditemukan."
        )
    
    # Check if the user is authorized (the teacher who created it, or a student who is a member)
    if current_user.role == "guru" and room.guru_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda bukan pengajar kelas ini."
        )
    
    return room.members

# Router GET: Get all student grades and progress for a room
@router.get("/{room_id}/grades")
async def get_room_grades(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if room exists and user is creator guru
    result = await db.execute(
        select(Room)
        .options(
            selectinload(Room.members),
            selectinload(Room.pertemuan).selectinload(Pertemuan.learning_tasks),
            selectinload(Room.pertemuan).selectinload(Pertemuan.project_tasks)
        )
        .where(Room.id == room_id)
    )
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan.")
    
    if current_user.role != "guru" or room.guru_id != current_user.id:
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya pengajar kelas ini.")
    
    # Collect all learning task IDs and project task IDs in this room
    learning_task_ids = []
    project_task_ids = []
    pertemuan_ids = []
    for pert in room.pertemuan:
        pertemuan_ids.append(pert.id)
        for lt in pert.learning_tasks:
            learning_task_ids.append(lt.id)
        for pt in pert.project_tasks:
            project_task_ids.append(pt.id)
            
    # Fetch all learning submissions for these tasks
    learning_subs = {}
    if learning_task_ids:
        l_sub_res = await db.execute(
            select(LearningSubmission)
            .where(LearningSubmission.task_id.in_(learning_task_ids))
        )
        for sub in l_sub_res.scalars().all():
            if sub.siswa_id not in learning_subs:
                learning_subs[sub.siswa_id] = []
            learning_subs[sub.siswa_id].append(sub)

    # Fetch all project submissions for these tasks
    project_subs = {}
    if project_task_ids:
        p_sub_res = await db.execute(
            select(ProjectSubmission)
            .where(ProjectSubmission.task_id.in_(project_task_ids))
        )
        for sub in p_sub_res.scalars().all():
            if sub.siswa_id not in project_subs:
                project_subs[sub.siswa_id] = []
            project_subs[sub.siswa_id].append(sub)

    # Fetch all CT scores for these meetings
    ct_scores_map = {}
    if pertemuan_ids:
        ct_res = await db.execute(
            select(CTScore)
            .where(CTScore.pertemuan_id.in_(pertemuan_ids))
        )
        for score in ct_res.scalars().all():
            if score.siswa_id not in ct_scores_map:
                ct_scores_map[score.siswa_id] = []
            ct_scores_map[score.siswa_id].append(score)

    # Compile grades for each member
    grades = []
    for student in room.members:
        s_id = student.id
        
        # 1. Calculate learning average score
        student_l_subs = learning_subs.get(s_id, [])
        l_score = 0
        if student_l_subs:
            l_score = int(sum(sub.final_score for sub in student_l_subs) / len(student_l_subs))
        
        # 2. Get project status and score
        student_p_subs = project_subs.get(s_id, [])
        p_score = None
        status_str = "Belum Mengerjakan"
        
        if student_p_subs:
            # Get latest project submission
            latest_p_sub = student_p_subs[-1]
            p_score = latest_p_sub.teacher_score
            status_str = "Selesai" if p_score is not None else "Perlu Dinilai"
            
        # 3. Calculate average CT score
        student_ct_scores = ct_scores_map.get(s_id, [])
        avg_decomp = 0
        avg_abstract = 0
        avg_pattern = 0
        avg_algo = 0
        avg_ct = 0
        
        if student_ct_scores:
            avg_decomp = int(sum(s.decomposition for s in student_ct_scores) / len(student_ct_scores))
            avg_abstract = int(sum(s.abstraction for s in student_ct_scores) / len(student_ct_scores))
            avg_pattern = int(sum(s.pattern_recognition for s in student_ct_scores) / len(student_ct_scores))
            avg_algo = int(sum(s.algorithm_design for s in student_ct_scores) / len(student_ct_scores))
            avg_ct = int(sum(s.composite_ct_score for s in student_ct_scores) / len(student_ct_scores))
            
        # Pre-test score fallback
        pre_score = 70 if student_l_subs or student_ct_scores else 0
        
        # Calculate task completion status
        student_l_submitted = {sub.task_id for sub in student_l_subs if sub.task_id in learning_task_ids}
        student_p_submitted = {sub.task_id for sub in student_p_subs if sub.task_id in project_task_ids}
        already_done = len(student_l_submitted) + len(student_p_submitted)
        total_tasks = len(learning_task_ids) + len(project_task_ids)
        not_done = max(0, total_tasks - already_done)
        
        grades.append({
            "name": student.name,
            "email": student.email,
            "pre": pre_score,
            "learning": l_score,
            "project": p_score,
            "ct": avg_ct if avg_ct > 0 else (l_score if l_score > 0 else 0),
            "decomposition": avg_decomp if avg_decomp > 0 else (l_score if l_score > 0 else 0),
            "abstraction": avg_abstract if avg_abstract > 0 else (l_score if l_score > 0 else 0),
            "pattern_recognition": avg_pattern if avg_pattern > 0 else (l_score if l_score > 0 else 0),
            "algorithm_design": avg_algo if avg_algo > 0 else (l_score if l_score > 0 else 0),
            "status": status_str,
            "already_done": already_done,
            "not_done": not_done
        })
        
    return grades
