from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.analysis import BugReport
from app.schemas.ai_features import BugAnalysisRequest, BugReportResponse
from app.services.auth_service import get_current_user
from app.services.bug_analyzer import bug_analyzer

router = APIRouter(prefix="/bugs", tags=["AI Bug Detection"])

@router.post("/{project_id}/analyze", response_model=List[BugReportResponse])
async def trigger_bug_analysis(
    project_id: str,
    payload: BugAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reports = await bug_analyzer.analyze_project_or_file(
        db=db,
        project=project,
        target_file_path=payload.file_path
    )
    return reports

@router.get("/{project_id}", response_model=List[BugReportResponse])
def list_bug_reports(
    project_id: str,
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    q = db.query(BugReport).filter(BugReport.project_id == project.id)
    if severity:
        q = q.filter(BugReport.severity == severity)
    if status:
        q = q.filter(BugReport.status == status)

    return q.order_by(BugReport.created_at.desc()).all()

@router.patch("/{project_id}/{bug_id}/status", response_model=BugReportResponse)
def update_bug_status(
    project_id: str,
    bug_id: str,
    status: str = Query(..., pattern="^(open|resolved|ignored)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bug = db.query(BugReport).filter(BugReport.id == bug_id, BugReport.project_id == project_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug report not found")

    bug.status = status
    db.commit()
    db.refresh(bug)
    return bug
