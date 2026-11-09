# DevMind AI – AI-Powered Software Engineering Assistant

![DevMind AI Architecture](https://img.shields.io/badge/Architecture-RAG%20%2B%20AST%20%2B%20FastAPI%20%2B%20React-blue)
![Python](https://img.shields.io/badge/Python-3.11%2B-green)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-teal)
![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20TS-cyan)
![Vector DB](https://img.shields.io/badge/Vector%20DB-Qdrant-red)
![License](https://img.shields.io/badge/License-MIT-purple)

**DevMind AI** is a production-quality, full-stack AI software engineering assistant designed to ingest, parse, vector-index, and reason over complete software repositories. Inspired by professional developer environments like Cursor AI and GitHub Copilot, DevMind AI pairs an AST-aware code intelligence engine with a Qdrant-backed RAG pipeline to provide context-aware chat, automated vulnerability detection, live Monaco code generation & diffing, multi-dimensional code reviews, automated unit test generation, and technical documentation synthesis.

---

## 1. Key Capabilities & Engineering Features

- **Repository Ingestion & Path Traversal Protection**:
  - Secure ZIP extraction with canonical path validation (`os.path.commonpath`) mitigating Zip Slip vulnerabilities.
  - Automatically filters build directories (`node_modules`, `.git`, `venv`, `dist`, binaries).
- **AST Parsing & Syntax-Aware Chunking**:
  - Parses Python AST for classes, functions, and imports.
  - Chunks source code with line-start and line-end tracking for exact citation attribution.
- **Qdrant Vector Database Integration**:
  - Automatically stores normalized 384-dimensional code embeddings in dedicated project collections.
  - Supports both local persistent/in-memory mode and distributed remote Qdrant instances.
- **RAG-Powered AI Code Chat**:
  - Query expansion, vector similarity retrieval, prompt assembly, and citation pills.
  - Cites exact file paths and line number spans (`L10-L45`).
- **AI Bug & Vulnerability Detection**:
  - Multi-tiered audit combining regex-based static security rules (hardcoded credentials, SQL injection, command execution, bare excepts) and LLM semantic reasoning.
  - Severity classification (Critical, High, Medium, Low) with actionable mitigation snippets.
- **AI Code Generation & Live Monaco Diff Viewer**:
  - Natural language prompt to production code with unified diff calculation.
  - Preview, download, or apply directly to project files with approval workflows.
- **Automated Architecture Code Review**:
  - Scored rubric (0-10) across Maintainability, Security, Performance, and Code Style.
- **Automated Pytest Test Suite Generation**:
  - Generates positive happy paths, negative error tests, edge boundary tests, and mock fixtures.
- **Technical Documentation Generator**:
  - Generates `README.md`, Architecture Specifications, API references, and Module breakdowns.
- **Interactive Dark SaaS Developer UI**:
  - Monaco code editor, Lucide React icons, live project switcher, and real-time dashboard telemetry.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS (Professional Developer Dark Theme)
- **Editor**: `@monaco-editor/react` (VS Code engine with Diff viewing)
- **Icons & Routing**: Lucide React, React Router v6, Axios

### Backend
- **Framework**: Python FastAPI (Async ASGI)
- **Validation**: Pydantic v2
- **ORM & DB**: SQLAlchemy with PostgreSQL & SQLite dynamic fallback
- **Authentication**: JWT (HS256) + bcrypt password hashing

### AI & Vector Storage
- **Vector DB**: Qdrant (`qdrant-client`)
- **RAG Pipeline**: Custom AST-guided chunker with cosine similarity search
- **LLM Provider**: Configurable adapter supporting Google Gemini, OpenAI, Groq, and built-in semantic fallback

---

## 3. Project Directory Structure

```text
capstone_project/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy Models (User, Project, Conversation, BugReport, etc.)
│   │   ├── schemas/       # Pydantic Schemas (Auth, Projects, Chat, AI Features)
│   │   ├── routers/       # FastAPI Routers (Auth, Projects, Repository, Chat, Bugs, etc.)
│   │   ├── services/      # RAG Pipeline, Vector Store, LLM Provider, AST Processor
│   │   ├── utils/         # Zip Security, Code Parser, JWT Security
│   │   ├── config.py      # Pydantic BaseSettings
│   │   ├── database.py    # SQLAlchemy Engine & Session
│   │   └── main.py        # FastAPI Application Entry
│   ├── tests/             # Pytest Backend Integration Tests
│   ├── requirements.txt   # Python Dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # MonacoEditor, Layout, Header, Sidebar, Spinners
│   │   ├── context/       # AuthContext, ProjectContext
│   │   ├── pages/         # Dashboard, Projects, RepoExplorer, AIChat, BugDetection, etc.
│   │   ├── services/      # Axios API Integrations
│   │   └── types/         # TypeScript Interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml     # PostgreSQL + Qdrant + Backend + Frontend
├── .env.example
└── README.md
```

---

## 4. Local Quickstart (Without Docker)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Step 1: Start Backend (Terminal 1)
```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend API server
uvicorn app.main:app --reload --port 8000
```
- API server will be available at: `http://localhost:8000`
- Interactive Swagger docs at: `http://localhost:8000/docs`

### Step 2: Start Frontend (Terminal 2)
```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```
- Frontend application will be available at: `http://localhost:5173`

---

## 5. Docker Compose Deployment

To deploy the entire production stack (PostgreSQL, Qdrant, FastAPI backend, and Nginx frontend) in isolated containers:

```bash
docker compose up --build -d
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/docs`
- Qdrant Dashboard: `http://localhost:6333/dashboard`

---

## 6. Running Automated Tests

Run the full integration test suite covering user authentication, ZIP repository upload, AST parsing, Qdrant indexing, bug scans, and RAG chat:

```bash
cd backend
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

Expected output:
```text
tests/test_api.py::test_health_check PASSED [ 33%]
tests/test_api.py::test_auth_workflow PASSED [ 66%]
tests/test_api.py::test_project_and_repo_ingestion PASSED [100%]
=================== 3 passed in 3.44s ===================
```

---

## 7. Security & Sandboxing Architecture

1. **Path Traversal Isolation**: ZIP entry destinations are checked against canonical targets using `os.path.commonpath`.
2. **Zero Direct Code Execution**: Uploaded source code is strictly treated as passive text and AST nodes; it is never executed on the host server.
3. **Password Security**: Passwords hashed with salted bcrypt (`bcrypt.gensalt()`).
4. **Isolated Vector Scoping**: Every Qdrant vector collection and database query is isolated by user identity and project ID.

