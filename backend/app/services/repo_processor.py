import os
import json
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectFile
from app.utils.zip_security import validate_and_extract_zip, IGNORED_DIRS, IGNORED_EXTENSIONS
from app.utils.code_parser import (
    detect_language, is_text_file, count_lines_and_size, 
    chunk_code_file, parse_python_ast, parse_generic_symbols
)
from app.services.vector_store import vector_store

def detect_frameworks_and_dependencies(root_path: str) -> Tuple[List[str], Dict[str, Any]]:
    frameworks = set()
    dependencies = {}

    for dirpath, dirnames, filenames in os.walk(root_path):
        # Modify dirnames in-place to skip ignored directories
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]

        for fname in filenames:
            full_path = os.path.join(dirpath, fname)
            
            # Python requirements.txt
            if fname.lower() == "requirements.txt":
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            clean = line.strip().split("#")[0].strip()
                            if clean:
                                pkg = clean.split("==")[0].split(">=")[0].split("<=")[0].strip()
                                dependencies[pkg] = clean
                                # Check common frameworks
                                pkg_l = pkg.lower()
                                if "fastapi" in pkg_l: frameworks.add("FastAPI")
                                elif "flask" in pkg_l: frameworks.add("Flask")
                                elif "django" in pkg_l: frameworks.add("Django")
                                elif "torch" in pkg_l: frameworks.add("PyTorch")
                                elif "langchain" in pkg_l: frameworks.add("LangChain")
                                elif "sqlalchemy" in pkg_l: frameworks.add("SQLAlchemy")
                except Exception:
                    pass

            # Node package.json
            elif fname.lower() == "package.json":
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        pkg_json = json.load(f)
                        deps = {**pkg_json.get("dependencies", {}), **pkg_json.get("devDependencies", {})}
                        for dep, ver in deps.items():
                            dependencies[dep] = ver
                            dep_l = dep.lower()
                            if "react" in dep_l: frameworks.add("React")
                            elif "next" in dep_l: frameworks.add("Next.js")
                            elif "express" in dep_l: frameworks.add("Express")
                            elif "vue" in dep_l: frameworks.add("Vue")
                            elif "tailwind" in dep_l: frameworks.add("Tailwind CSS")
                            elif "vite" in dep_l: frameworks.add("Vite")
                except Exception:
                    pass

    return sorted(list(frameworks)), dependencies

def build_file_tree(root_path: str) -> List[Dict[str, Any]]:
    """Build a nested tree representation of the extracted repository."""
    def _scan(current_path: str, relative_root: str) -> List[Dict[str, Any]]:
        nodes = []
        try:
            entries = sorted(os.scandir(current_path), key=lambda e: (not e.is_dir(), e.name.lower()))
            for entry in entries:
                if entry.name in IGNORED_DIRS:
                    continue
                ext = os.path.splitext(entry.name)[1].lower()
                if not entry.is_dir() and ext in IGNORED_EXTENSIONS:
                    continue

                rel_path = os.path.relpath(entry.path, relative_root)
                if entry.is_dir():
                    children = _scan(entry.path, relative_root)
                    nodes.append({
                        "name": entry.name,
                        "path": rel_path,
                        "is_dir": True,
                        "children": children
                    })
                else:
                    lang = detect_language(entry.path)
                    nodes.append({
                        "name": entry.name,
                        "path": rel_path,
                        "is_dir": False,
                        "size": entry.stat().st_size,
                        "language": lang
                    })
        except Exception:
            pass
        return nodes

    return _scan(root_path, root_path)

def process_repository(db: Session, project: Project, zip_path: str) -> bool:
    """
    Core repository ingestion pipeline:
    1. Extract ZIP safely
    2. Scan files & analyze languages
    3. Detect frameworks & dependencies
    4. Chunk code files & compute vector embeddings in Qdrant
    5. Save project metadata in PostgreSQL
    """
    try:
        project.status = "indexing"
        db.commit()

        extract_dir = os.path.join(os.path.dirname(zip_path), f"extracted_{project.id}")
        success, msg, file_count = validate_and_extract_zip(zip_path, extract_dir)
        if not success:
            project.status = "failed"
            project.error_message = msg
            db.commit()
            return False

        project.storage_path = extract_dir
        project.qdrant_collection = f"project_{project.id.replace('-', '_')}"

        # Detect frameworks & dependencies
        frameworks, dependencies = detect_frameworks_and_dependencies(extract_dir)
        project.frameworks = frameworks
        project.dependencies = dependencies

        # Walk through extracted files
        total_files = 0
        total_lines = 0
        lang_line_counts = {}
        all_chunks = []

        # Remove any previous files for this project in DB
        db.query(ProjectFile).filter(ProjectFile.project_id == project.id).delete()

        for dirpath, dirnames, filenames in os.walk(extract_dir):
            dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]

            for fname in filenames:
                ext = os.path.splitext(fname)[1].lower()
                if ext in IGNORED_EXTENSIONS:
                    continue

                full_path = os.path.join(dirpath, fname)
                rel_path = os.path.relpath(full_path, extract_dir)
                is_text = is_text_file(full_path)
                lines, size = count_lines_and_size(full_path) if is_text else (0, os.path.getsize(full_path))
                lang = detect_language(full_path)

                # Record file
                pf = ProjectFile(
                    project_id=project.id,
                    file_path=rel_path,
                    file_name=fname,
                    file_extension=ext,
                    language=lang,
                    size_bytes=size,
                    lines_count=lines,
                    is_binary=not is_text
                )
                db.add(pf)

                if is_text and lines > 0:
                    total_files += 1
                    total_lines += lines
                    lang_line_counts[lang] = lang_line_counts.get(lang, 0) + lines

                    # Chunk code for vector store
                    chunks = chunk_code_file(full_path, rel_path, lang)
                    all_chunks.extend(chunks)

        # Update Project stats
        project.total_files = total_files
        project.total_lines = total_lines
        project.languages = lang_line_counts
        
        if lang_line_counts:
            project.primary_language = max(lang_line_counts, key=lang_line_counts.get)
        else:
            project.primary_language = "General"

        # Index code chunks in Qdrant
        if all_chunks:
            vector_store.index_chunks(project.qdrant_collection, all_chunks)

        project.status = "ready"
        db.commit()
        return True

    except Exception as e:
        db.rollback()
        project.status = "failed"
        project.error_message = str(e)
        db.commit()
        return False

