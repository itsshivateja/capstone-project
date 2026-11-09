import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_workflow():
    import uuid
    rand_suffix = str(uuid.uuid4())[:8]
    email = f"dev_{rand_suffix}@devmind.ai"
    username = f"dev_{rand_suffix}"
    password = "DevPassword123!"

    # 1. Register
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "username": username,
        "password": password,
        "full_name": "Test Senior Engineer"
    })
    assert reg_resp.status_code == 201, reg_resp.text
    data = reg_resp.json()
    assert "access_token" in data
    token = data["access_token"]

    # 2. Login
    login_resp = client.post("/api/v1/auth/login", json={
        "username_or_email": username,
        "password": password
    })
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # 3. Get /me
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

def test_project_and_repo_ingestion():
    import uuid
    token_resp = client.post("/api/v1/auth/register", json={
        "email": f"project_tester_{uuid.uuid4().hex[:6]}@devmind.ai",
        "username": f"proj_user_{uuid.uuid4().hex[:6]}",
        "password": "Password123!",
        "full_name": "Project Tester"
    })
    token = token_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Project
    p_resp = client.post("/api/v1/projects", json={
        "name": "E-Commerce Core API",
        "description": "FastAPI e-commerce microservice with inventory"
    }, headers=headers)
    assert p_resp.status_code == 201
    project_id = p_resp.json()["id"]

    # 2. Create in-memory test ZIP repo
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("app/main.py", "from fastapi import FastAPI\napp = FastAPI()\n\n@app.get('/')\ndef index():\n    return {'status': 'ok'}\n")
        zf.writestr("app/models.py", "class Product:\n    def __init__(self, id, name):\n        self.id = id\n        self.name = name\n")
        zf.writestr("app/insecure.py", "api_key = 'sk_live_secret12345678'\ndef bad_query(id):\n    return f'SELECT * FROM users WHERE id={id}'\n")
        zf.writestr("requirements.txt", "fastapi==0.110.0\nuvicorn==0.28.0\n")
        zf.writestr("README.md", "# E-Commerce API\nSample microservice.\n")

    zip_buffer.seek(0)

    # 3. Upload ZIP
    upload_resp = client.post(
        f"/api/v1/projects/{project_id}/upload-zip",
        files={"file": ("repo.zip", zip_buffer.getvalue(), "application/zip")},
        headers=headers
    )
    assert upload_resp.status_code == 200
    uploaded_data = upload_resp.json()
    assert uploaded_data["total_files"] >= 3
    assert uploaded_data["status"] == "ready"
    assert "FastAPI" in uploaded_data["frameworks"]

    # 4. Check File Tree
    tree_resp = client.get(f"/api/v1/repository/{project_id}/tree", headers=headers)
    assert tree_resp.status_code == 200
    tree = tree_resp.json()
    assert len(tree) > 0

    # 5. Check File Content
    file_resp = client.get(f"/api/v1/repository/{project_id}/file?path=app/main.py", headers=headers)
    assert file_resp.status_code == 200
    assert "FastAPI" in file_resp.json()["content"]

    # 6. Test AI Bug Detection
    bug_resp = client.post(f"/api/v1/bugs/{project_id}/analyze", json={}, headers=headers)
    assert bug_resp.status_code == 200
    bugs = bug_resp.json()
    assert len(bugs) >= 1  # Should find the hardcoded secret / bad query

    # 7. Test AI Code Generation
    gen_resp = client.post(f"/api/v1/generate/{project_id}", json={
        "prompt": "Create an endpoint to get product by id",
        "target_file": "app/main.py"
    }, headers=headers)
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert "generated_code" in gen_data

    # 8. Test AI Code Review
    rev_resp = client.post(f"/api/v1/review/{project_id}", json={}, headers=headers)
    assert rev_resp.status_code == 200
    rev_data = rev_resp.json()
    assert "overall_score" in rev_data

    # 9. Test Test Generation
    test_gen_resp = client.post(f"/api/v1/tests/{project_id}/generate", json={
        "file_path": "app/main.py",
        "framework": "pytest"
    }, headers=headers)
    assert test_gen_resp.status_code == 200
    test_suite = test_gen_resp.json()
    assert "pytest" in test_suite["test_code"]

    # 10. Test Documentation Generation
    doc_resp = client.post(f"/api/v1/docs/{project_id}/generate", json={
        "doc_type": "readme",
        "title": "Generated System README"
    }, headers=headers)
    assert doc_resp.status_code == 200
    doc_data = doc_resp.json()
    assert "content_markdown" in doc_data

    # 11. Test AI RAG Chat
    conv_resp = client.post(f"/api/v1/chat/{project_id}/conversations", json={
        "title": "Architecture Chat",
        "project_id": project_id
    }, headers=headers)
    assert conv_resp.status_code == 201
    conv_id = conv_resp.json()["id"]

    msg_resp = client.post(f"/api/v1/chat/{project_id}/conversations/{conv_id}/messages", json={
        "content": "Where is the FastAPI app initialized in this codebase?"
    }, headers=headers)
    assert msg_resp.status_code == 200
    msg_data = msg_resp.json()
    assert msg_data["role"] == "assistant"
    assert len(msg_data["content"]) > 10

    # 12. Check Dashboard Stats
    dash_resp = client.get("/api/v1/dashboard/stats", headers=headers)
    assert dash_resp.status_code == 200
    stats = dash_resp.json()
    assert stats["total_projects"] >= 1
    assert stats["total_bugs"] >= 1
    assert stats["total_conversations"] >= 1
