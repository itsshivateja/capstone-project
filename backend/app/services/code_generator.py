import difflib
import os
from typing import Dict, Any, List, Optional
from app.models.project import Project
from app.services.vector_store import vector_store
from app.services.llm_provider import llm_provider

CODEGEN_SYSTEM_PROMPT = """You are AURON AI Code Generator, an expert software engineer.
Generate production-ready, clean, idiomatic code that matches the project's architecture, dependencies, and style.

Provide your response strictly in the following format:
```
EXPLANATION:
<A concise 2-3 sentence overview of what was built or modified>

AFFECTED_FILES:
<comma-separated list of affected or new files>

CODE:
<The complete, functional source code with appropriate typing and error handling>
```
"""

class CodeGeneratorService:
    async def generate_code(
        self,
        project: Project,
        prompt: str,
        target_file: Optional[str] = None
    ) -> Dict[str, Any]:
        collection_name = project.qdrant_collection or f"project_{project.id.replace('-', '_')}"
        retrieved = vector_store.search_similar_chunks(collection_name, prompt, limit=3)
        
        context_str = ""
        for chunk in retrieved:
            context_str += f"\nFile: {chunk['file_path']}\n{chunk['snippet']}\n"

        existing_file_content = ""
        if target_file and project.storage_path:
            full_path = os.path.join(project.storage_path, target_file)
            if os.path.exists(full_path):
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        existing_file_content = f.read()
                except Exception:
                    pass

        user_prompt = (
            f"PROJECT PRIMARY LANGUAGE: {project.primary_language}\n"
            f"FRAMEWORKS: {', '.join(project.frameworks or [])}\n"
            f"EXISTING RELEVANT CODE:\n{context_str}\n"
        )
        if existing_file_content:
            user_prompt += f"TARGET FILE CURRENT CONTENT ({target_file}):\n```\n{existing_file_content[:1500]}\n```\n"

        user_prompt += f"\nDEVELOPER FEATURE REQUEST:\n{prompt}\n"

        response_text = await llm_provider.generate_completion(
            system_prompt=CODEGEN_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2
        )

        # Parse sections
        explanation = "Generated code based on repository patterns."
        affected_files = [target_file] if target_file else ["generated_module.py"]
        generated_code = ""

        if "EXPLANATION:" in response_text and "CODE:" in response_text:
            try:
                parts = response_text.split("EXPLANATION:")[1]
                exp_part, rest = parts.split("AFFECTED_FILES:")
                explanation = exp_part.strip()
                files_part, code_part = rest.split("CODE:")
                affected_files = [f.strip() for f in files_part.strip().split(",") if f.strip()]
                generated_code = code_part.strip()
                # Clean markdown fencing if wrapped
                if generated_code.startswith("```"):
                    lines = generated_code.split("\n")
                    if lines[0].startswith("```"): lines = lines[1:]
                    if lines and lines[-1].startswith("```"): lines = lines[:-1]
                    generated_code = "\n".join(lines)
            except Exception:
                generated_code = response_text
        else:
            generated_code = response_text

        # Compute diff if target file exists
        diff_preview = ""
        if existing_file_content and generated_code:
            diff_lines = list(difflib.unified_diff(
                existing_file_content.splitlines(keepends=True),
                generated_code.splitlines(keepends=True),
                fromfile=f"a/{target_file}",
                tofile=f"b/{target_file}"
            ))
            diff_preview = "".join(diff_lines)

        return {
            "generated_code": generated_code,
            "explanation": explanation,
            "target_file": target_file or (affected_files[0] if affected_files else "generated_file.py"),
            "diff_preview": diff_preview,
            "affected_files": affected_files
        }

code_generator = CodeGeneratorService()

