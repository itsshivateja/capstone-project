import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectFile
from app.schemas.ai_features import CodeGenRequest, CodeGenResponse
from app.services.auth_service import get_current_user
from app.services.code_generator import code_generator
from app.utils.zip_security import is_path_safe

router = APIRouter(prefix="/generate", tags=["AI Code Generation"])

@router.post("/{project_id}", response_model=CodeGenResponse)
async def generate_code_endpoint(
    project_id: str,
    payload: CodeGenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await code_generator.generate_code(
        project=project,
        prompt=payload.prompt,
        target_file=payload.target_file
    )
    return CodeGenResponse(**result)

@router.post("/{project_id}/apply")
def apply_generated_code(
    project_id: str,
    payload: CodeGenResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Applies the reviewed & approved code changes to the specified target file in the repository.
    """
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project or not project.storage_path:
        raise HTTPException(status_code=404, detail="Project or storage path not found")

    target_file = payload.target_file
    if not target_file:
        raise HTTPException(status_code=400, detail="Target file must be specified to apply code")

    full_path = os.path.join(project.storage_path, target_file)
    if not is_path_safe(project.storage_path, full_path):
        raise HTTPException(status_code=400, detail="Unsafe path detected")

    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(payload.generated_code)

    return {"status": "success", "message": f"Successfully applied changes to {target_file}"}

