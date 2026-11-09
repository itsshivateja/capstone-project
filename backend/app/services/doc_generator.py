from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectFile
from app.models.analysis import DocumentationArtifact
from app.services.llm_provider import llm_provider

DOC_SYSTEM_PROMPT = """You are a Technical Writer and Lead Software Architect.
Generate clean, comprehensive, professional Markdown technical documentation for the codebase.
Use clear headings, tables, architecture diagrams (Mermaid format if relevant), setup steps, and API/module specifications.
"""

class DocumentationGeneratorService:
    async def generate_documentation(
        self,
        db: Session,
        project: Project,
        doc_type: str = "readme",
        custom_title: str = None
    ) -> DocumentationArtifact:
        # Collect project metadata
        files = db.query(ProjectFile).filter(
            ProjectFile.project_id == project.id,
            ProjectFile.is_binary == False
        ).limit(30).all()
        
        file_list_str = "\n".join([f"- `{f.file_path}` ({f.language}, {f.lines_count} lines)" for f in files])
        
        title = custom_title or f"{project.name} - {doc_type.upper()} Documentation"
        
        prompt = (
            f"PROJECT NAME: {project.name}\n"
            f"DESCRIPTION: {project.description or 'A modern software repository'}\n"
            f"PRIMARY LANGUAGE: {project.primary_language}\n"
            f"LANGUAGES DETECTED: {list(project.languages.keys()) if project.languages else []}\n"
            f"FRAMEWORKS DETECTED: {project.frameworks}\n"
            f"TOTAL FILES: {project.total_files}, TOTAL LINES: {project.total_lines}\n"
            f"KEY FILES IN REPOSITORY:\n{file_list_str}\n\n"
            f"DOCUMENTATION TYPE REQUESTED: {doc_type}\n\n"
            f"Generate a thorough, production-grade {doc_type.upper()} in clean Markdown."
        )

        content_markdown = await llm_provider.generate_completion(
            system_prompt=DOC_SYSTEM_PROMPT,
            user_prompt=prompt,
            temperature=0.2
        )

        doc_record = DocumentationArtifact(
            project_id=project.id,
            doc_type=doc_type,
            title=title,
            content_markdown=content_markdown
        )
        db.add(doc_record)
        db.commit()
        db.refresh(doc_record)
        return doc_record

doc_generator = DocumentationGeneratorService()

