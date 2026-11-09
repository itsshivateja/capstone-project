import ast
import os
import subprocess
import sys
import tempfile
import time
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.analysis import TestSuite
from app.schemas.ai_features import TestGenRequest, TestGenResponse
from app.services.auth_service import get_current_user
from app.services.test_generator import test_generator

router = APIRouter(prefix="/tests", tags=["Automated Test Generation"])

class TestRunRequest(BaseModel):
    test_suite_id: Optional[str] = None
    test_code: Optional[str] = None

class TestRunResult(BaseModel):
    status: str  # passed, failed, syntax_error
    total_passed: int
    total_failed: int
    duration_ms: float
    output_log: str

@router.post("/{project_id}/generate", response_model=TestGenResponse)
async def generate_tests_endpoint(
    project_id: str,
    payload: TestGenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    test_suite = await test_generator.generate_test_suite(
        db=db,
        project=project,
        target_file_path=payload.file_path,
        framework=payload.framework or "pytest"
    )
    return test_suite

@router.get("/{project_id}", response_model=List[TestGenResponse])
def get_project_test_suites(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(TestSuite).filter(
        TestSuite.project_id == project.id
    ).order_by(TestSuite.created_at.desc()).all()

@router.post("/{project_id}/run", response_model=TestRunResult)
def run_test_suite_sandbox(
    project_id: str,
    payload: TestRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Isolated Test Execution:
    1. Validates AST syntax.
    2. Runs test code in a sandboxed subprocess with strict 10s timeout.
    3. Returns parsed execution logs and status.
    """
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    code_to_run = payload.test_code
    if not code_to_run and payload.test_suite_id:
        suite = db.query(TestSuite).filter(
            TestSuite.id == payload.test_suite_id,
            TestSuite.project_id == project_id
        ).first()
        if suite:
            code_to_run = suite.test_code

    if not code_to_run:
        raise HTTPException(status_code=400, detail="No test code provided to execute")

    start_time = time.time()

    # Step 1: Validate AST
    try:
        ast.parse(code_to_run)
    except SyntaxError as e:
        duration = round((time.time() - start_time) * 1000, 2)
        return TestRunResult(
            status="syntax_error",
            total_passed=0,
            total_failed=1,
            duration_ms=duration,
            output_log=f"Syntax Error in Test Suite: {str(e)} at line {e.lineno}"
        )

    # Step 2: Write to temporary test file and run with pytest/python in subprocess
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as tmp:
        tmp.write(code_to_run)
        tmp_path = tmp.name

    try:
        # Run pytest via python executable
        cmd = [sys.executable, "-m", "pytest", tmp_path, "-v", "--no-header"]
        env = os.environ.copy()
        if project.storage_path:
            env["PYTHONPATH"] = project.storage_path + ":" + env.get("PYTHONPATH", "")

        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=10,
            env=env
        )
        duration = round((time.time() - start_time) * 1000, 2)
        output = proc.stdout

        passed = output.count("PASSED")
        failed = output.count("FAILED") + output.count("ERROR")
        status_val = "passed" if proc.returncode == 0 else "failed"

        return TestRunResult(
            status=status_val,
            total_passed=passed or (1 if proc.returncode == 0 else 0),
            total_failed=failed,
            duration_ms=duration,
            output_log=output or "Test execution completed."
        )
    except subprocess.TimeoutExpired:
        duration = round((time.time() - start_time) * 1000, 2)
        return TestRunResult(
            status="timeout",
            total_passed=0,
            total_failed=1,
            duration_ms=duration,
            output_log="Execution timed out: Test suite exceeded maximum 10-second safety limit."
        )
    except Exception as ex:
        duration = round((time.time() - start_time) * 1000, 2)
        return TestRunResult(
            status="failed",
            total_passed=0,
            total_failed=1,
            duration_ms=duration,
            output_log=f"Execution error: {str(ex)}"
        )
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
