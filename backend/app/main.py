from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all models are registered

# Ensure tables exist immediately
Base.metadata.create_all(bind=engine)

# Routers
from app.routers import (
    auth,
    projects,
    repository,
    chat,
    bug_detection,
    code_generation,
    code_review,
    test_generation,
    documentation,
    dashboard,
    agents,
    settings as app_settings,
    snippet
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print(f"[DevMind AI] System initialized with database: {settings.DATABASE_URL}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="DevMind AI – AI-Powered Software Engineering Assistant API",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api/v1
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(projects.router, prefix=settings.API_V1_PREFIX)
app.include_router(repository.router, prefix=settings.API_V1_PREFIX)
app.include_router(chat.router, prefix=settings.API_V1_PREFIX)
app.include_router(bug_detection.router, prefix=settings.API_V1_PREFIX)
app.include_router(code_generation.router, prefix=settings.API_V1_PREFIX)
app.include_router(code_review.router, prefix=settings.API_V1_PREFIX)
app.include_router(test_generation.router, prefix=settings.API_V1_PREFIX)
app.include_router(documentation.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(agents.router, prefix=settings.API_V1_PREFIX)
app.include_router(app_settings.router, prefix=settings.API_V1_PREFIX)
app.include_router(snippet.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": "connected",
        "llm_provider": settings.LLM_PROVIDER
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
