from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BugItem(BaseModel):
    line_number: Optional[int] = None
    error_type: str = "Logic / Syntax Error"
    severity: str = "Medium"  # Critical, High, Medium, Low
    description: str
    root_cause: str
    recommended_solution: str

class FixCodeResult(BaseModel):
    original_code: str
    corrected_code: str
    explanation: str
    changes_summary: List[str] = []

class SnippetAnalysisRequest(BaseModel):
    code: str = Field(..., min_length=1, description="Raw source code to analyze")
    language: str = Field(default="python", description="Programming language of the code")
    action: str = Field(
        ...,
        description="One of: detect_bugs, fix_code, explain, optimize, review, security, generate_tests, generate_docs, generate_code"
    )
    prompt: Optional[str] = Field(default=None, description="Optional custom user prompt for code generation or guidance")

class SnippetAnalysisResponse(BaseModel):
    action: str
    language: str
    has_bugs: Optional[bool] = None
    bugs: Optional[List[BugItem]] = None
    fix_result: Optional[FixCodeResult] = None
    text_result: Optional[str] = None
    review_score: Optional[float] = None
    metrics: Optional[Dict[str, Any]] = None

