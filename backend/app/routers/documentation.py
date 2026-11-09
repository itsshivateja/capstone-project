from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.analysis import DocumentationArtifact
from app.schemas.ai_features import DocGenRequest, DocGenResponse
from app.services.auth_service import get_current_user
from app.services.doc_generator import doc_generator

router = APIRouter(prefix="/docs", tags=["Documentation Generation"])

@router.post("/{project_id}/generate", response_model=DocGenResponse)
async def generate_docs_endpoint(
    project_id: str,
    payload: DocGenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    doc = await doc_generator.generate_documentation(
        db=db,
        project=project,
        doc_type=payload.doc_type,
        custom_title=payload.title
    )
    return doc

@router.get("/{project_id}", response_model=List[DocGenResponse])
def get_project_docs(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(DocumentationArtifact).filter(
        DocumentationArtifact.project_id == project.id
    ).order_by(DocumentationArtifact.created_at.desc()).all()

@router.get("/{project_id}/{doc_id}/download")
def download_doc_markdown(
    project_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(DocumentationArtifact).filter(
        DocumentationArtifact.id == doc_id,
        DocumentationArtifact.project_id == project_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documentation not found")

    filename = f"{doc.doc_type}_{project_id[:6]}.md"
    return Response(
        content=doc.content_markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
