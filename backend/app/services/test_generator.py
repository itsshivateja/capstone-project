import os
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectFile
from app.models.analysis import TestSuite
from app.services.llm_provider import llm_provider

TESTGEN_SYSTEM_PROMPT = """You are an expert QA and Software Test Automation Engineer.
Your task is to generate a comprehensive, executable test suite using `pytest`.

Ensure you cover:
1. Standard Happy Path (positive test cases)
2. Negative test cases (invalid inputs, missing params, expected exceptions)
3. Edge cases and Boundary values (empty strings, None, zero, extreme values)
4. Mocking suggestions (using `unittest.mock` or `pytest-mock` for network/IO calls)

Format your response as follows:
```
SUMMARY:
[{"name": "test_valid_input", "type": "positive"}, {"name": "test_empty_payload", "type": "edge_case"}]

CODE:
import pytest
...
```
"""

class TestGeneratorService:
    async def generate_test_suite(
        self,
        db: Session,
        project: Project,
        target_file_path: str,
        framework: str = "pytest"
    ) -> TestSuite:
        code_content = ""
        if project.storage_path:
            full_path = os.path.join(project.storage_path, target_file_path)
            if os.path.exists(full_path):
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        code_content = f.read()[:3000]
                except Exception:
                    pass

        prompt = (
            f"TARGET SOURCE FILE: {target_file_path}\n"
            f"FRAMEWORK: {framework}\n"
            f"PROJECT FRAMEWORKS: {', '.join(project.frameworks or [])}\n\n"
            f"SOURCE CODE:\n```python\n{code_content}\n```\n\n"
            f"Generate a complete test suite with unit tests, edge cases, and mocks."
        )

        response_text = await llm_provider.generate_completion(
            system_prompt=TESTGEN_SYSTEM_PROMPT,
            user_prompt=prompt,
            temperature=0.2
        )

        test_cases_summary = []
        test_code = ""

        if "SUMMARY:" in response_text and "CODE:" in response_text:
            try:
                parts = response_text.split("SUMMARY:")[1]
                sum_part, code_part = parts.split("CODE:")
                test_cases_summary = json.loads(sum_part.strip())
                test_code = code_part.strip()
                if test_code.startswith("```"):
                    lines = test_code.split("\n")
                    if lines[0].startswith("```"): lines = lines[1:]
                    if lines and lines[-1].startswith("```"): lines = lines[:-1]
                    test_code = "\n".join(lines)
            except Exception:
                test_code = response_text
        else:
            test_code = response_text

        # Fallback summary if parsing failed
        if not test_cases_summary:
            test_cases_summary = [
                {"name": "test_happy_path_execution", "type": "positive"},
                {"name": "test_edge_case_empty_input", "type": "edge_case"},
                {"name": "test_error_handling_invalid_payload", "type": "negative"}
            ]

        test_suite_record = TestSuite(
            project_id=project.id,
            file_path=target_file_path,
            framework=framework,
            test_code=test_code,
            test_cases_summary=test_cases_summary
        )
        db.add(test_suite_record)
        db.commit()
        db.refresh(test_suite_record)
        return test_suite_record

test_generator = TestGeneratorService()

