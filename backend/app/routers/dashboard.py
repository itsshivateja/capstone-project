from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectFile
from app.models.conversation import Conversation, Message
from app.models.analysis import BugReport, CodeReview
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    # 1. User Projects
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    project_ids = [p.id for p in projects]
    total_projects = len(projects)

    # 2. Total Files & Lines
    total_files = sum(p.total_files for p in projects)
    total_lines = sum(p.total_lines for p in projects)

    # 3. Aggregated Language distribution
    aggregated_languages = {}
    for p in projects:
        if p.languages and isinstance(p.languages, dict):
            for lang, count in p.languages.items():
                aggregated_languages[lang] = aggregated_languages.get(lang, 0) + count

    # 4. Total Bugs identified
    total_bugs = 0
    bugs_by_severity = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    if project_ids:
        bug_rows = db.query(BugReport.severity, func.count(BugReport.id)).filter(
            BugReport.project_id.in_(project_ids)
        ).group_by(BugReport.severity).all()
        for sev, cnt in bug_rows:
            total_bugs += cnt
            if sev in bugs_by_severity:
                bugs_by_severity[sev] = cnt

    # 5. Total AI conversations
    total_conversations = 0
    total_messages = 0
    if project_ids:
        total_conversations = db.query(Conversation).filter(
            Conversation.project_id.in_(project_ids)
        ).count()
        total_messages = db.query(Message).join(Conversation).filter(
            Conversation.project_id.in_(project_ids)
        ).count()

    # 6. Recent activities
    recent_activities = []
    # Project uploads/updates
    recent_projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.updated_at.desc()).limit(5).all()
    for rp in recent_projects:
        recent_activities.append({
            "type": "project",
            "title": f"Project '{rp.name}' indexed",
            "timestamp": rp.updated_at,
            "status": rp.status,
            "project_name": rp.name,
            "project_id": rp.id
        })

    # Recent Bug reports
    if project_ids:
        recent_bugs = db.query(BugReport).filter(BugReport.project_id.in_(project_ids)).order_by(BugReport.created_at.desc()).limit(3).all()
        for rb in recent_bugs:
            recent_activities.append({
                "type": "bug",
                "title": f"Detected {rb.severity} bug in {rb.file_path}",
                "timestamp": rb.created_at,
                "status": rb.severity.lower(),
                "project_name": "Repository Scan",
                "project_id": rb.project_id
            })

    # Sort combined activities by timestamp desc
    recent_activities.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "total_projects": total_projects,
        "total_files": total_files,
        "total_lines": total_lines,
        "total_bugs": total_bugs,
        "bugs_by_severity": bugs_by_severity,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "languages": aggregated_languages,
        "recent_activities": recent_activities[:8],
        "projects_overview": [
            {
                "id": p.id,
                "name": p.name,
                "primary_language": p.primary_language,
                "total_files": p.total_files,
                "total_lines": p.total_lines,
                "status": p.status,
                "created_at": p.created_at
            } for p in recent_projects
        ]
    }

@router.get("/history")
def get_full_activity_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    project_ids = [p.id for p in projects]
    project_names = {p.id: p.name for p in projects}

    history: List[Dict[str, Any]] = []

    # 1. Project Ingestions
    for p in projects:
        history.append({
            "id": f"proj_{p.id}",
            "action": "Repository Ingestion",
            "category": "Project",
            "title": f"Ingested {p.name} ({p.total_files} files, {p.total_lines} lines)",
            "project_name": p.name,
            "project_id": p.id,
            "status": "completed",
            "timestamp": p.created_at
        })

    # 2. Bug Reports
    if project_ids:
        bugs = db.query(BugReport).filter(BugReport.project_id.in_(project_ids)).order_by(BugReport.created_at.desc()).limit(20).all()
        for b in bugs:
            history.append({
                "id": f"bug_{b.id}",
                "action": "Vulnerability Scan",
                "category": "Security / Quality",
                "title": f"[{b.severity}] {b.category}: {b.file_path}",
                "project_name": project_names.get(b.project_id, "Repository"),
                "project_id": b.project_id,
                "status": b.severity.lower(),
                "timestamp": b.created_at
            })

        # 3. Conversations
        convs = db.query(Conversation).filter(Conversation.project_id.in_(project_ids)).order_by(Conversation.updated_at.desc()).limit(15).all()
        for c in convs:
            history.append({
                "id": f"conv_{c.id}",
                "action": "RAG Chat Session",
                "category": "AI Chat",
                "title": f"Consultation: {c.title}",
                "project_name": project_names.get(c.project_id, "Repository"),
                "project_id": c.project_id,
                "status": "completed",
                "timestamp": c.updated_at
            })

    history.sort(key=lambda x: x["timestamp"], reverse=True)
    return history


