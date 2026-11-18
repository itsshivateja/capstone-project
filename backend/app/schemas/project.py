from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None

class GitHubImportRequest(BaseModel):
    github_url: str = Field(..., description="e.g. https://github.com/fastapi/fastapi")
    github_token: Optional[str] = Field(default=None, description="Optional GitHub Personal Access Token for private repositories or higher rate limits")

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    total_files: int = 0
    total_lines: int = 0
    primary_language: str = "Unknown"
    languages: Dict[str, Any] = {}
    frameworks: List[str] = []
    dependencies: Dict[str, Any] = {}
    status: str = "ready"
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectFileResponse(BaseModel):
    id: str
    project_id: str
    file_path: str
    file_name: str
    file_extension: Optional[str] = None
    language: str = "Text"
    size_bytes: int = 0
    lines_count: int = 0
    is_binary: bool = False

    model_config = ConfigDict(from_attributes=True)

class ProjectFileDetail(ProjectFileResponse):
    content: Optional[str] = None

class TreeNode(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: Optional[int] = 0
    language: Optional[str] = None
    children: Optional[List['TreeNode']] = None

TreeNode.model_rebuild()

class RepositoryAnalysisResponse(BaseModel):
    project_id: str
    total_files: int
    total_lines: int
    primary_language: str
    languages: Dict[str, Any]
    frameworks: List[str]
    dependencies: Dict[str, Any]
    file_tree: List[TreeNode]
    summary: str
