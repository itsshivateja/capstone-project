import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectFile
from app.schemas.project import ProjectFileDetail, ProjectFileResponse, TreeNode
from app.services.auth_service import get_current_user
from app.services.repo_processor import build_file_tree
from app.utils.zip_security import is_path_safe

router = APIRouter(prefix="/repository", tags=["Repository Explorer"])

@router.get("/{project_id}/tree", response_model=List[TreeNode])
def get_repository_tree(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.storage_path or not os.path.exists(project.storage_path):
        return []

    return build_file_tree(project.storage_path)

@router.get("/{project_id}/file", response_model=ProjectFileDetail)
def get_file_content(
    project_id: str,
    path: str = Query(..., description="Relative file path"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.storage_path or not os.path.exists(project.storage_path):
        raise HTTPException(status_code=404, detail="Project files not extracted")

    # Security: Prevent path traversal
    full_path = os.path.join(project.storage_path, path)
    if not is_path_safe(project.storage_path, full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found or unsafe path")

    # Query file metadata
    file_record = db.query(ProjectFile).filter(
        ProjectFile.project_id == project.id,
        ProjectFile.file_path == path
    ).first()

    content = ""
    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as e:
        content = f"Error reading file content: {str(e)}"

    return ProjectFileDetail(
        id=file_record.id if file_record else "temp-id",
        project_id=project.id,
        file_path=path,
        file_name=os.path.basename(path),
        file_extension=os.path.splitext(path)[1],
        language=file_record.language if file_record else "Text",
        size_bytes=os.path.getsize(full_path),
        lines_count=content.count("\n") + 1,
        is_binary=file_record.is_binary if file_record else False,
        content=content
    )

@router.get("/{project_id}/search", response_model=List[ProjectFileResponse])
def search_repository_files(
    project_id: str,
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    matches = db.query(ProjectFile).filter(
        ProjectFile.project_id == project.id,
        (ProjectFile.file_path.ilike(f"%{q}%")) | (ProjectFile.file_name.ilike(f"%{q}%"))
    ).limit(30).all()

    return matches

