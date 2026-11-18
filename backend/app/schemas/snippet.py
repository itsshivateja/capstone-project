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
    code: str = Field(default="", description="Raw source code to analyze or existing code context")
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
    generated_code: Optional[str] = None
    explanation: Optional[str] = None
    text_result: Optional[str] = None
    review_score: Optional[float] = None
    metrics: Optional[Dict[str, Any]] = None

# ================= MULTI-PROVIDER CODE GENERATION SCHEMAS =================
class ProviderCodeSolution(BaseModel):
    provider: str  # "gemini", "groq", "openai"
    provider_name: str  # "Google Gemini API", "Groq API", "OpenAI API"
    status: str  # "success" or "error"
    code: Optional[str] = None
    explanation: Optional[str] = None
    error_message: Optional[str] = None
    model: Optional[str] = None
    duration_ms: Optional[float] = None
    line_count: Optional[int] = None

class MultiProviderGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=2, description="User prompt describing what code to generate")
    language: str = Field(default="python", description="Programming language target")
    existing_code: Optional[str] = Field(default="", description="Existing editor code if any")

class MultiProviderGenerationResponse(BaseModel):
    prompt: str
    language: str
    solutions: Dict[str, ProviderCodeSolution]
    recommended_provider: Optional[str] = None  # "gemini" | "groq" | "openai" | "comparable"
    recommendation_reason: Optional[str] = None

# ================= SANDBOX CODE EXECUTION SCHEMAS =================
class CodeRunRequest(BaseModel):
    code: str = Field(..., description="Source code to execute in sandbox")
    language: str = Field(default="python", description="Programming language of the code")
    stdin: Optional[str] = Field(default="", description="Optional standard input stream")

class CodeRunResponse(BaseModel):
    status: str  # "success", "error", "timeout", "unsupported"
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    execution_time_ms: float = 0.0
    sandbox_type: str = "isolated_sandbox"
