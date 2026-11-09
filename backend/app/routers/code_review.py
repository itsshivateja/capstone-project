from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.analysis import CodeReview
from app.schemas.ai_features import CodeReviewRequest, CodeReviewResponse
from app.services.auth_service import get_current_user
from app.services.code_reviewer import code_reviewer

router = APIRouter(prefix="/review", tags=["AI Code Review"])

@router.post("/{project_id}", response_model=CodeReviewResponse)
async def trigger_code_review(
    project_id: str,
    payload: CodeReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    review = await code_reviewer.review_code(
        db=db,
        project=project,
        target_file=payload.file_path
    )
    return review

@router.get("/{project_id}", response_model=List[CodeReviewResponse])
def get_project_reviews(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(CodeReview).filter(
        CodeReview.project_id == project.id
    ).order_by(CodeReview.created_at.desc()).all()

