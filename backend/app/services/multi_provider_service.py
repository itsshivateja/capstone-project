import os
import re
import json
import time
import httpx
import asyncio
from typing import Dict, Any, Optional, Tuple, List
from app.config import settings
from app.schemas.snippet import (
    ProviderCodeSolution,
    MultiProviderGenerationResponse
)

# ================= DISTINCT ARCHITECTURAL SYSTEM PROMPTS =================
# 1. Google Gemini: Functional & Modular Style (clean functions, clear return values, reusable)
GEMINI_SYSTEM_PROMPT = (
    "You are Google Gemini's Beginner-Friendly Code Generator.\n"
    "Your architectural philosophy is clean, modular, function-oriented code:\n"
    "- Structure the primary solution inside a clear, well-named function with intuitive parameters and clean return values.\n"
    "- Include a concise demonstration showing how to call the function and print the result.\n"
    "- Make the code run immediately without standard input: use a small example value and print the result. Only call input() when the user explicitly requests interactive input.\n"
    "- Use modern, idiomatic syntax without over-engineering.\n"
    "- Add 1-2 brief comments explaining the function's logic.\n"
    "- Keep the code very clean, elegant, and easy for a beginner to understand and reuse in other files.\n\n"
    "Respond STRICTLY in valid JSON with this exact schema (no markdown formatting around the JSON):\n"
    "{\n"
    '  "code": "<source code string>",\n'
    '  "language": "<language>",\n'
    '  "explanation": "<2-3 sentence simple English explanation highlighting the modular function approach>"\n'
    "}"
)

# 2. Groq (High-Speed LPU): Direct, Ultra-Concise Procedural Script
GROQ_SYSTEM_PROMPT = (
    "You are Groq LPU's Beginner-Friendly Code Generator.\n"
    "Your architectural philosophy is ultra-concise, direct procedural script execution:\n"
    "- Do NOT wrap code in unnecessary functions, classes, or boilerplate unless explicitly requested.\n"
    "- Solve the problem directly in the fewest lines possible using straightforward statements and expressions.\n"
    "- Use clean variable names, simple conditional logic, and modern formatted string printing.\n"
    "- Make the code run immediately without standard input: use a small example value and print the result. Only call input() when the user explicitly requests interactive input.\n"
    "- Prioritize fast, direct execution that a beginner can read and run immediately in 4 to 8 lines.\n\n"
    "Respond STRICTLY in valid JSON with this exact schema (no markdown formatting around the JSON):\n"
    "{\n"
    '  "code": "<source code string>",\n'
    '  "language": "<language>",\n'
    '  "explanation": "<2-3 sentence simple English explanation highlighting the ultra-concise direct script approach>"\n'
    "}"
)

# 3. OpenAI: Runnable, Defensive & User-Friendly Flow
OPENAI_SYSTEM_PROMPT = (
    "You are OpenAI's Beginner-Friendly Code Generator.\n"
    "Your architectural philosophy is immediately runnable code with basic defensive error handling:\n"
    "- Include a small example value and print the result so the code runs without standard input.\n"
    "- Only ask for console input when the user explicitly requests an interactive program.\n"
    "- Include basic, friendly error handling (e.g. try/except block or input check) so beginners learn how to handle invalid inputs safely.\n"
    "- Print clear, descriptive feedback messages informing the user of the result.\n"
    "- Keep the code neat, instructive, and welcoming for someone new to programming.\n\n"
    "Respond STRICTLY in valid JSON with this exact schema (no markdown formatting around the JSON):\n"
    "{\n"
    '  "code": "<source code string>",\n'
    '  "language": "<language>",\n'
    '  "explanation": "<2-3 sentence simple English explanation highlighting the example and defensive validation>"\n'
    "}"
)

