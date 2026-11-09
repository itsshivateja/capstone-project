import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.project import Project, ProjectFile
from app.schemas.project import ProjectCreate, ProjectResponse, RepositoryAnalysisResponse, TreeNode
from app.services.auth_service import get_current_user
from app.services.repo_processor import process_repository, build_file_tree

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = Project(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        status="ready"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.created_at.desc()).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Remove files on disk
    if project.storage_path and os.path.exists(project.storage_path):
        try:
            shutil.rmtree(project.storage_path, ignore_errors=True)
            # Remove parent project upload dir if empty
            upload_dir = os.path.dirname(project.storage_path)
            shutil.rmtree(upload_dir, ignore_errors=True)
        except Exception:
            pass

    db.delete(project)
    db.commit()
    return None

@router.post("/{project_id}/upload-zip", response_model=ProjectResponse)
async def upload_project_zip(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are supported")

    # Target upload dir
    project_upload_dir = os.path.join(settings.UPLOAD_DIR, project.id)
    os.makedirs(project_upload_dir, exist_ok=True)
    zip_dest_path = os.path.join(project_upload_dir, file.filename)

    # Save uploaded bytes with size validation
    total_bytes = 0
    with open(zip_dest_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            total_bytes += len(chunk)
            if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                os.remove(zip_dest_path)
                raise HTTPException(status_code=400, detail="File size exceeds maximum 50MB limit")
            buffer.write(chunk)

    # Process repository synchronously or in background
    # We execute directly so client gets immediate ready status with complete index
    process_repository(db, project, zip_dest_path)
    db.refresh(project)
    return project

@router.get("/{project_id}/analysis", response_model=RepositoryAnalysisResponse)
def get_project_analysis(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_tree = []
    if project.storage_path and os.path.exists(project.storage_path):
        file_tree = build_file_tree(project.storage_path)

    summary = (
        f"Repository '{project.name}' contains {project.total_files} files "
        f"spanning {project.total_lines:,} lines of code. "
        f"Primary language is {project.primary_language}. "
        f"Detected frameworks: {', '.join(project.frameworks) if project.frameworks else 'None'}."
    )

    return RepositoryAnalysisResponse(
        project_id=project.id,
        total_files=project.total_files,
        total_lines=project.total_lines,
        primary_language=project.primary_language,
        languages=project.languages or {},
        frameworks=project.frameworks or [],
        dependencies=project.dependencies or {},
        file_tree=file_tree,
        summary=summary
    )
