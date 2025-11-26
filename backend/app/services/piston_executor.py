"""Piston Code Execution Service"""
import requests
import asyncio
from typing import Dict, Optional

PISTON_API = "https://emkc.org/api/v2/piston"

# Language mapping to Piston language IDs
LANGUAGE_MAP = {
    "python": "python",
    "c": "c",
    "cpp": "cpp",
    "java": "java",
    "javascript": "js",
    "js": "js"
}

# Piston version mapping (use latest stable)
PISTON_VERSIONS = {
    "python": "3.10.0",
    "c": "11.2.0",
    "cpp": "11.2.0",
    "java": "15.0.2",
    "javascript": "18.15.0",
    "js": "18.15.0"
}


async def execute_with_piston(
    language: str,
    code: str,
    stdin: str = "",
    time_limit: int = 5,
    memory_limit: int = 256
) -> Dict:
    """Execute code using Piston API
    
    Args:
        language: Language name (python, c, cpp, java, javascript)
        code: Source code to execute
        stdin: Input for the program
        time_limit: Time limit in seconds
        memory_limit: Memory limit in MB
    
    Returns:
        Dict with execution results:
        {
            "output": str,
            "error": Optional[str],
            "exit_code": int,
            "runtime": Optional[float]
        }
    """
    # Map language to Piston format
    piston_lang = LANGUAGE_MAP.get(language.lower())
    if not piston_lang:
        raise ValueError(f"Unsupported language: {language}")
    
    version = PISTON_VERSIONS.get(piston_lang, "latest")
    
    # Prepare request
    payload = {
        "language": piston_lang,
        "version": version,
        "files": [
            {
                "name": get_filename_for_language(piston_lang),
                "content": code
            }
        ],
        "stdin": stdin
    }
    
    try:
        # Execute synchronously (Piston API is fast)
        response = requests.post(
            f"{PISTON_API}/execute",
            json=payload,
            timeout=time_limit + 2  # Add buffer
        )
        response.raise_for_status()
        
        result = response.json()
        
        # Format response
        return {
            "output": result.get("run", {}).get("output", ""),
            "error": result.get("run", {}).get("stderr", ""),
            "exit_code": result.get("run", {}).get("code", 0),
            "runtime": result.get("run", {}).get("time", None)
        }
    except requests.exceptions.RequestException as e:
        raise Exception(f"Piston API error: {str(e)}")
    except Exception as e:
        raise Exception(f"Execution error: {str(e)}")


def get_filename_for_language(language: str) -> str:
    """Get appropriate filename for language"""
    filename_map = {
        "python": "main.py",
        "c": "main.c",
        "cpp": "main.cpp",
        "java": "Main.java",
        "javascript": "main.js",
        "js": "main.js"
    }
    return filename_map.get(language, "main.txt")

