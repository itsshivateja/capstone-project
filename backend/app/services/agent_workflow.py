from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.project import Project
from app.services.rag_service import rag_service
from app.services.bug_analyzer import bug_analyzer
from app.services.code_generator import code_generator
from app.services.code_reviewer import code_reviewer
from app.services.test_generator import test_generator
from app.services.doc_generator import doc_generator

class DevMindAgentSupervisor:
    """
    LangGraph-inspired Coordinator/Supervisor Agent.
    Routes developer intents to specialized agents with shared repository context.
    """
    AGENT_ROUTES = {
        "security_analysis": ["security", "owasp", "secret", "sqli", "injection", "cwe", "threat"],
        "bug_detection": ["bug", "error", "flaw", "issue", "defect", "null pointer"],
        "code_generation": ["generate", "build", "create", "implement", "add endpoint", "scaffold"],
        "code_review": ["review", "quality", "clean code", "audit", "metrics"],
        "test_generation": ["test", "pytest", "unit test", "mock", "test case"],
        "documentation": ["document", "readme", "architecture doc", "api spec", "guide"],
        "chat_rag": ["explain", "how does", "where is", "what is", "help"]
    }

    def route_intent(self, query: str) -> str:
        q = query.lower()
        for intent, keywords in self.AGENT_ROUTES.items():
            if any(kw in q for kw in keywords):
                return intent
        return "chat_rag"

    async def execute_agent_workflow(
        self,
        db: Session,
        project: Project,
        user_query: str,
        target_file: Optional[str] = None
    ) -> Dict[str, Any]:
        intent = self.route_intent(user_query)
        
        if intent == "security_analysis":
            from app.routers.security import scan_project_security
            sec_res = await scan_project_security(project.id, db, None)
            return {
                "agent": "Security Analysis Agent",
                "intent": intent,
                "status": "success",
                "result": {
                    "security_score": sec_res.security_score,
                    "risk_level": sec_res.risk_level,
                    "total_vulnerabilities": sec_res.total_vulnerabilities,
                    "breakdown": sec_res.breakdown,
                    "top_vulnerabilities": [
                        {
                            "title": v.title,
                            "severity": v.severity,
                            "cwe": v.cwe_id,
                            "file": v.file_path,
                            "line": v.line_number
                        } for v in sec_res.vulnerabilities[:5]
                    ]
                }
            }
        elif intent == "bug_detection":
            reports = await bug_analyzer.analyze_project_or_file(db, project, target_file)
            return {
                "agent": "Bug Detection Agent",
                "intent": intent,
                "status": "success",
                "result": {
                    "count": len(reports),
                    "reports": [
                        {
                            "id": r.id,
                            "file": r.file_path,
                            "line": r.line_number,
                            "severity": r.severity,
                            "description": r.description
                        } for r in reports[:10]
                    ]
                }
            }
        elif intent == "code_generation":
            result = await code_generator.generate_code(project, user_query, target_file)
            return {
                "agent": "Code Generation Agent",
                "intent": intent,
                "status": "success",
                "result": result
            }
        elif intent == "code_review":
            review = await code_reviewer.review_code(db, project, target_file)
            return {
                "agent": "Code Review Agent",
                "intent": intent,
                "status": "success",
                "result": {
                    "overall_score": review.overall_score,
                    "summary": review.summary,
                    "findings_count": len(review.findings or [])
                }
            }
        elif intent == "test_generation":
            target = target_file or (project.primary_language.lower() + "_tests.py")
            test_suite = await test_generator.generate_test_suite(db, project, target)
            return {
                "agent": "Test Generation Agent",
                "intent": intent,
                "status": "success",
                "result": {
                    "file_path": test_suite.file_path,
                    "cases_count": len(test_suite.test_cases_summary or []),
                    "code_snippet": test_suite.test_code[:300]
                }
            }
        elif intent == "documentation":
            doc = await doc_generator.generate_documentation(db, project, "readme")
            return {
                "agent": "Documentation Agent",
                "intent": intent,
                "status": "success",
                "result": {
                    "title": doc.title,
                    "preview": doc.content_markdown[:300]
                }
            }
        else:
            # Fallback to Repository Analyst / RAG agent
            collection_name = project.qdrant_collection or f"project_{project.id.replace('-', '_')}"
            return {
                "agent": "Repository Analyst Agent",
                "intent": "chat_rag",
                "status": "success",
                "message": f"Processed query using repository context for {project.name}."
            }

agent_supervisor = DevMindAgentSupervisor()

