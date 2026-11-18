import re
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.conversation import Conversation, Message
from app.services.vector_store import vector_store
from app.services.llm_provider import llm_provider

RAG_SYSTEM_PROMPT = """You are AURON AI, an elite AI Software Engineering Assistant.
You have deep expertise in codebase analysis, debugging, architecture, refactoring, and code explanation.

You are answering a developer's question using ACTUAL retrieved code context from their repository.

STRICT OPERATIONAL DIRECTIVES:
1. ANSWER ONLY WHAT IS ASKED:
   - Stay strictly focused on the developer's exact prompt. Do NOT generate unrequested extras.
   - When asked "what are bugs" or to "find bugs" or identify errors:
     * List ONLY the identified bugs, defects, and syntax/runtime errors.
     * DO NOT generate unsolicited full-code rewrites or entire rewritten functions (e.g., "### Minimal robust rewrite").
     * DO NOT generate unsolicited test suites or "what to test next" sections unless the user explicitly asked for tests.
     * DO NOT generate conversational filler, boilerplate summaries, or concluding essays ("By addressing...", "In summary...", "I hope this helps...").
2. CONCISE, HIGH-READABILITY FORMATTING:
   - NEVER use wide multi-column Markdown tables (e.g. `| Line | Problem | Why it matters | Suggested fix |`). Tables break and wrap awkwardly in sidebars and narrow chats.
   - Instead, format each bug as a clean, structured block:
     ### 🐛 [Severity: Critical/High/Medium/Low] Bug Name
     - **File & Line**: `file_name.py:L14`
     - **Problem**: 1-2 sentence description of the bug.
     - **Root Cause**: Why it happens under specific inputs.
     - **Recommended Fix**: 1-2 lines showing the exact corrected code.
3. PRECISE REPOSITORY CONTEXT:
   - Always cite exact file paths and line numbers from the provided CODE CONTEXT snippets.
   - If the code has no bugs, state clearly and concisely that no bugs were identified.
4. CODE SNIPPETS:
   - When providing code snippets, include only the necessary lines inside markdown code fences with the language tag. Keep them minimal and focused.
"""

class RAGService:
    def _clean_unsolicited_bug_extras(self, text: str, user_query: str) -> str:
        """
        If the user strictly asked for bugs/errors, strip out any hallucinated
        unsolicited full function rewrites, test suites, or closing boilerplate.
        """
        is_bug_query = bool(re.search(r'\b(bug|error|flaw|issue|defect|vulnerability|problem)\b', user_query, re.IGNORECASE))
        wants_rewrite = bool(re.search(r'\b(rewrite|refactor|fix|correct|replace|solution code)\b', user_query, re.IGNORECASE))
        wants_tests = bool(re.search(r'\b(test|unit test|edge case|coverage)\b', user_query, re.IGNORECASE))

        cleaned = text

        if is_bug_query and not wants_rewrite:
            # Strip unsolicited full rewrite sections
            cleaned = re.sub(r'###\s*(?:Minimal\s+)?(?:robust\s+)?(?:code\s+)?rewrite[\s\S]*?(?=(?:###|$))', '', cleaned, flags=re.IGNORECASE)

        if is_bug_query and not wants_tests:
            # Strip unsolicited "what to test next" sections
            cleaned = re.sub(r'###\s*What to test(?: next)?[\s\S]*?(?=(?:###|$))', '', cleaned, flags=re.IGNORECASE)

        if is_bug_query:
            # Strip trailing conversational boilerplate
            cleaned = re.sub(r'By addressing the [`\'\w\s/-]+(?:risks|errors|defects)[\s\S]*$', '', cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r'In summary,[\s\S]*$', '', cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r'I hope this helps[\s\S]*$', '', cleaned, flags=re.IGNORECASE)

        return cleaned.strip()

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

        # Check for bug identification query
        is_bug_query = bool(re.search(r'\b(bug|error|flaw|issue|defect|vulnerability|problem)\b', user_message_content, re.IGNORECASE))
        has_active_context_file = "[Context File:" in user_message_content

        guidance = "Provide a context-aware answer citing the relevant files and lines."
        if has_active_context_file:
            guidance += " NOTE: The user has provided active editor code under `[Context File: ...]`. Focus your answer primarily on analyzing this active code."
        if is_bug_query:
            guidance += (
                " IMPORTANT: The user is specifically asking about bugs/errors. "
                "List ONLY the identified bugs with their file, line number, severity, root cause, and concise 1-2 line fix. "
                "DO NOT output multi-column markdown tables. DO NOT write full-code rewrites. "
                "DO NOT write 'what to test next' or test cases. DO NOT write conversational conclusions."
            )

        prompt_payload = (
            f"{context_str}\n\n"
            f"### CONVERSATION HISTORY:\n{history_text}\n"
            f"USER QUERY:\n{user_message_content}\n\n"
            f"{guidance}"
        )

        # Call LLM
        raw_answer = await llm_provider.generate_completion(
            system_prompt=RAG_SYSTEM_PROMPT,
            user_prompt=prompt_payload,
            temperature=0.2
        )

        # Clean unsolicited extras if user only asked for bugs
        answer = self._clean_unsolicited_bug_extras(raw_answer, user_message_content)
        if not answer:
            answer = raw_answer

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

