import os
import zipfile
from typing import List, Tuple
from fastapi import HTTPException, UploadFile, status

# Blacklisted directory names to skip during indexing and analysis
IGNORED_DIRS = {
    ".git", ".svn", ".hg", "node_modules", "venv", ".venv", "env", ".env",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    "build", "dist", "out", ".next", ".nuxt", "target", "bin", "obj",
    ".idea", ".vscode", ".DS_Store"
}

# Blacklisted file extensions to ignore (binaries, archives, lockfiles, heavy assets)
IGNORED_EXTENSIONS = {
    ".exe", ".dll", ".so", ".dylib", ".bin", ".iso", ".img",
    ".pyc", ".pyo", ".pyd", ".class", ".jar", ".war",
    ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".mp4", ".mp3",
    ".pdf", ".docx", ".xlsx",
    ".min.js", ".min.css", ".map"
}

def is_path_safe(base_dir: str, target_path: str) -> bool:
    """Check if target_path is within base_dir to avoid Zip Slip."""
    base_dir = os.path.abspath(base_dir)
    target_path = os.path.abspath(target_path)
    return os.path.commonpath([base_dir, target_path]) == base_dir

def validate_and_extract_zip(zip_file_path: str, extract_to_dir: str, max_size_bytes: int = 50 * 1024 * 1024) -> Tuple[bool, str, int]:
    """
    Safely extract a ZIP archive while preventing Zip Slip path traversal and bomb attacks.
    Returns: (success: bool, message: str, total_extracted_files: int)
    """
    os.makedirs(extract_to_dir, exist_ok=True)
    
    if not zipfile.is_zipfile(zip_file_path):
        return False, "File is not a valid ZIP archive", 0
    
    total_uncompressed_size = 0
    extracted_count = 0

    with zipfile.ZipFile(zip_file_path, 'r') as archive:
        for member in archive.infolist():
            # Check for zip bomb size limits
            total_uncompressed_size += member.file_size
            if total_uncompressed_size > max_size_bytes * 5:  # max 250MB uncompressed ratio
                return False, "Uncompressed archive size exceeds maximum safety limit", 0
            
            # Prevent zip slip path traversal
            target_path = os.path.join(extract_to_dir, member.filename)
            if not is_path_safe(extract_to_dir, target_path):
                return False, f"Dangerous path traversal detected in file: {member.filename}", 0

        # Now extract safe entries
        for member in archive.infolist():
            target_path = os.path.join(extract_to_dir, member.filename)
            # Skip if any path part is in IGNORED_DIRS
            parts = os.path.normpath(member.filename).split(os.sep)
            if any(part in IGNORED_DIRS for part in parts):
                continue

            if member.is_dir():
                os.makedirs(target_path, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                with archive.open(member) as source, open(target_path, "wb") as target:
                    target.write(source.read())
                extracted_count += 1

    return True, "Archive extracted safely", extracted_count