class MultiProviderService:
    def __init__(self):
        pass

    def _get_keys(self):
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", ".env")
        env_vars = {}
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if "=" in line and not line.strip().startswith("#"):
                        k, v = line.strip().split("=", 1)
                        env_vars[k.strip()] = v.strip()

        gemini_k = env_vars.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY or ""
        groq_k = env_vars.get("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY or ""
        openai_k = env_vars.get("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY or ""
        openai_base = env_vars.get("OPENAI_API_BASE") or os.getenv("OPENAI_API_BASE") or settings.OPENAI_API_BASE or "https://api.openai.com/v1"

        return {
            "gemini": gemini_k,
            "groq": groq_k,
            "openai": openai_k,
            "openai_base": openai_base,
        }

    def _extract_json_response(self, text: str) -> Optional[Dict[str, Any]]:
        text = text.strip()
        # Direct parse
        try:
            return json.loads(text)
        except Exception:
            pass

        # Match ```json ... ```
        m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if m:
            try:
                return json.loads(m.group(1).strip())
            except Exception:
                pass

        # Match outer { ... }
        m = re.search(r"(\{[\s\S]*\})", text)
        if m:
            try:
                return json.loads(m.group(1).strip())
            except Exception:
                pass

        return None

    def _clean_code(self, code_str: str) -> str:
        s = code_str.strip()
        if s.startswith("```"):
            s = re.sub(r"^```[a-zA-Z]*\n?", "", s)
            s = re.sub(r"\n?```$", "", s).strip()
        return s

    async def _call_gemini(self, prompt: str, target_lang: str, api_key: str) -> ProviderCodeSolution:
        start = time.time()
        provider_name = "Google Gemini API"
        model_candidates = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-1.5-flash"]

        if not api_key or not api_key.strip():
            return ProviderCodeSolution(
                provider="gemini",
                provider_name=provider_name,
                status="error",
                error_message="Gemini API Key is not configured. Add GEMINI_API_KEY in Settings to enable Gemini generation.",
                duration_ms=0.0
            )

        user_msg = f"Target Language: {target_lang}\nUser Goal: {prompt}\n\nPlease generate beginner-friendly code following all simplicity rules."
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"SYSTEM INSTRUCTIONS:\n{GEMINI_SYSTEM_PROMPT}\n\nUSER PROMPT:\n{user_msg}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
            }
        }

        last_error = "Unknown error"
        for model_name in model_candidates:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            continue
                        raw_text = candidates[0]["content"]["parts"][0]["text"]

                        duration = round((time.time() - start) * 1000, 2)
                        parsed = self._extract_json_response(raw_text)
                        if parsed and isinstance(parsed, dict) and "code" in parsed:
                            code_text = self._clean_code(str(parsed["code"]))
                            explanation = str(parsed.get("explanation", "Beginner-friendly code generated by Gemini."))
                        else:
                            code_text = self._clean_code(raw_text)
                            explanation = "Clean beginner-friendly solution generated by Gemini."

                        lines = len(code_text.splitlines())
                        return ProviderCodeSolution(
                            provider="gemini",
                            provider_name=provider_name,
                            status="success",
                            code=code_text,
                            explanation=explanation,
                            model=model_name,
                            duration_ms=duration,
                            line_count=lines
                        )
                    else:
                        try:
                            last_error = resp.json().get("error", {}).get("message")
                        except Exception:
                            last_error = f"HTTP {resp.status_code}: {resp.text}"
            except Exception as e:
                last_error = str(e)
                continue

        duration = round((time.time() - start) * 1000, 2)
        return ProviderCodeSolution(
            provider="gemini",
            provider_name=provider_name,
            status="error",
            error_message=f"Gemini API Error: {last_error}",
            duration_ms=duration
        )

    async def _call_groq(self, prompt: str, target_lang: str, api_key: str) -> ProviderCodeSolution:
        start = time.time()
        provider_name = "Groq API"
        # We test candidates available on Groq
        model_candidates = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "allam-2-7b"]

        if not api_key or not api_key.strip():
            return ProviderCodeSolution(
                provider="groq",
                provider_name=provider_name,
                status="error",
                error_message="Groq API Key is not configured. Add GROQ_API_KEY in Settings to enable Groq generation.",
                duration_ms=0.0
            )

        user_msg = f"Target Language: {target_lang}\nUser Goal: {prompt}\n\nPlease generate beginner-friendly code following all simplicity rules."
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        last_error = "Unknown error"
        for model in model_candidates:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": GROQ_SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg}
                ],
                "temperature": 0.2,
                "max_tokens": 2048
            }
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    choice = data["choices"][0]
                    raw_text = choice.get("message", {}).get("content") or choice.get("message", {}).get("reasoning") or ""
                    if not raw_text.strip():
                        raise Exception("Empty completion returned from Groq.")

                duration = round((time.time() - start) * 1000, 2)
                parsed = self._extract_json_response(raw_text)
                if parsed and isinstance(parsed, dict) and "code" in parsed:
                    code_text = self._clean_code(str(parsed["code"]))
                    explanation = str(parsed.get("explanation", "Beginner-friendly code generated by Groq."))
                else:
                    code_text = self._clean_code(raw_text)
                    explanation = "Clean beginner-friendly solution generated by Groq LPU."

                lines = len(code_text.splitlines())
                return ProviderCodeSolution(
                    provider="groq",
                    provider_name=provider_name,
                    status="success",
                    code=code_text,
                    explanation=explanation,
                    model=model,
                    duration_ms=duration,
                    line_count=lines
                )
            except Exception as e:
                last_error = str(e)
                continue

        duration = round((time.time() - start) * 1000, 2)
        return ProviderCodeSolution(
            provider="groq",
            provider_name=provider_name,
            status="error",
            error_message=f"Groq API Error: {last_error}",
            duration_ms=duration
        )

    async def _call_openai(self, prompt: str, target_lang: str, api_key: str, base_url: str, groq_key: Optional[str] = None) -> ProviderCodeSolution:
        start = time.time()
        provider_name = "OpenAI API"
        model_name = "gpt-4o-mini"

        if not api_key or not api_key.strip():
            return ProviderCodeSolution(
                provider="openai",
                provider_name=provider_name,
                status="error",
                error_message="OpenAI API Key is not configured. Add OPENAI_API_KEY in Settings to enable OpenAI generation.",
                duration_ms=0.0
            )

        user_msg = f"Target Language: {target_lang}\nUser Goal: {prompt}\n\nPlease generate beginner-friendly code following all simplicity rules."
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": OPENAI_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg}
            ],
            "temperature": 0.2,
            "max_tokens": 2048
        }

        openai_err = None
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    choice = data["choices"][0]
                    raw_text = choice.get("message", {}).get("content") or ""
                    if raw_text.strip():
                        duration = round((time.time() - start) * 1000, 2)
                        parsed = self._extract_json_response(raw_text)
                        if parsed and isinstance(parsed, dict) and "code" in parsed:
                            code_text = self._clean_code(str(parsed["code"]))
                            explanation = str(parsed.get("explanation", "Beginner-friendly code generated by OpenAI."))
                        else:
                            code_text = self._clean_code(raw_text)
                            explanation = "Clean beginner-friendly solution generated by OpenAI."

                        lines = len(code_text.splitlines())
                        return ProviderCodeSolution(
                            provider="openai",
                            provider_name=provider_name,
                            status="success",
                            code=code_text,
                            explanation=explanation,
                            model=model_name,
                            duration_ms=duration,
                            line_count=lines
                        )
                else:
                    try:
                        openai_err = resp.json().get("error", {}).get("message")
                    except Exception:
                        openai_err = f"HTTP {resp.status_code}: {resp.text}"
        except Exception as e:
            openai_err = str(e)

        # If direct OpenAI endpoint failed due to quota/credits, fallback to OpenAI GPT-OSS model on Groq if available
        if groq_key and ("credit" in str(openai_err).lower() or "quota" in str(openai_err).lower() or "429" in str(openai_err)):
            try:
                groq_url = "https://api.groq.com/openai/v1/chat/completions"
                groq_headers = {
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                }
                groq_payload = {
                    "model": "openai/gpt-oss-120b",
                    "messages": [
                        {"role": "system", "content": OPENAI_SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 2048
                }
                async with httpx.AsyncClient(timeout=25.0) as client:
                    g_resp = await client.post(groq_url, headers=groq_headers, json=groq_payload)
                    if g_resp.status_code == 200:
                        g_data = g_resp.json()
                        g_choice = g_data["choices"][0]
                        g_raw = g_choice.get("message", {}).get("content") or g_choice.get("message", {}).get("reasoning") or ""
                        if g_raw.strip():
                            duration = round((time.time() - start) * 1000, 2)
                            parsed = self._extract_json_response(g_raw)
                            if parsed and isinstance(parsed, dict) and "code" in parsed:
                                code_text = self._clean_code(str(parsed["code"]))
                                base_expl = str(parsed.get("explanation", "Beginner-friendly code generated by OpenAI."))
                            else:
                                code_text = self._clean_code(g_raw)
                                base_expl = "Clean beginner-friendly solution generated by OpenAI."

                            expl = f"{base_expl} (Served via OpenAI GPT-OSS model; api.openai.com reported credit balance exhausted)"
                            lines = len(code_text.splitlines())
                            return ProviderCodeSolution(
                                provider="openai",
                                provider_name="OpenAI API (GPT-OSS)",
                                status="success",
                                code=code_text,
                                explanation=expl,
                                model="openai/gpt-oss-120b",
                                duration_ms=duration,
                                line_count=lines
                            )
            except Exception:
                pass

        duration = round((time.time() - start) * 1000, 2)
        return ProviderCodeSolution(
            provider="openai",
            provider_name=provider_name,
            status="error",
            error_message=f"OpenAI API Notice: {openai_err or 'Call failed'}",
            duration_ms=duration
        )

    def _evaluate_solutions(
        self,
        solutions: Dict[str, ProviderCodeSolution],
        prompt: str
    ) -> Tuple[Optional[str], Optional[str]]:
        # Filter successful solutions with valid code
        successful = {k: v for k, v in solutions.items() if v.status == "success" and v.code and v.code.strip()}

        if not successful:
            return None, "None of the AI providers successfully returned code. Please check your API keys in Settings."

        if len(successful) == 1:
            winner_key = list(successful.keys())[0]
            winner = successful[winner_key]
            return winner_key, f"Recommended: {winner.provider_name}. This solution was successfully generated, is concise ({winner.line_count or 0} lines), and follows beginner-friendly simplicity guidelines."

        # Compare multiple successful solutions based on beginner-friendly criteria:
        # Criteria: brevity, directness, modularity, user interaction, and prompt alignment
        scores: Dict[str, float] = {}
        prompt_lower = prompt.lower()
        wants_function = any(w in prompt_lower for w in ["function", "def ", "method", "module", "reusable", "algorithm"])
        wants_interactive = any(w in prompt_lower for w in ["interactive", "user input", "ask user", "prompt user", "calculator", "game"])
        wants_quick = any(w in prompt_lower for w in ["quick", "short", "script", "direct", "print the", "simple script", "fast", "calculate"])

        for key, sol in successful.items():
            code = sol.code or ""
            lines = [l for l in code.splitlines() if l.strip()]
            line_count = len(lines)

            score = 100.0

            # 1. Brevity & compactness (ideal 2 to 20 lines for beginner understanding)
            if 1 <= line_count <= 20:
                score += 12.0
            elif line_count > 35:
                score -= 10.0

            # 2. Alignment with prompt intent
            if key == "gemini":
                # Gemini produces clean reusable functions
                if wants_function:
                    score += 18.0
                elif "def " in code or "function " in code:
                    score += 8.0
            elif key == "groq":
                # Groq produces ultra-concise direct scripts
                if wants_quick or line_count <= 6:
                    score += 18.0
                if not wants_function and "class " not in code:
                    score += 6.0
            elif key == "openai":
                # OpenAI produces defensive, example-first solutions
                if wants_interactive:
                    score += 20.0
                elif "try:" in code or "except" in code:
                    score += 8.0

            # 3. Comment balance: 1 to 4 comments is ideal
            comment_count = len([l for l in lines if l.strip().startswith("#") or l.strip().startswith("//")])
            if 1 <= comment_count <= 4:
                score += 5.0
            elif comment_count > (line_count * 0.5):
                score -= 5.0

            # 4. Latency bonus
            if sol.duration_ms and sol.duration_ms < 1500:
                score += 3.0

            scores[key] = score

        # Determine winner
        sorted_keys = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
        best_key = sorted_keys[0]
        second_key = sorted_keys[1]

        best_score = scores[best_key]
        second_score = scores[second_key]

        # If difference is negligible (< 3%), declare comparable
        if abs(best_score - second_score) <= 3.0:
            return "comparable", f"The solutions from {successful[best_key].provider_name} ({successful[best_key].line_count} lines) and {successful[second_key].provider_name} ({successful[second_key].line_count} lines) offer distinct, equally clean beginner-friendly perspectives."

        best_sol = successful[best_key]
        if best_key == "gemini":
            reason = f"Recommended: {best_sol.provider_name}. Structured with a clean, reusable function and return value, making it the most modular and testable solution for beginners."
        elif best_key == "groq":
            reason = f"Recommended: {best_sol.provider_name}. Generates an ultra-concise, direct script in only {best_sol.line_count} lines without boilerplate, making it the fastest and simplest to understand."
        else:
            reason = f"Recommended: {best_sol.provider_name}. Includes a runnable example and defensive validation, making the solution easy to try and understand."

        return best_key, reason

    async def generate_three_options(
        self,
        prompt: str,
        language: str = "python"
    ) -> MultiProviderGenerationResponse:
        keys = self._get_keys()

        # Execute all three in parallel
        gemini_task = asyncio.create_task(self._call_gemini(prompt, language, keys["gemini"]))
        groq_task = asyncio.create_task(self._call_groq(prompt, language, keys["groq"]))
        openai_task = asyncio.create_task(self._call_openai(prompt, language, keys["openai"], keys["openai_base"], keys["groq"]))

        gemini_res, groq_res, openai_res = await asyncio.gather(gemini_task, groq_task, openai_task)

        solutions = {
            "gemini": gemini_res,
            "groq": groq_res,
            "openai": openai_res,
        }

        rec_provider, rec_reason = self._evaluate_solutions(solutions, prompt)

        return MultiProviderGenerationResponse(
            prompt=prompt,
            language=language,
            solutions=solutions,
            recommended_provider=rec_provider,
            recommendation_reason=rec_reason
        )

multi_provider_service = MultiProviderService()
