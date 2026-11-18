import os
import sys
import time
import shutil
import asyncio
import tempfile
from typing import Optional, Tuple
from app.schemas.snippet import CodeRunResponse

class CodeExecutor:
    def __init__(self):
        self.docker_available = self._check_docker()

    def _check_docker(self) -> bool:
        docker_path = shutil.which("docker")
        if not docker_path:
            return False
        try:
            res = os.system("docker ps > /dev/null 2>&1")
            return res == 0
        except Exception:
            return False

    async def execute_code(
        self,
        code: str,
        language: str = "python",
        stdin: Optional[str] = "",
        timeout_seconds: float = 5.0
    ) -> CodeRunResponse:
        start_time = time.time()
        lang = language.lower().strip()

        # Sanitize language identifier
        if lang in ["py", "python3"]:
            lang = "python"
        elif lang in ["js", "javascript", "ts", "typescript"]:
            lang = "javascript"
        elif lang in ["c"]:
            lang = "c"
        elif lang in ["cpp", "c++"]:
            lang = "cpp"
        elif lang in ["java"]:
            lang = "java"

        # Check Docker first
        if self.docker_available:
            try:
                return await self._run_in_docker(code, lang, stdin, timeout_seconds, start_time)
            except Exception as e:
                print(f"[Executor] Docker execution failed ({e}), falling back to isolated sandbox.")

        # Run in Isolated Subprocess Sandbox
        return await self._run_in_isolated_process(code, lang, stdin, timeout_seconds, start_time)

    async def _run_in_isolated_process(
        self,
        code: str,
        language: str,
        stdin: Optional[str],
        timeout_seconds: float,
        start_time: float
    ) -> CodeRunResponse:
        # Create an isolated temporary directory for the execution
        with tempfile.TemporaryDirectory(prefix="auron_ai_sandbox_") as tmpdir:
            file_name = "main.py"
            compile_cmd = None
            run_cmd = []

            # Clean stripped environment (no API keys, database credentials, or secret tokens)
            clean_env = {
                "PATH": os.environ.get("PATH", "/usr/bin:/bin:/usr/local/bin"),
                "LANG": "en_US.UTF-8",
                "LC_ALL": "en_US.UTF-8",
                "PYTHONUNBUFFERED": "1",
            }

            if language == "python":
                file_name = "main.py"
                py_exec = sys.executable or shutil.which("python3") or "/usr/bin/python3"
                run_cmd = [py_exec, "-u", file_name]
            elif language == "javascript":
                file_name = "script.js"
                node_exec = shutil.which("node") or "/usr/local/bin/node"
                if not node_exec or not os.path.exists(node_exec):
                    return CodeRunResponse(
                        status="unsupported",
                        stderr="Node.js runtime is not available on this server.",
                        execution_time_ms=0.0,
                        sandbox_type="isolated_process_sandbox"
                    )
                run_cmd = [node_exec, file_name]
            elif language == "c":
                file_name = "main.c"
                clang_exec = shutil.which("clang") or shutil.which("gcc")
                if not clang_exec:
                    return CodeRunResponse(
                        status="unsupported",
                        stderr="C compiler (clang/gcc) is not available on this server.",
                        execution_time_ms=0.0,
                        sandbox_type="isolated_process_sandbox"
                    )
                compile_cmd = [clang_exec, "-O2", file_name, "-o", "main"]
                run_cmd = ["./main"]
            elif language == "cpp":
                file_name = "main.cpp"
                clangpp_exec = shutil.which("clang++") or shutil.which("g++")
                if not clangpp_exec:
                    return CodeRunResponse(
                        status="unsupported",
                        stderr="C++ compiler (clang++/g++) is not available on this server.",
                        execution_time_ms=0.0,
                        sandbox_type="isolated_process_sandbox"
                    )
                compile_cmd = [clangpp_exec, "-std=c++17", "-O2", file_name, "-o", "main"]
                run_cmd = ["./main"]
            elif language == "java":
                file_name = "Main.java"
                javac_exec = shutil.which("javac")
                java_exec = shutil.which("java")
                if not javac_exec or not java_exec:
                    return CodeRunResponse(
                        status="unsupported",
                        stderr="Java SDK (javac/java) is not available on this server.",
                        execution_time_ms=0.0,
                        sandbox_type="isolated_process_sandbox"
                    )
                compile_cmd = [javac_exec, file_name]
                run_cmd = [java_exec, "Main"]
            else:
                return CodeRunResponse(
                    status="unsupported",
                    stderr=f"Language '{language}' direct execution is not supported. Supported: Python, JavaScript, Java, C, C++.",
                    execution_time_ms=0.0,
                    sandbox_type="isolated_process_sandbox"
                )

            # Write code file
            code_file_path = os.path.join(tmpdir, file_name)
            with open(code_file_path, "w", encoding="utf-8") as f:
                f.write(code)

            # Optional compilation step
            if compile_cmd:
                try:
                    proc = await asyncio.create_subprocess_exec(
                        *compile_cmd,
                        cwd=tmpdir,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        env=clean_env
                    )
                    c_out, c_err = await asyncio.wait_for(proc.communicate(), timeout=8.0)
                    if proc.returncode != 0:
                        duration = round((time.time() - start_time) * 1000, 2)
                        return CodeRunResponse(
                            status="error",
                            stdout=c_out.decode("utf-8", errors="replace"),
                            stderr=f"Compilation Error:\n{c_err.decode('utf-8', errors='replace')}",
                            exit_code=proc.returncode or 1,
                            execution_time_ms=duration,
                            sandbox_type="isolated_process_sandbox"
                        )
                except asyncio.TimeoutError:
                    duration = round((time.time() - start_time) * 1000, 2)
                    return CodeRunResponse(
                        status="timeout",
                        stderr=f"Compilation timed out after 8 seconds.",
                        exit_code=124,
                        execution_time_ms=duration,
                        sandbox_type="isolated_process_sandbox"
                    )

            # Execution step with stdin piping and timeout
            input_bytes = stdin.encode("utf-8") if stdin else None
            try:
                proc = await asyncio.create_subprocess_exec(
                    *run_cmd,
                    cwd=tmpdir,
                    stdin=asyncio.subprocess.PIPE if input_bytes else None,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=clean_env
                )

                try:
                    out_bytes, err_bytes = await asyncio.wait_for(
                        proc.communicate(input=input_bytes),
                        timeout=timeout_seconds
                    )
                except asyncio.TimeoutError:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                    duration = round((time.time() - start_time) * 1000, 2)
                    return CodeRunResponse(
                        status="timeout",
                        stderr=f"Execution timed out ({timeout_seconds}s limit reached). If your program expects user input, provide it in the stdin input field.",
                        exit_code=124,
                        execution_time_ms=duration,
                        sandbox_type="isolated_process_sandbox"
                    )

                duration = round((time.time() - start_time) * 1000, 2)
                stdout_str = out_bytes.decode("utf-8", errors="replace")[:65536]
                stderr_str = err_bytes.decode("utf-8", errors="replace")[:65536]
                exit_code = proc.returncode or 0

                status = "success" if exit_code == 0 and not stderr_str.strip() else ("error" if exit_code != 0 else "success")

                return CodeRunResponse(
                    status=status,
                    stdout=stdout_str,
                    stderr=stderr_str,
                    exit_code=exit_code,
                    execution_time_ms=duration,
                    sandbox_type="isolated_process_sandbox"
                )
            except Exception as e:
                duration = round((time.time() - start_time) * 1000, 2)
                return CodeRunResponse(
                    status="error",
                    stderr=f"Sandbox Execution Exception: {str(e)}",
                    exit_code=1,
                    execution_time_ms=duration,
                    sandbox_type="isolated_process_sandbox"
                )

    async def _run_in_docker(
        self,
        code: str,
        language: str,
        stdin: Optional[str],
        timeout_seconds: float,
        start_time: float
    ) -> CodeRunResponse:
        # Ephemeral Docker container execution
        with tempfile.TemporaryDirectory(prefix="docker_sandbox_") as tmpdir:
            file_name = "main.py"
            image = "python:3.11-slim"
            cmd_inside = ["python3", "-u", "main.py"]

            if language == "python":
                file_name = "main.py"
                image = "python:3.11-slim"
                cmd_inside = ["python3", "-u", "main.py"]
            elif language == "javascript":
                file_name = "index.js"
                image = "node:20-slim"
                cmd_inside = ["node", "index.js"]
            elif language in ["c", "cpp"]:
                file_name = "main.cpp" if language == "cpp" else "main.c"
                image = "gcc:latest"
                cmd_inside = ["sh", "-c", f"gcc -O2 {file_name} -o main && ./main"]

            with open(os.path.join(tmpdir, file_name), "w", encoding="utf-8") as f:
                f.write(code)

            docker_cmd = [
                "docker", "run", "--rm", "-i",
                "--network", "none",
                "--memory", "128m",
                "--cpus", "0.5",
                "-v", f"{tmpdir}:/app",
                "-w", "/app",
                image
            ] + cmd_inside

            proc = await asyncio.create_subprocess_exec(
                *docker_cmd,
                stdin=asyncio.subprocess.PIPE if stdin else None,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            input_bytes = stdin.encode("utf-8") if stdin else None
            try:
                out_bytes, err_bytes = await asyncio.wait_for(
                    proc.communicate(input=input_bytes),
                    timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                duration = round((time.time() - start_time) * 1000, 2)
                return CodeRunResponse(
                    status="timeout",
                    stderr=f"Docker execution timed out after {timeout_seconds} seconds.",
                    exit_code=124,
                    execution_time_ms=duration,
                    sandbox_type="docker_sandbox"
                )

            duration = round((time.time() - start_time) * 1000, 2)
            stdout_str = out_bytes.decode("utf-8", errors="replace")[:65536]
            stderr_str = err_bytes.decode("utf-8", errors="replace")[:65536]
            return CodeRunResponse(
                status="success" if proc.returncode == 0 else "error",
                stdout=stdout_str,
                stderr=stderr_str,
                exit_code=proc.returncode or 0,
                execution_time_ms=duration,
                sandbox_type="docker_sandbox"
            )

code_executor = CodeExecutor()
