"""Code Execution Service - Docker-based sandbox execution"""
import docker
import json
import time
import os
import tempfile
import shutil
from typing import Dict, Optional, Tuple
from app.schemas.coding_lab import SubmissionStatus, CodeExecutionResponse
import logging

logger = logging.getLogger(__name__)

# Docker client - lazy initialization
_docker_client = None

def get_docker_client():
    """Get Docker client with lazy initialization"""
    global _docker_client
    if _docker_client is None:
        try:
            _docker_client = docker.from_env()
            # Test connection
            _docker_client.ping()
        except Exception as e:
            logger.error(f"Docker not available: {e}")
            raise RuntimeError(f"Docker is not running or not accessible: {e}")
    return _docker_client

# Language configurations
LANGUAGE_CONFIGS = {
    "python": {
        "image": "python:3.11-slim",
        "command": "python",
        "extension": ".py",
        "compile_command": None,
        "run_command": "python {file}",
        "timeout_multiplier": 1.0,
    },
    "java": {
        "image": "openjdk:17-slim",
        "command": "javac",
        "extension": ".java",
        "compile_command": "javac {file}",
        "run_command": "java -cp {dir} {class_name}",
        "timeout_multiplier": 1.5,
    },
    "c": {
        "image": "gcc:latest",
        "command": "gcc",
        "extension": ".c",
        "compile_command": "gcc -o {output} {file}",
        "run_command": "./{output}",
        "timeout_multiplier": 1.2,
    },
    "cpp": {
        "image": "gcc:latest",
        "command": "g++",
        "extension": ".cpp",
        "compile_command": "g++ -o {output} {file}",
        "run_command": "./{output}",
        "timeout_multiplier": 1.2,
    },
    "javascript": {
        "image": "node:18-slim",
        "command": "node",
        "extension": ".js",
        "compile_command": None,
        "run_command": "node {file}",
        "timeout_multiplier": 1.0,
    },
    "sql": {
        "image": "postgres:15-alpine",
        "command": "psql",
        "extension": ".sql",
        "compile_command": None,
        "run_command": "psql -U postgres -d testdb -f {file}",
        "timeout_multiplier": 1.5,
    },
}


