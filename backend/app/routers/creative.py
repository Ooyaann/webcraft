import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models import CreativeProject, User
from app.schemas import CreativeProjectCreate, CreativeProjectResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/creative", tags=["creative-projects"])

# POST: Save or Update a Creative Project
@router.post("", response_model=CreativeProjectResponse)
async def save_creative_project(
    project_in: CreativeProjectCreate,
    project_id: str = None, # Optional query param to update existing
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "siswa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya siswa yang dapat mengkreasikan proyek mandiri."
        )

    if project_id:
        # Update existing project
        result = await db.execute(
            select(CreativeProject)
            .where(
                CreativeProject.id == project_id,
                CreativeProject.siswa_id == current_user.id
            )
        )
        proj = result.scalars().first()
        if not proj:
            raise HTTPException(status_code=404, detail="Proyek kreasi tidak ditemukan atau bukan milik Anda.")
        
        proj.name = project_in.name
        proj.ast_json = project_in.ast
        await db.flush()
        return proj
    else:
        # Create a new creative project
        new_proj = CreativeProject(
            id=str(uuid.uuid4()),
            siswa_id=current_user.id,
            name=project_in.name,
            ast_json=project_in.ast
        )
        db.add(new_proj)
        await db.flush()
        return new_proj

# GET: List all creative drafts for the current student
@router.get("/me", response_model=List[CreativeProjectResponse])
async def list_my_creative_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "siswa":
        return []

    result = await db.execute(
        select(CreativeProject)
        .where(CreativeProject.siswa_id == current_user.id)
        .order_by(CreativeProject.updated_at.desc())
    )
    return result.scalars().all()

# GET: Load a specific project draft
@router.get("/{project_id}", response_model=CreativeProjectResponse)
async def get_creative_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CreativeProject)
        .where(
            CreativeProject.id == project_id,
            CreativeProject.siswa_id == current_user.id
        )
    )
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    return proj

# DELETE: Delete a project draft
@router.delete("/{project_id}")
async def delete_creative_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CreativeProject)
        .where(
            CreativeProject.id == project_id,
            CreativeProject.siswa_id == current_user.id
        )
    )
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    
    await db.delete(proj)
    await db.flush()
    return {"message": "Proyek kreasi berhasil dihapus.", "project_id": project_id}
