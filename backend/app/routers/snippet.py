import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.models.user import User
from app.services.auth_service import get_current_user
from app.schemas.snippet import SnippetAnalysisRequest, SnippetAnalysisResponse
from app.services.snippet_service import snippet_service

router = APIRouter(prefix="/snippet", tags=["Pasted Code Sandbox & Analysis"])

class LanguageDetectRequest(BaseModel):
    code: str

class LanguageDetectResponse(BaseModel):
    language: str
    confidence: float

@router.post("/analyze", response_model=SnippetAnalysisResponse)
async def analyze_code_snippet(
    payload: SnippetAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Direct code snippet analyzer supporting all 9 AI actions:
    1. detect_bugs
    2. fix_code
    3. explain
    4. optimize
    5. review
    6. security
    7. generate_tests
    8. generate_docs
    9. generate_code
    """
    if not payload.code or not payload.code.strip():
        raise HTTPException(status_code=400, detail="Source code cannot be empty.")

    try:
        result = await snippet_service.analyze_snippet(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.post("/detect-language", response_model=LanguageDetectResponse)
def detect_code_language(payload: LanguageDetectRequest):
    code = payload.code.strip()
    if not code:
        return LanguageDetectResponse(language="plaintext", confidence=0.0)

    # Heuristic language signatures
    if re.search(r"^\s*def\s+\w+\(.*\):|^\s*import\s+\w+|^\s*from\s+\w+\s+import", code, re.MULTILINE):
        return LanguageDetectResponse(language="python", confidence=0.95)
    if re.search(r"package\s+main|func\s+\w+\(.*\)|import\s+\(", code, re.MULTILINE):
        return LanguageDetectResponse(language="go", confidence=0.95)
    if re.search(r"fn\s+\w+\(.*\)\s*->|let\s+mut\s+|impl\s+\w+", code, re.MULTILINE):
        return LanguageDetectResponse(language="rust", confidence=0.95)
    if re.search(r"interface\s+\w+\s*\{|type\s+\w+\s*=|:\s*(string|number|boolean|any)\[\]", code, re.MULTILINE):
        return LanguageDetectResponse(language="typescript", confidence=0.90)
    if re.search(r"const\s+\w+\s*=|function\s+\w+\(.*\)|console\.log\(", code, re.MULTILINE):
        return LanguageDetectResponse(language="javascript", confidence=0.85)
    if re.search(r"public\s+class\s+\w+|System\.out\.println|public\s+static\s+void\s+main", code, re.MULTILINE):
        return LanguageDetectResponse(language="java", confidence=0.95)
    if re.search(r"#include\s+<iostream>|#include\s+<vector>|std::cout", code, re.MULTILINE):
        return LanguageDetectResponse(language="cpp", confidence=0.95)
    if re.search(r"SELECT\s+.*\s+FROM\s+|INSERT\s+INTO\s+|CREATE\s+TABLE", code, re.IGNORECASE):
        return LanguageDetectResponse(language="sql", confidence=0.95)
    if re.search(r"<!DOCTYPE\s+html>|<html|<div|<body", code, re.IGNORECASE):
        return LanguageDetectResponse(language="html", confidence=0.95)
    
    return LanguageDetectResponse(language="python", confidence=0.50)