class CodeExecutor:
    """Docker-based code execution service"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="code_exec_")
    
    @property
    def client(self):
        """Get Docker client"""
        return get_docker_client()
    
    def execute_code(
        self,
        code: str,
        language: str,
        input_data: Optional[str] = None,
        time_limit_seconds: int = 5,
        memory_limit_mb: int = 256,
    ) -> CodeExecutionResponse:
        """
        Execute code in Docker container
        
        Args:
            code: Source code to execute
            language: Programming language
            input_data: Input data (stdin)
            time_limit_seconds: Time limit in seconds
            memory_limit_mb: Memory limit in MB
            
        Returns:
            CodeExecutionResponse with execution results
        """
        if language.lower() not in LANGUAGE_CONFIGS:
            return CodeExecutionResponse(
                status=SubmissionStatus.INTERNAL_ERROR,
                error_message=f"Unsupported language: {language}"
            )
        
        config = LANGUAGE_CONFIGS[language.lower()]
        container = None
        start_time = time.time()
        
        try:
            # Create temporary file
            file_path = self._create_temp_file(code, language, config)
            
            # Prepare container
            container = self._create_container(
                config,
                file_path,
                time_limit_seconds,
                memory_limit_mb,
                language
            )
            
            # Start container
            container.start()
            
            # Wait for execution with timeout
            timeout = time_limit_seconds + 2  # Add buffer
            try:
                exit_code = container.wait(timeout=timeout)
            except Exception as e:
                logger.error(f"Container wait timeout: {e}")
                container.kill()
                return CodeExecutionResponse(
                    status=SubmissionStatus.TIME_LIMIT_EXCEEDED,
                    error_message="Execution timeout exceeded",
                    execution_time_ms=int((time.time() - start_time) * 1000)
                )
            
            # Get logs
            logs = container.logs(stdout=True, stderr=True).decode('utf-8', errors='ignore')
            
            # Get stats
            stats = container.stats(stream=False)
            memory_used = stats.get('memory_stats', {}).get('usage', 0) / (1024 * 1024)  # MB
            
            execution_time = int((time.time() - start_time) * 1000)  # ms
            
            # Check memory limit
            if memory_used > memory_limit_mb:
                return CodeExecutionResponse(
                    status=SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
                    error_message=f"Memory limit exceeded: {memory_used:.2f}MB > {memory_limit_mb}MB",
                    execution_time_ms=execution_time,
                    memory_used_mb=memory_used
                )
            
            # Parse output
            stdout, stderr = self._parse_logs(logs, language)
            
            # Determine status
            if exit_code == 0:
                status = SubmissionStatus.ACCEPTED
                error_message = None
            else:
                status = SubmissionStatus.RUNTIME_ERROR
                error_message = stderr or "Runtime error occurred"
            
            return CodeExecutionResponse(
                status=status,
                output=stdout,
                error_message=error_message,
                execution_time_ms=execution_time,
                memory_used_mb=memory_used,
                compile_output=stderr if exit_code != 0 else None
            )
            
        except docker.errors.ContainerError as e:
            logger.error(f"Container error: {e}")
            return CodeExecutionResponse(
                status=SubmissionStatus.RUNTIME_ERROR,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
        except Exception as e:
            logger.error(f"Execution error: {e}", exc_info=True)
            return CodeExecutionResponse(
                status=SubmissionStatus.INTERNAL_ERROR,
                error_message=f"Internal error: {str(e)}",
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
        finally:
            # Cleanup
            if container:
                try:
                    container.remove(force=True)
                except:
                    pass
    
    def _create_temp_file(self, code: str, language: str, config: Dict) -> str:
        """Create temporary file with code"""
        extension = config["extension"]
        file_name = f"code{extension}"
        file_path = os.path.join(self.temp_dir, file_name)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(code)
        
        return file_path
    
    def _create_container(
        self,
        config: Dict,
        file_path: str,
        time_limit_seconds: int,
        memory_limit_mb: int,
        language: str
    ) -> docker.models.containers.Container:
        """Create Docker container for execution"""
        # Copy file to container
        file_name = os.path.basename(file_path)
        
        # Prepare command
        if language.lower() == "java":
            # Java needs special handling
            class_name = file_name.replace(".java", "")
            compile_cmd = f"javac {file_name}"
            run_cmd = f"java {class_name}"
            command = f"sh -c '{compile_cmd} && {run_cmd}'"
        elif config["compile_command"]:
            # Compiled languages
            output_name = file_name.replace(config["extension"], "")
            compile_cmd = config["compile_command"].format(
                file=file_name,
                output=output_name
            )
            run_cmd = config["run_command"].format(output=output_name)
            command = f"sh -c '{compile_cmd} && {run_cmd}'"
        else:
            # Interpreted languages
            command = config["run_command"].format(file=file_name)
        
        # Create container
        container = self.client.containers.create(
            image=config["image"],
            command=command,
            mem_limit=f"{memory_limit_mb}m",
            memswap_limit=f"{memory_limit_mb}m",
            cpu_period=100000,
            cpu_quota=int(100000 * (time_limit_seconds / 10)),  # Rough CPU limit
            network_disabled=True,  # No internet access
            pids_limit=50,  # Limit processes
            read_only=True,  # Read-only filesystem
            tmpfs={'/tmp': 'rw,noexec,nosuid,size=100m'},  # Temporary filesystem
            working_dir="/app",
            detach=True,
            stdin_open=False,
            tty=False,
        )
        
        # Copy file into container
        with open(file_path, 'rb') as f:
            self.client.api.put_archive(
                container.id,
                "/app",
                f.read()
            )
        
        return container
    
    def _parse_logs(self, logs: str, language: str) -> Tuple[str, str]:
        """Parse container logs into stdout and stderr"""
        # Simple parsing - in production, use better log separation
        lines = logs.split('\n')
        stdout_lines = []
        stderr_lines = []
        
        for line in lines:
            if any(keyword in line.lower() for keyword in ['error', 'exception', 'traceback']):
                stderr_lines.append(line)
            else:
                stdout_lines.append(line)
        
        stdout = '\n'.join(stdout_lines).strip()
        stderr = '\n'.join(stderr_lines).strip() if stderr_lines else None
        
        return stdout, stderr
    
    def cleanup(self):
        """Cleanup temporary files"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)


# Singleton instance
executor = CodeExecutor()

