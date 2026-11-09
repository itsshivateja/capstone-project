import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

class BugReport(Base):
    __tablename__ = "bug_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    line_number = Column(Integer, nullable=True)
    severity = Column(String(20), nullable=False)  # Critical, High, Medium, Low
    category = Column(String(100), default="Code Quality")  # Security, Logic, Runtime, Null Safety
    description = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    suggested_fix = Column(Text, nullable=False)
    status = Column(String(20), default="open")  # open, resolved, ignored
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="bug_reports")

class CodeReview(Base):
    __tablename__ = "code_reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=True)
    overall_score = Column(Float, default=8.5)
    summary = Column(Text, nullable=False)
    metrics = Column(JSON, default=dict)  # {"maintainability": 8, "security": 9, "performance": 7}
    findings = Column(JSON, default=list)  # list of finding items
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="code_reviews")

class TestSuite(Base):
    __tablename__ = "test_suites"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    framework = Column(String(50), default="pytest")
    test_code = Column(Text, nullable=False)
    test_cases_summary = Column(JSON, default=list)  # [{"name": "test_empty_input", "type": "edge_case"}]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="test_suites")

class DocumentationArtifact(Base):
    __tablename__ = "documentation_artifacts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)  # 'readme', 'architecture', 'api', 'module'
    title = Column(String(255), nullable=False)
    content_markdown = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="documentation")

