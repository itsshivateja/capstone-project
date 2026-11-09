import os
import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.config import settings
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.llm_provider import llm_provider

router = APIRouter(prefix="/settings", tags=["Settings & Keys"])

class APIKeysPayload(BaseModel):
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

class SettingsStatusResponse(BaseModel):
    groq_configured: bool
    gemini_configured: bool
    openai_configured: bool
    active_provider: str

@router.get("", response_model=SettingsStatusResponse)
def get_settings_status(current_user: User = Depends(get_current_user)):
    return SettingsStatusResponse(
        groq_configured=bool(settings.GROQ_API_KEY),
        gemini_configured=bool(settings.GEMINI_API_KEY),
        openai_configured=bool(settings.OPENAI_API_KEY),
        active_provider="groq" if settings.GROQ_API_KEY else ("gemini" if settings.GEMINI_API_KEY else ("openai" if settings.OPENAI_API_KEY else "autonomous_local"))
    )

@router.post("/keys")
async def update_api_keys(
    payload: APIKeysPayload,
    current_user: User = Depends(get_current_user)
):
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", ".env")
    env_lines = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    env_lines[k.strip()] = v.strip()

    # Update Groq key if provided
    test_message = ""
    if payload.groq_api_key is not None:
        key = payload.groq_api_key.strip()
        settings.GROQ_API_KEY = key
        os.environ["GROQ_API_KEY"] = key
        env_lines["GROQ_API_KEY"] = key

        # Quick validation with Groq API
        if key:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    test_resp = await client.get(
                        "https://api.groq.com/openai/v1/models",
                        headers={"Authorization": f"Bearer {key}"}
                    )
                    if test_resp.status_code == 200:
                        test_message = "Groq API Key verified successfully! LLaMA 3.3 70B is now active."
                    else:
                        test_message = f"Groq key saved, but API returned status {test_resp.status_code}."
            except Exception as e:
                test_message = f"Groq key saved (test call notice: {str(e)})."

    if payload.gemini_api_key is not None:
        key = payload.gemini_api_key.strip()
        settings.GEMINI_API_KEY = key
        os.environ["GEMINI_API_KEY"] = key
        env_lines["GEMINI_API_KEY"] = key

    if payload.openai_api_key is not None:
        key = payload.openai_api_key.strip()
        settings.OPENAI_API_KEY = key
        os.environ["OPENAI_API_KEY"] = key
        env_lines["OPENAI_API_KEY"] = key

    # Write back to backend/.env
    try:
        with open(env_path, "w", encoding="utf-8") as f:
            for k, v in env_lines.items():
                f.write(f"{k}={v}\n")
    except Exception:
        pass

    llm_provider._refresh_keys()

    return {
        "status": "success",
        "message": test_message or "API configuration updated successfully.",
        "active_provider": "groq" if settings.GROQ_API_KEY else "autonomous_local"
    }

