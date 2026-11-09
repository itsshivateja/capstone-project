from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.analysis import TestSuite
from app.schemas.ai_features import TestGenRequest, TestGenResponse
from app.services.auth_service import get_current_user
from app.services.test_generator import test_generator

router = APIRouter(prefix="/tests", tags=["Automated Test Generation"])

@router.post("/{project_id}/generate", response_model=TestGenResponse)
async def generate_tests_endpoint(
    project_id: str,
    payload: TestGenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    test_suite = await test_generator.generate_test_suite(
        db=db,
        project=project,
        target_file_path=payload.file_path,
        framework=payload.framework or "pytest"
    )
    return test_suite

@router.get("/{project_id}", response_model=List[TestGenResponse])
def get_project_test_suites(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(TestSuite).filter(
        TestSuite.project_id == project.id
    ).order_by(TestSuite.created_at.desc()).all()
