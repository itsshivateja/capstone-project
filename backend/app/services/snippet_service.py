import json
import re
from typing import List, Dict, Any, Optional
from app.schemas.snippet import (
    SnippetAnalysisRequest,
    SnippetAnalysisResponse,
    BugItem,
    FixCodeResult
)
from app.services.llm_provider import llm_provider

class SnippetService:
    def _extract_json_block(self, text: str) -> Optional[Any]:
        """Safely extract and parse JSON from LLM markdown code blocks."""
        text = text.strip()
        # Look for ```json ... ```
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        raw = json_match.group(1).strip() if json_match else text
        try:
            return json.loads(raw)
        except Exception:
            # Fallback regex search for JSON array or object
            obj_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
            if obj_match:
                try:
                    return json.loads(obj_match.group(1))
                except Exception:
                    pass
        return None

    async def analyze_snippet(self, payload: SnippetAnalysisRequest) -> SnippetAnalysisResponse:
        action = payload.action.lower().strip()
        code = payload.code.strip()
        language = payload.language.lower().strip()

        if action == "detect_bugs":
            return await self._detect_bugs(code, language)
        elif action == "fix_code":
            return await self._fix_code(code, language)
        elif action == "explain":
            return await self._explain_code(code, language)
        elif action == "optimize":
            return await self._optimize_code(code, language)
        elif action == "review":
            return await self._review_code(code, language)
        elif action == "security":
            return await self._security_analysis(code, language)
        elif action == "generate_tests":
            return await self._generate_tests(code, language)
        elif action == "generate_docs":
            return await self._generate_docs(code, language)
        elif action == "generate_code":
            return await self._generate_code(code, language, payload.prompt)
        else:
            # Default to explanation
            return await self._explain_code(code, language)

    async def _detect_bugs(self, code: str, language: str) -> SnippetAnalysisResponse:
        system_prompt = (
            "You are DevMind AI's Senior Code Security & Quality Auditor. "
            "Analyze the given source code for logical bugs, syntax errors, edge-case failures, "
            "null/undefined dereferences, off-by-one errors, and memory/resource leaks. "
            "Respond STRICTLY in valid JSON format with the following structure:\n"
            "{\n"
            '  "has_bugs": true/false,\n'
            '  "bugs": [\n'
            "    {\n"
            '      "line_number": <exact line number or null>,\n'
            '      "error_type": "<e.g., Logic Error, Zero Division, Type Mismatch, Off-By-One, Resource Leak>",\n'
            '      "severity": "Critical" | "High" | "Medium" | "Low",\n'
            '      "description": "<Concise description of the problem>",\n'
            '      "root_cause": "<Why this failure occurs under specific execution conditions>",\n'
            '      "recommended_solution": "<Step-by-step guidance on how to fix it>"\n'
            "    }\n"
            "  ]\n"
            "}"
        )
        user_prompt = f"Programming Language: {language}\n\nSource Code:\n```{language}\n{code}\n```"

        raw_resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.1)
        parsed = self._extract_json_block(raw_resp)

        bugs: List[BugItem] = []
        has_bugs = False

        if parsed and isinstance(parsed, dict):
            has_bugs = bool(parsed.get("has_bugs", False))
            raw_bugs = parsed.get("bugs", [])
            for b in raw_bugs:
                bugs.append(BugItem(
                    line_number=b.get("line_number"),
                    error_type=b.get("error_type", "Logical Error"),
                    severity=b.get("severity", "Medium"),
                    description=b.get("description", "Potential execution issue detected."),
                    root_cause=b.get("root_cause", "Undefined execution flow."),
                    recommended_solution=b.get("recommended_solution", "Refactor the logic.")
                ))
            if len(bugs) > 0:
                has_bugs = True
        else:
            # Fallback if non-JSON markdown returned
            has_bugs = "bug" in raw_resp.lower() or "error" in raw_resp.lower()
            bugs.append(BugItem(
                line_number=1,
                error_type="Identified Issue",
                severity="Medium",
                description=raw_resp[:300],
                root_cause="Identified via semantic code analysis.",
                recommended_solution="Review the suggested adjustments."
            ))

        return SnippetAnalysisResponse(
            action="detect_bugs",
            language=language,
            has_bugs=has_bugs,
            bugs=bugs,
            text_result=raw_resp
        )

    async def _fix_code(self, code: str, language: str) -> SnippetAnalysisResponse:
        system_prompt = (
            "You are DevMind AI's Automated Code Repair Specialist. "
            "Analyze the given source code, identify every error, logical defect, or inefficiency, "
            "and generate the complete, production-ready corrected code. "
            "Respond STRICTLY in valid JSON with this exact structure:\n"
            "{\n"
            '  "corrected_code": "<FULL corrected code as a clean string without markdown code ticks>",\n'
            '  "explanation": "<Comprehensive overview explaining what was broken and why the fix works>",\n'
            '  "changes_summary": [\n'
            '    "<Point 1 detailing exact modification with line numbers>",\n'
            '    "<Point 2 detailing exact modification with line numbers>"\n'
            "  ]\n"
            "}"
        )
        user_prompt = f"Programming Language: {language}\n\nOriginal Code:\n```{language}\n{code}\n```"

        raw_resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.1)
        parsed = self._extract_json_block(raw_resp)

        if parsed and isinstance(parsed, dict) and "corrected_code" in parsed:
            corrected = parsed["corrected_code"].strip()
            # Strip accidental outer code ticks if model included them inside the string
            if corrected.startswith("```"):
                corrected = re.sub(r"^```[a-zA-Z]*\n?", "", corrected)
                corrected = re.sub(r"\n?```$", "", corrected)
            
            fix_res = FixCodeResult(
                original_code=code,
                corrected_code=corrected,
                explanation=parsed.get("explanation", "Code repaired for edge-case stability and correctness."),
                changes_summary=parsed.get("changes_summary", ["Repaired logical errors and improved safety."])
            )
        else:
            # Clean text fallback
            clean_code = re.sub(r"```[a-zA-Z]*\n?", "", raw_resp)
            clean_code = re.sub(r"\n?```$", "", clean_code)
            fix_res = FixCodeResult(
                original_code=code,
                corrected_code=clean_code.strip() or code,
                explanation="Applied best-practice refactoring and bug mitigation.",
                changes_summary=["Syntactic and logical corrections applied."]
            )

        return SnippetAnalysisResponse(
            action="fix_code",
            language=language,
            fix_result=fix_res,
            text_result=fix_res.explanation
        )

    async def _explain_code(self, code: str, language: str) -> SnippetAnalysisResponse:
        system_prompt = (
            "You are DevMind AI's Senior Technical Architect & Code Explainer. "
            "Provide a comprehensive, crystal-clear explanation of the provided code:\n"
            "1. High-Level Architecture & Purpose\n"
            "2. Step-by-Step Execution Flow\n"
            "3. Key Functions, Classes, and Inputs/Outputs\n"
            "4. Edge Cases, Invariants, and Computational Complexity (Big-O Time & Space)\n"
            "Format in structured, professional Markdown with clear headings."
        )
        user_prompt = f"Programming Language: {language}\n\nCode to explain:\n```{language}\n{code}\n```"
        resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.2)
        return SnippetAnalysisResponse(action="explain", language=language, text_result=resp)

    async def _optimize_code(self, code: str, language: str) -> SnippetAnalysisResponse:
        system_prompt = (
            "You are DevMind AI's Performance Engineering Specialist. "
            "Analyze the given code for algorithmic efficiency, memory consumption, and runtime bottlenecks:\n"
            "1. Current Time & Space Complexity analysis\n"
            "2. Performance Bottlenecks identified\n"
            "3. Optimized Production Code Implementation\n"
            "4. New Time & Space Complexity with benchmark expectations\n"
            "Provide the complete optimized code block and explanation in GitHub Markdown."
        )
        user_prompt = f"Programming Language: {language}\n\nCode to optimize:\n```{language}\n{code}\n```"
        resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.2)
        return SnippetAnalysisResponse(action="optimize", language=language, text_result=resp)

    async def _review_code(self, code: str, language: str) -> SnippetAnalysisResponse:
        system_prompt = (
            "You are DevMind AI's Lead Staff Engineer performing a thorough Code Review. "
            "Evaluate:\n"
            "- Overall Code Quality (Score from 0.0 to 10.0)\n"
            "- Readability and Idiomatic Conventions\n"
            "- Maintainability & Extensibility\n"
            "- Error Handling & Resilience\n"
            "- Specific Line-by-Line Suggestions\n"
            "Start your response with a summary table and score card, followed by actionable suggestions."
        )
        user_prompt = f"Programming Language: {language}\n\nCode to review:\n```{language}\n{code}\n```"
        resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.2)
        
        # Calculate heuristic score
        score = 8.5
        score_match = re.search(r"(\d+(?:\.\d+)?)\s*/\s*10", resp)
        if score_match:
            try:
                score = float(score_match.group(1))
            except Exception:
                pass

        return SnippetAnalysisResponse(
            action="review",
            language=language,
            review_score=score,
            text_result=resp
        )

    async def _security_analysis(self, code: str, language: str) -> SnippetAnalysisResponse:
        system_prompt = (
            "You are DevMind AI's Application Security (AppSec) Expert. "
            "Perform a rigorous security audit of the provided code:\n"
            "- OWASP Top 10 Vulnerabilities (Injection, XSS, SSRF, Deserialization)\n"
            "- Hardcoded Credentials or Secrets Exposure\n"
            "- Insecure Cryptography, Weak Randomness, or Path Traversal\n"
            "- Unsanitized User Inputs\n"
            "Provide risk severity levels (Critical, High, Medium, Low) and concrete remediation code."
        )
        user_prompt = f"Programming Language: {language}\n\nCode to audit:\n```{language}\n{code}\n```"
        resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.1)
        return SnippetAnalysisResponse(action="security", language=language, text_result=resp)

    async def _generate_tests(self, code: str, language: str) -> SnippetAnalysisResponse:
        system_prompt = (
            "You are DevMind AI's Test Automation Architect. "
            "Generate a complete, self-contained unit test suite for the provided code:\n"
            "- Use the standard testing framework (pytest for Python, Vitest/Jest for JS/TS, go test for Go)\n"
            "- Include Happy Path tests\n"
            "- Include Edge Cases & Boundary Value tests (null, empty, negative, max limits)\n"
            "- Include Negative / Exception Raising tests\n"
            "- Include Mocking fixtures where appropriate\n"
            "Return complete, runnable test code with clear assertions."
        )
        user_prompt = f"Programming Language: {language}\n\nTarget Code to Test:\n```{language}\n{code}\n```"
        resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.2)
        return SnippetAnalysisResponse(action="generate_tests", language=language, text_result=resp)

    async def _generate_docs(self, code: str, language: str) -> SnippetAnalysisResponse:
        system_prompt = (
            "You are DevMind AI's Principal Technical Documentation Writer. "
            "Generate comprehensive, publication-quality technical documentation for the code:\n"
            "1. Overview & Module Purpose\n"
            "2. API & Function Reference (Parameters, Return Types, Exceptions)\n"
            "3. Code Examples & Usage Patterns\n"
            "4. Edge Cases and Configuration Flags\n"
            "Format in pristine GitHub-flavored Markdown."
        )
        user_prompt = f"Programming Language: {language}\n\nCode to document:\n```{language}\n{code}\n```"
        resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.2)
        return SnippetAnalysisResponse(action="generate_docs", language=language, text_result=resp)

    async def _generate_code(self, code: str, language: str, prompt: Optional[str]) -> SnippetAnalysisResponse:
        user_goal = prompt or "Refactor and extend this code with robust production error handling and modularity."
        system_prompt = (
            "You are DevMind AI's Principal Software Engineer. "
            f"User Goal: {user_goal}\n"
            "Generate clean, robust, production-quality code. Include type annotations and docstrings."
        )
        user_prompt = f"Programming Language: {language}\n\nExisting Code:\n```{language}\n{code}\n```\n\nInstructions: {user_goal}"
        resp = await llm_provider.generate_completion(system_prompt, user_prompt, temperature=0.2)
        return SnippetAnalysisResponse(action="generate_code", language=language, text_result=resp)

snippet_service = SnippetService()

