import os
import re
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectFile
from app.models.analysis import BugReport
from app.services.llm_provider import llm_provider

STATIC_SECURITY_PATTERNS = [
    {
        "pattern": re.compile(r'(?:api[_-]?key|secret|password|token)\s*=\s*["\'][a-zA-Z0-9_\-]{8,}["\']', re.IGNORECASE),
        "severity": "Critical",
        "category": "Hardcoded Credentials",
        "description": "Possible plaintext API key, token, or secret hardcoded in source.",
        "explanation": "Hardcoding secrets in source code risks credential leaks via source control or client distribution.",
        "fix": "Extract credential to environment variables using `os.getenv()` or a `.env` configuration manager."
    },
    {
        "pattern": re.compile(r'(?:execute|cursor\.execute)\s*\(\s*f["\'].*?\{.*?\}', re.IGNORECASE),
        "severity": "Critical",
        "category": "SQL Injection Risk",
        "description": "Unsanitized dynamic formatted string passed directly into SQL query.",
        "explanation": "Using f-strings or string concatenation for SQL queries permits SQL injection attacks.",
        "fix": "Use parameterized queries or ORM query bindings (e.g., `cursor.execute('SELECT * FROM t WHERE id = :id', {'id': val})`)."
    },
    {
        "pattern": re.compile(r'subprocess\.(?:call|Popen|run)\s*\(.*?shell\s*=\s*True', re.IGNORECASE),
        "severity": "High",
        "category": "Command Injection Risk",
        "description": "Subprocess execution invoked with shell=True flag.",
        "explanation": "If untrusted input is included in the command string, shell=True can allow arbitrary OS command execution.",
        "fix": "Pass command arguments as a list and remove `shell=True` (e.g. `subprocess.run(['ls', '-la'])`)."
    },
    {
        "pattern": re.compile(r'except\s*:\s*(?:pass|\.\.\.)'),
        "severity": "Medium",
        "category": "Silent Failure & Error Swallowing",
        "description": "Bare except clause with pass silently suppresses all exceptions.",
        "explanation": "Bare except catches system exit, keyboard interrupt, and syntax errors, making debugging impossible.",
        "fix": "Catch specific expected exception types and log the exception details."
    },
    {
        "pattern": re.compile(r'\beval\s*\(|\bexec\s*\('),
        "severity": "High",
        "category": "Arbitrary Code Execution",
        "description": "Usage of dynamic code execution function eval() or exec().",
        "explanation": "Evaluating dynamic expressions allows execution of arbitrary injected code if inputs are not strictly controlled.",
        "fix": "Use safer alternatives such as `ast.literal_eval()` or structured parsers (e.g., json.loads)."
    }
]

class BugAnalyzerService:
    async def analyze_project_or_file(self, db: Session, project: Project, target_file_path: Optional[str] = None) -> List[BugReport]:
        reports: List[BugReport] = []
        if not project.storage_path or not os.path.exists(project.storage_path):
            return reports

        # Find target files
        query = db.query(ProjectFile).filter(ProjectFile.project_id == project.id, ProjectFile.is_binary == False)
        if target_file_path:
            query = query.filter(ProjectFile.file_path == target_file_path)
        files = query.limit(15).all()

        for f in files:
            full_path = os.path.join(project.storage_path, f.file_path)
            if not os.path.exists(full_path):
                continue
            
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as file_in:
                    lines = file_in.readlines()
            except Exception:
                continue

            # 1. Static Scan
            for line_idx, line in enumerate(lines, start=1):
                for rule in STATIC_SECURITY_PATTERNS:
                    if rule["pattern"].search(line):
                        report = BugReport(
                            project_id=project.id,
                            file_path=f.file_path,
                            line_number=line_idx,
                            severity=rule["severity"],
                            category=rule["category"],
                            description=rule["description"],
                            explanation=rule["explanation"],
                            suggested_fix=rule["fix"],
                            status="open"
                        )
                        db.add(report)
                        reports.append(report)

            # 2. LLM Semantic Bug Scan (if file is primary and under 300 lines)
            if len(lines) > 5 and len(lines) < 300 and len(reports) < 6:
                content_snippet = "".join(lines[:120])
                prompt = (
                    f"Perform a strict static code and security audit on this file:\n"
                    f"File: {f.file_path} ({f.language})\n\n"
                    f"```\n{content_snippet}\n```\n\n"
                    f"Respond ONLY with a JSON list of identified bugs/flaws (maximum 2 items):\n"
                    f"[{{\"line_number\": <int>, \"severity\": \"<Critical|High|Medium|Low>\", \"category\": \"<Category>\", \"description\": \"<Summary>\", \"explanation\": \"<Why it is a problem>\", \"suggested_fix\": \"<How to fix>\"}}]"
                )
                try:
                    llm_resp = await llm_provider.generate_completion(
                        system_prompt="You are an expert static analysis and code security auditor. Output valid JSON only.",
                        user_prompt=prompt,
                        temperature=0.1
                    )
                    clean_json = llm_resp.strip()
                    if clean_json.startswith("```json"): clean_json = clean_json[7:]
                    if clean_json.startswith("```"): clean_json = clean_json[3:]
                    if clean_json.endswith("```"): clean_json = clean_json[:-3]
                    items = json.loads(clean_json.strip())
                    if isinstance(items, list):
                        for item in items:
                            report = BugReport(
                                project_id=project.id,
                                file_path=f.file_path,
                                line_number=item.get("line_number"),
                                severity=item.get("severity", "Medium"),
                                category=item.get("category", "Logic/Quality"),
                                description=item.get("description", "Potential code quality issue"),
                                explanation=item.get("explanation", ""),
                                suggested_fix=item.get("suggested_fix", ""),
                                status="open"
                            )
                            db.add(report)
                            reports.append(report)
                except Exception:
                    pass

        db.commit()
        return reports

bug_analyzer = BugAnalyzerService()
