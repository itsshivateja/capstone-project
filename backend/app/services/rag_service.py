from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.conversation import Conversation, Message
from app.services.vector_store import vector_store
from app.services.llm_provider import llm_provider

RAG_SYSTEM_PROMPT = """You are DevMind AI, an elite AI Software Engineering Assistant.
You have deep expertise in codebase analysis, debugging, architecture, refactoring, and code explanation.

You are answering a developer's question using ACTUAL retrieved code context from their repository.

STRICT GUIDELINES:
1. Always base your response on the provided CODE CONTEXT snippets.
2. Provide precise file paths and line number references whenever available.
3. If the retrieved context is insufficient or the requested feature does not exist in the repository, clearly state that the repository does not contain enough information rather than hallucinating details.
4. Format code blocks using appropriate markdown backticks with language tags.
5. Provide actionable, concise, and production-quality explanations.
"""

class RAGService:
    async def chat_with_repo(
        self,
        db: Session,
        project: Project,
        conversation: Conversation,
        user_message_content: str,
        limit_chunks: int = 5
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Full RAG Pipeline execution:
        1. Vector search relevant code chunks from Qdrant
        2. Format context with source citations
        3. Assemble conversation history
        4. Send to LLM provider
        5. Persist user & assistant messages to DB
        """
        # Step 1 & 2: Vector search
        collection_name = project.qdrant_collection or f"project_{project.id.replace('-', '_')}"
        retrieved_chunks = vector_store.search_similar_chunks(collection_name, user_message_content, limit=limit_chunks)

        # Build context block
        context_parts = []
        source_references = []

        if retrieved_chunks:
            context_parts.append("### RELEVANT CODE CONTEXT FROM REPOSITORY:")
            for chunk in retrieved_chunks:
                source_references.append({
                    "file_path": chunk["file_path"],
                    "start_line": chunk["start_line"],
                    "end_line": chunk["end_line"],
                    "snippet": chunk["snippet"],
                    "score": chunk["score"]
                })
                context_parts.append(
                    f"\n--- File: {chunk['file_path']} (Lines {chunk['start_line']}-{chunk['end_line']}) [{chunk['language']}] ---\n"
                    f"{chunk['full_content']}\n"
                )
        else:
            context_parts.append("### RELEVANT CODE CONTEXT:\n(No matching code chunks found in vector index for this query.)")

        context_str = "\n".join(context_parts)

        # Assemble conversation history (last 5 messages)
        recent_messages = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).limit(6).all()
        recent_messages.reverse()

        history_text = ""
        for m in recent_messages:
            history_text += f"{m.role.upper()}: {m.content}\n"

        prompt_payload = (
            f"{context_str}\n\n"
            f"### CONVERSATION HISTORY:\n{history_text}\n"
            f"USER QUERY:\n{user_message_content}\n\n"
            f"Provide a context-aware answer citing the relevant files and lines:"
        )

        # Call LLM
        answer = await llm_provider.generate_completion(
            system_prompt=RAG_SYSTEM_PROMPT,
            user_prompt=prompt_payload,
            temperature=0.2
        )

        # Persist User Message
        user_msg = Message(
            conversation_id=conversation.id,
            role="user",
            content=user_message_content,
            source_references=[]
        )
        db.add(user_msg)

        # Persist Assistant Message
        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            source_references=source_references
        )
        db.add(assistant_msg)
        db.commit()

        return answer, source_references

rag_service = RAGService()
