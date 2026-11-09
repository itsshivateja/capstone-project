import ast
import re
import os
from typing import List, Dict, Any, Tuple

EXTENSION_LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "React JSX",
    ".ts": "TypeScript",
    ".tsx": "React TSX",
    ".java": "Java",
    ".c": "C",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".h": "C/C++ Header",
    ".hpp": "C++ Header",
    ".go": "Go",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".md": "Markdown",
    ".markdown": "Markdown",
    ".sql": "SQL",
    ".sh": "Shell",
    ".bash": "Shell",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".xml": "XML",
}

def detect_language(file_path: str) -> str:
    base_name = os.path.basename(file_path).lower()
    if base_name == "dockerfile":
        return "Dockerfile"
    if base_name in ("makefile", "gnumakefile"):
        return "Makefile"
    
    ext = os.path.splitext(file_path)[1].lower()
    return EXTENSION_LANGUAGE_MAP.get(ext, "Plain Text")

def is_text_file(file_path: str) -> bool:
    try:
        with open(file_path, "tr", encoding="utf-8") as check_file:
            check_file.read(1024)
            return True
    except Exception:
        return False

def count_lines_and_size(file_path: str) -> Tuple[int, int]:
    try:
        size = os.path.getsize(file_path)
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = sum(1 for _ in f)
        return lines, size
    except Exception:
        return 0, 0

def parse_python_ast(code: str) -> Dict[str, Any]:
    """Parse Python code using AST to extract classes, functions, and imports."""
    result = {
        "classes": [],
        "functions": [],
        "imports": []
    }
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                result["classes"].append({
                    "name": node.name,
                    "lineno": node.lineno,
                    "end_lineno": getattr(node, "end_lineno", node.lineno),
                    "docstring": ast.get_docstring(node) or ""
                })
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                result["functions"].append({
                    "name": node.name,
                    "is_async": isinstance(node, ast.AsyncFunctionDef),
                    "lineno": node.lineno,
                    "end_lineno": getattr(node, "end_lineno", node.lineno),
                    "docstring": ast.get_docstring(node) or ""
                })
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    result["imports"].append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for alias in node.names:
                    result["imports"].append(f"{module}.{alias.name}")
    except Exception:
        pass
    return result

def parse_generic_symbols(code: str, language: str) -> Dict[str, Any]:
    """Fallback symbol extractor for JavaScript, TypeScript, Java, Go, etc."""
    result = {
        "classes": [],
        "functions": [],
        "imports": []
    }
    lines = code.split("\n")
    
    # Simple regex patterns
    fn_pattern = re.compile(r'(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(|def\s+([a-zA-Z0-9_]+)|func\s+([a-zA-Z0-9_]+))')
    class_pattern = re.compile(r'class\s+([a-zA-Z0-9_$]+)')
    import_pattern = re.compile(r'(?:import\s+(?:.*?\s+from\s+)?[\'"]([^\'"]+)[\'"]|import\s+([a-zA-Z0-9_.]+)|require\([\'"]([^\'"]+)[\'"]\))')

    for idx, line in enumerate(lines, start=1):
        line_clean = line.strip()
        fn_match = fn_pattern.search(line_clean)
        if fn_match:
            name = next(g for g in fn_match.groups() if g is not None)
            result["functions"].append({"name": name, "lineno": idx})
        
        cls_match = class_pattern.search(line_clean)
        if cls_match:
            result["classes"].append({"name": cls_match.group(1), "lineno": idx})

        imp_match = import_pattern.search(line_clean)
        if imp_match:
            imp_name = next(g for g in imp_match.groups() if g is not None)
            result["imports"].append(imp_name)

    return result

def chunk_code_file(file_path: str, relative_path: str, language: str, max_chunk_lines: int = 60, overlap_lines: int = 15) -> List[Dict[str, Any]]:
    """
    Split a source code file into overlapping semantic chunks for vector indexing.
    Tracks file_path, start_line, end_line, language, and chunk content.
    """
    chunks = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception:
        return []

    total_lines = len(lines)
    if total_lines == 0:
        return []

    if total_lines <= max_chunk_lines:
        content = "".join(lines)
        chunks.append({
            "file_path": relative_path,
            "start_line": 1,
            "end_line": total_lines,
            "language": language,
            "content": content
        })
        return chunks

    start = 0
    while start < total_lines:
        end = min(start + max_chunk_lines, total_lines)
        chunk_lines = lines[start:end]
        content = "".join(chunk_lines)
        
        chunks.append({
            "file_path": relative_path,
            "start_line": start + 1,
            "end_line": end,
            "language": language,
            "content": content
        })
        
        if end >= total_lines:
            break
        start += (max_chunk_lines - overlap_lines)

    return chunks
