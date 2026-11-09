import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    storage_path = Column(String(500), nullable=True)
    total_files = Column(Integer, default=0)
    total_lines = Column(Integer, default=0)
    primary_language = Column(String(100), default="Unknown")
    languages = Column(JSON, default=dict)  # {"Python": 1200, "TypeScript": 450}
    frameworks = Column(JSON, default=list)  # ["FastAPI", "React"]
    dependencies = Column(JSON, default=dict)  # {"fastapi": "0.110.0"}
    qdrant_collection = Column(String(150), nullable=True)
    status = Column(String(50), default="ready")  # 'uploaded', 'indexing', 'ready', 'failed'
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="projects")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="project", cascade="all, delete-orphan")
    bug_reports = relationship("BugReport", back_populates="project", cascade="all, delete-orphan")
    code_reviews = relationship("CodeReview", back_populates="project", cascade="all, delete-orphan")
    test_suites = relationship("TestSuite", back_populates="project", cascade="all, delete-orphan")
    documentation = relationship("DocumentationArtifact", back_populates="project", cascade="all, delete-orphan")

class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)  # relative to project root
    file_name = Column(String(255), nullable=False)
    file_extension = Column(String(50), nullable=True)
    language = Column(String(100), default="Text")
    size_bytes = Column(Integer, default=0)
    lines_count = Column(Integer, default=0)
    is_binary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="files")
