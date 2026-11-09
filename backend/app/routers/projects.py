import io
import os
import re
import shutil
import zipfile
import httpx
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.project import Project, ProjectFile
from app.schemas.project import ProjectCreate, ProjectResponse, RepositoryAnalysisResponse, TreeNode, GitHubImportRequest
from app.services.auth_service import get_current_user
from app.services.repo_processor import process_repository, build_file_tree

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = Project(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        status="ready"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.post("/sample-demo", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_sample_demo_repository(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    1-Click Evaluator Feature:
    Creates a realistic FastAPI E-Commerce & Inventory microservice codebase,
    extracts it, parses AST, indexes chunks into Qdrant, and sets status to ready.
    """
    project = Project(
        user_id=current_user.id,
        name="DevMind Core E-Commerce API",
        description="Production reference FastAPI microservice with inventory, authentication, and SQL models.",
        status="indexing"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # In-memory realistic repository ZIP
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        zf.writestr(
            "app/main.py",
            "from fastapi import FastAPI, Depends\nfrom app.routers import orders, inventory\n\napp = FastAPI(title='Core E-Commerce Service', version='2.4.0')\n\n@app.get('/health')\ndef health_check():\n    return {'status': 'healthy', 'service': 'e-commerce-api'}\n\napp.include_router(orders.router, prefix='/orders')\napp.include_router(inventory.router, prefix='/inventory')\n"
        )
        zf.writestr(
            "app/routers/orders.py",
            "from fastapi import APIRouter, HTTPException\nfrom pydantic import BaseModel\nfrom typing import List\n\nrouter = APIRouter(tags=['Orders'])\n\nclass OrderItem(BaseModel):\n    sku: str\n    quantity: int\n    unit_price: float\n\nclass OrderPayload(BaseModel):\n    customer_id: str\n    items: List[OrderItem]\n\n@router.post('/')\ndef place_order(order: OrderPayload):\n    if not order.items:\n        raise HTTPException(status_code=400, detail='Order items cannot be empty')\n    total = sum(i.quantity * i.unit_price for i in order.items)\n    return {'order_id': 'ord-90210', 'total_amount': total, 'status': 'confirmed'}\n"
        )
        zf.writestr(
            "app/routers/inventory.py",
            "from fastapi import APIRouter\n\nrouter = APIRouter(tags=['Inventory'])\n\n@router.get('/stock/{sku}')\ndef get_sku_stock(sku: str):\n    return {'sku': sku, 'available': 150, 'reserved': 12}\n"
        )
        zf.writestr(
            "app/models/database.py",
            "from sqlalchemy import Column, String, Integer, Float, create_engine\nfrom sqlalchemy.orm import declarative_base\n\nBase = declarative_base()\n\nclass Order(Base):\n    __tablename__ = 'orders'\n    id = Column(String(36), primary_key=True)\n    customer_id = Column(String(50), nullable=False)\n    total_amount = Column(Float, default=0.0)\n"
        )
        zf.writestr(
            "app/utils/security_audit_test.py",
            "# Security Test Module (Contains intentional vulnerability patterns for DevMind Auditor)\napi_key = 'sk_live_production_99812739210'\n\ndef legacy_find_user(user_id):\n    # SQL injection vulnerability for testing\n    query = f'SELECT * FROM users WHERE id = {user_id}'\n    return query\n"
        )
        zf.writestr(
            "tests/test_orders.py",
            "import pytest\nfrom fastapi.testclient import TestClient\nfrom app.main import app\n\nclient = TestClient(app)\n\ndef test_health():\n    res = client.get('/health')\n    assert res.status_code == 200\n    assert res.json()['status'] == 'healthy'\n\ndef test_place_empty_order():\n    res = client.post('/orders/', json={'customer_id': 'cust-1', 'items': []})\n    assert res.status_code == 400\n"
        )
        zf.writestr(
            "requirements.txt",
            "fastapi>=0.110.0\nuvicorn>=0.28.0\nsqlalchemy>=2.0.0\npydantic>=2.6.0\npytest>=8.0.0\nhttpx>=0.27.0\n"
        )
        zf.writestr(
            "README.md",
            "# Core E-Commerce API Service\n\nHigh-performance order checkout and inventory management microservice built with FastAPI and SQLAlchemy.\n\n## Setup\n```bash\npip install -r requirements.txt\nuvicorn app.main:app --reload\n```\n"
        )

    zip_buf.seek(0)
    upload_dir = os.path.join(settings.UPLOAD_DIR, project.id)
    os.makedirs(upload_dir, exist_ok=True)
    zip_dest = os.path.join(upload_dir, "sample_repo.zip")
    with open(zip_dest, "wb") as f:
        f.write(zip_buf.getvalue())

    process_repository(db, project, zip_dest)
    db.refresh(project)
    return project

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.created_at.desc()).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Remove files on disk
    if project.storage_path and os.path.exists(project.storage_path):
        try:
            shutil.rmtree(project.storage_path, ignore_errors=True)
            upload_dir = os.path.dirname(project.storage_path)
            shutil.rmtree(upload_dir, ignore_errors=True)
        except Exception:
            pass

    db.delete(project)
    db.commit()
    return None

@router.post("/{project_id}/upload-zip", response_model=ProjectResponse)
async def upload_project_zip(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are supported")

    project_upload_dir = os.path.join(settings.UPLOAD_DIR, project.id)
    os.makedirs(project_upload_dir, exist_ok=True)
    zip_dest_path = os.path.join(project_upload_dir, file.filename)

    total_bytes = 0
    with open(zip_dest_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            total_bytes += len(chunk)
            if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                os.remove(zip_dest_path)
                raise HTTPException(status_code=400, detail="File size exceeds maximum 50MB limit")
            buffer.write(chunk)

    process_repository(db, project, zip_dest_path)
    db.refresh(project)
    return project

@router.post("/{project_id}/import-github", response_model=ProjectResponse)
async def import_github_repository(
    project_id: str,
    req: GitHubImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Parse GitHub owner/repo from URL
    match = re.search(r"github\.com/([^/]+)/([^/]+?)(?:\.git|/)?$", req.github_url.strip())
    if not match:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL format. Expected: https://github.com/owner/repository")

    owner, repo = match.group(1), match.group(2)
    zip_urls = [
        f"https://github.com/{owner}/{repo}/archive/refs/heads/main.zip",
        f"https://github.com/{owner}/{repo}/archive/refs/heads/master.zip",
        f"https://api.github.com/repos/{owner}/{repo}/zipball/HEAD"
    ]

    project_upload_dir = os.path.join(settings.UPLOAD_DIR, project.id)
    os.makedirs(project_upload_dir, exist_ok=True)
    zip_dest_path = os.path.join(project_upload_dir, f"{repo}.zip")

    downloaded = False
    async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
        for url in zip_urls:
            try:
                headers = {"User-Agent": "DevMind-AI-Assistant"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200 and len(resp.content) > 100:
                    with open(zip_dest_path, "wb") as f:
                        f.write(resp.content)
                    downloaded = True
                    break
            except Exception:
                continue

    if not downloaded:
        raise HTTPException(status_code=400, detail=f"Failed to fetch public repository from GitHub for {owner}/{repo}")

    process_repository(db, project, zip_dest_path)
    db.refresh(project)
    return project

@router.get("/{project_id}/analysis", response_model=RepositoryAnalysisResponse)
def get_project_analysis(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_tree = []
    if project.storage_path and os.path.exists(project.storage_path):
        file_tree = build_file_tree(project.storage_path)

    summary = (
        f"Repository '{project.name}' contains {project.total_files} files "
        f"spanning {project.total_lines:,} lines of code. "
        f"Primary language is {project.primary_language}. "
        f"Detected frameworks: {', '.join(project.frameworks) if project.frameworks else 'None'}."
    )

    return RepositoryAnalysisResponse(
        project_id=project.id,
        total_files=project.total_files,
        total_lines=project.total_lines,
        primary_language=project.primary_language,
        languages=project.languages or {},
        frameworks=project.frameworks or [],
        dependencies=project.dependencies or {},
        file_tree=file_tree,
        summary=summary
    )
