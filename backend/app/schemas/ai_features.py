from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Bug Detection ---
class BugAnalysisRequest(BaseModel):
    file_path: Optional[str] = None

class BugReportResponse(BaseModel):
    id: str
    project_id: str
    file_path: str
    line_number: Optional[int] = None
    severity: str
    category: str
    description: str
    explanation: str
    suggested_fix: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Code Generation ---
class CodeGenRequest(BaseModel):
    prompt: str = Field(..., min_length=3)
    target_file: Optional[str] = None
    context_files: Optional[List[str]] = []

class CodeGenResponse(BaseModel):
    generated_code: str
    explanation: str
    target_file: Optional[str] = None
    diff_preview: Optional[str] = None
    affected_files: List[str] = []

# --- Code Review ---
class CodeReviewRequest(BaseModel):
    file_path: Optional[str] = None

class CodeReviewFinding(BaseModel):
    file_path: str
    line_number: Optional[int] = None
    category: str
    severity: str
    message: str
    suggestion: str

class CodeReviewResponse(BaseModel):
    id: str
    project_id: str
    file_path: Optional[str] = None
    overall_score: float
    summary: str
    metrics: Dict[str, Any]
    findings: List[Dict[str, Any]]
    recommendations: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Test Generation ---
class TestGenRequest(BaseModel):
    file_path: str
    framework: Optional[str] = "pytest"

class TestGenResponse(BaseModel):
    id: str
    project_id: str
    file_path: str
    framework: str
    test_code: str
    test_cases_summary: List[Dict[str, Any]] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Documentation Generation ---
class DocGenRequest(BaseModel):
    doc_type: str = Field("readme", description="readme, architecture, api, or module")
    title: Optional[str] = None

class DocGenResponse(BaseModel):
    id: str
    project_id: str
    doc_type: str
    title: str
    content_markdown: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
