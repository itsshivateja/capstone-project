import os
import re
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectFile
from app.services.auth_service import get_current_user
from app.services.llm_provider import llm_provider

router = APIRouter(prefix="/security", tags=["Application Security & OWASP Scanner"])

class VulnerabilityItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    severity: str  # Critical, High, Medium, Low
    category: str  # OWASP Top 10, Secrets Exposure, Injection, Insecure Auth, Cryptographic
    cwe_id: str
    file_path: str
    line_number: Optional[int] = None
    vulnerable_snippet: str
    explanation: str
    remediation_code: str

class SecurityScanResponse(BaseModel):
    security_score: int  # 0 to 100
    risk_level: str  # Safe, Low Risk, Elevated, High Risk, Critical Exposure
    total_vulnerabilities: int
    breakdown: Dict[str, int]
    vulnerabilities: List[VulnerabilityItem]

class SecuritySnippetRequest(BaseModel):
    code: str
    language: Optional[str] = "python"
    file_path: Optional[str] = "snippet.py"

STATIC_SECRET_PATTERNS = [
    (r"(?:api_key|apikey|secret|token|password|auth_token)\s*=\s*['\"][A-Za-z0-9_\-]{16,}['\"]", "Exposed Secret / Hardcoded API Token", "Critical", "Secrets Exposure", "CWE-798"),
    (r"(?:postgres|mysql|mongodb|redis):\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-zA-Z0-9_\.\-]+:\d+", "Hardcoded Database Credentials URL", "Critical", "Secrets Exposure", "CWE-259"),
    (r"f['\"].*SELECT\s+.*\s+FROM\s+.*WHERE\s+.*\{.*\}", "SQL Injection via Formatted String", "Critical", "Injection", "CWE-89"),
    (r"(?:subprocess\.Popen|os\.system|exec)\s*\(\s*f['\"].*\{.*\}", "Command Injection via Unsanitized Shell Invocation", "Critical", "Injection", "CWE-78"),
    (r"eval\s*\(", "Dangerous Code Execution via eval()", "High", "OWASP Top 10", "CWE-95"),
    (r"pickle\.loads\s*\(", "Insecure Deserialization via pickle", "High", "OWASP Top 10", "CWE-502"),
    (r"(?:md5|sha1)\s*\(", "Weak Cryptographic Hash Function", "Medium", "Cryptographic", "CWE-328"),
]

def scan_text_for_security(code: str, file_path: str) -> List[VulnerabilityItem]:
    findings: List[VulnerabilityItem] = []
    lines = code.split("\n")

    for pattern, title, severity, category, cwe in STATIC_SECRET_PATTERNS:
        for idx, line in enumerate(lines, start=1):
            if re.search(pattern, line, re.IGNORECASE):
                # Mask secret value in snippet
                masked_line = re.sub(r"['\"][A-Za-z0-9_\-]{8,}['\"]", "'[REDACTED_SECRET]'", line.strip())
                findings.append(VulnerabilityItem(
                    title=title,
                    severity=severity,
                    category=category,
                    cwe_id=cwe,
                    file_path=file_path,
                    line_number=idx,
                    vulnerable_snippet=masked_line,
                    explanation=f"Detected pattern matching {cwe}: {title}. Never embed sensitive identifiers or unsanitized expressions directly into execution contexts.",
                    remediation_code="# Use environment variables and parameterized queries\nimport os\napi_key = os.getenv('API_KEY')"
                ))
    return findings

