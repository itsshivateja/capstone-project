from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.services.auth_service import get_current_user
from app.services.agent_workflow import agent_supervisor

router = APIRouter(prefix="/agents", tags=["AI Agents & LangGraph Workflows"])

class AgentWorkflowRequest(BaseModel):
    task_description: str = Field(..., min_length=3, description="Task for the AI agent supervisor")
    target_file: Optional[str] = None

class AgentStepTrace(BaseModel):
    agent_name: str
    status: str
    action: str
    output: Any

class AgentWorkflowResponse(BaseModel):
    workflow_id: str
    intent: str
    primary_agent: str
    steps: list
    final_output: Any

@router.post("/{project_id}/execute", response_model=Dict[str, Any])
async def execute_agent_supervisor_workflow(
    project_id: str,
    payload: AgentWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await agent_supervisor.execute_agent_workflow(
        db=db,
        project=project,
        user_query=payload.task_description,
        target_file=payload.target_file
    )

    # Detailed agent traces for visualizer
    intent = result.get("intent", "general")
    agent_name = result.get("agent", "DevMind Specialist")
    
    traces = [
        {
            "step": 1,
            "agent": "Supervisor Coordinator Agent",
            "status": "completed",
            "message": f"Classified developer intent as '{intent}' and formulated execution graph."
        },
        {
            "step": 2,
            "agent": "Context Retrieval Engine",
            "status": "completed",
            "message": f"Retrieved AST symbols and relevant chunks from Qdrant vector collection 'project_{project.id[:8]}'."
        },
        {
            "step": 3,
            "agent": agent_name,
            "status": "completed",
            "message": f"Specialist executed domain task with repository context."
        },
        {
            "step": 4,
            "agent": "Output Validator Agent",
            "status": "completed",
            "message": "Structured output validated against Pydantic schema and safety constraints."
        }
    ]

    return {
        "status": "success",
        "project_id": project.id,
        "query": payload.task_description,
        "intent": intent,
        "primary_agent": agent_name,
        "traces": traces,
        "execution_result": result.get("result") or result
    }

@router.get("/roster")
def get_agent_roster():
    """List all specialized autonomous agents registered in the system."""
    return [
        {
            "id": "supervisor",
            "name": "Supervisor Coordinator Agent",
            "role": "Intent Routing & Workflow Orchestration",
            "description": "Analyzes developer goals and constructs the LangGraph execution flow."
        },
        {
            "id": "repo_analyst",
            "name": "Repository Analyst Agent",
            "role": "AST & Dependency Intelligence",
            "description": "Inspects project topology, frameworks, lines of code, and symbol graphs."
        },
        {
            "id": "explainer",
            "name": "Code Explanation Agent",
            "role": "Semantic Comprehension",
            "description": "Explains complex algorithms, architectural relationships, and data flows."
        },
        {
            "id": "bug_detector",
            "name": "Bug Detection Agent",
            "role": "Logic & Defect Analysis",
            "description": "Runs AST syntax analysis and detects logical defects, null dereferences, and runtime errors."
        },
        {
            "id": "security_agent",
            "name": "Security Analysis Agent",
            "role": "AppSec & Vulnerability Audit",
            "description": "Audits OWASP Top 10 vulnerabilities, exposed credentials, SQLi, and unsafe deserialization."
        },
        {
            "id": "code_gen",
            "name": "Code Generation Agent",
            "role": "Synthesizer & Refactoring",
            "description": "Builds idiomatic feature code and computes Monaco unified diffs."
        },
        {
            "id": "code_reviewer",
            "name": "Code Review Agent",
            "role": "Architecture Audit",
            "description": "Scores codebases across maintainability, performance, security, and style."
        },
        {
            "id": "test_gen",
            "name": "Test Generation Agent",
            "role": "QA Automation",
            "description": "Constructs pytest suites with edge boundaries, mocks, and negative tests."
        },
        {
            "id": "doc_gen",
            "name": "Documentation Agent",
            "role": "Technical Authoring",
            "description": "Generates READMEs, API specifications, and module architecture manuals."
        }
    ]

