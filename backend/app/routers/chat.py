from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.conversation import Conversation, Message
from app.schemas.chat import (
    ConversationCreate, ConversationResponse, MessageCreate, MessageResponse
)
from app.services.auth_service import get_current_user
from app.services.rag_service import rag_service

router = APIRouter(prefix="/chat", tags=["AI Code Chat"])

@router.post("/{project_id}/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    project_id: str,
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    conv = Conversation(
        project_id=project.id,
        user_id=current_user.id,
        title=data.title or "New Chat"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv

@router.get("/{project_id}/conversations", response_model=List[ConversationResponse])
def list_conversations(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Conversation).filter(
        Conversation.project_id == project_id,
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()

@router.get("/{project_id}/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation_details(
    project_id: str,
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.project_id == project_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@router.post("/{project_id}/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_chat_message(
    project_id: str,
    conversation_id: str,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.project_id == project_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Update conversation title if default
    if conv.title == "New Conversation" or conv.title == "New Chat":
        conv.title = data.content[:35] + ("..." if len(data.content) > 35 else "")

    # Execute RAG Pipeline
    answer, sources = await rag_service.chat_with_repo(
        db=db,
        project=project,
        conversation=conv,
        user_message_content=data.content
    )

    # Return the latest assistant message
    latest_msg = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.role == "assistant"
    ).order_by(Message.created_at.desc()).first()

    return latest_msg