@router.post("/snippet", response_model=SecurityScanResponse)
async def scan_snippet_security(
    payload: SecuritySnippetRequest,
    current_user: User = Depends(get_current_user)
):
    code = payload.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    static_findings = scan_text_for_security(code, payload.file_path or "snippet.py")

    # Call LLM for in-depth semantic security audit
    system_prompt = (
        "You are DevMind AI's Principal Application Security (AppSec) Engineer. "
        "Audit the provided source code for subtle security vulnerabilities including:\n"
        "- SQL Injection, NoSQL Injection, Command Injection\n"
        "- Cross-Site Scripting (XSS), Insecure Direct Object References (IDOR)\n"
        "- Broken Authentication, Weak Session Management, Missing Authorization\n"
        "- Path Traversal, Insecure File Handling\n"
        "- Server-Side Request Forgery (SSRF)\n"
        "Return STRICT JSON array with any identified issues:\n"
        "[\n"
        "  {\n"
        '    "title": "<Concise Vulnerability Name>",\n'
        '    "severity": "Critical" | "High" | "Medium" | "Low",\n'
        '    "category": "<OWASP Category>",\n'
        '    "cwe_id": "<e.g. CWE-89>",\n'
        '    "line_number": <exact line number or null>,\n'
        '    "vulnerable_snippet": "<the problematic line>",\n'
        '    "explanation": "<why this represents an exploitable security threat>",\n'
        '    "remediation_code": "<secure production replacement code>"\n'
        "  }\n"
        "]\n"
        "If no vulnerabilities exist, return an empty array []."
    )
    user_prompt = f"Language: {payload.language}\n\nCode to Audit:\n```{payload.language}\n{code}\n```"
    raw_resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.1)

    llm_findings: List[VulnerabilityItem] = []
    try:
        match = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", raw_resp)
        candidate = match.group(1).strip() if match else raw_resp.strip()
        data = json.loads(candidate)
        if isinstance(data, list):
            for item in data:
                llm_findings.append(VulnerabilityItem(
                    title=item.get("title", "Security Vulnerability"),
                    severity=item.get("severity", "Medium"),
                    category=item.get("category", "OWASP Top 10"),
                    cwe_id=item.get("cwe_id", "CWE-699"),
                    file_path=payload.file_path or "snippet.py",
                    line_number=item.get("line_number"),
                    vulnerable_snippet=item.get("vulnerable_snippet", "")[:150],
                    explanation=item.get("explanation", ""),
                    remediation_code=item.get("remediation_code", "")
                ))
    except Exception:
        pass

    # Deduplicate findings
    all_findings = static_findings + llm_findings
    seen = set()
    deduped = []
    for f in all_findings:
        key = (f.cwe_id, f.line_number, f.title)
        if key not in seen:
            seen.add(key)
            deduped.append(f)

    # Calculate Security Score (100 is pristine)
    breakdown = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    penalty = 0
    for f in deduped:
        sev = f.severity.capitalize()
        if sev in breakdown:
            breakdown[sev] += 1
        if sev == "Critical":
            penalty += 25
        elif sev == "High":
            penalty += 15
        elif sev == "Medium":
            penalty += 8
        else:
            penalty += 3

    score = max(5, 100 - penalty)
    risk_level = "Safe" if score >= 90 else ("Low Risk" if score >= 75 else ("Elevated" if score >= 50 else ("High Risk" if score >= 25 else "Critical Exposure")))

    return SecurityScanResponse(
        security_score=score,
        risk_level=risk_level,
        total_vulnerabilities=len(deduped),
        breakdown=breakdown,
        vulnerabilities=deduped
    )

@router.post("/{project_id}/scan", response_model=SecurityScanResponse)
async def scan_project_security(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch up to 15 key project files
    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).limit(15).all()

    aggregated_vulns: List[VulnerabilityItem] = []
    for f in files:
        if f.content:
            static_vulns = scan_text_for_security(f.content, f.file_path)
            aggregated_vulns.extend(static_vulns)

    # Score calculation
    breakdown = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    penalty = 0
    for v in aggregated_vulns:
        sev = v.severity.capitalize()
        if sev in breakdown:
            breakdown[sev] += 1
        if sev == "Critical":
            penalty += 20
        elif sev == "High":
            penalty += 12
        elif sev == "Medium":
            penalty += 6
        else:
            penalty += 2

    score = max(10, 100 - penalty)
    risk_level = "Safe" if score >= 90 else ("Low Risk" if score >= 75 else ("Elevated" if score >= 50 else ("High Risk" if score >= 25 else "Critical Exposure")))

    return SecurityScanResponse(
        security_score=score,
        risk_level=risk_level,
        total_vulnerabilities=len(aggregated_vulns),
        breakdown=breakdown,
        vulnerabilities=aggregated_vulns
    )

