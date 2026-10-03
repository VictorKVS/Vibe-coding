from __future__ import annotations

import importlib.util
import shutil
import socket
import subprocess
from dataclasses import dataclass
from typing import Optional

from father.runtime.core.registry import FatherRegistry


@dataclass
class HealthResult:
    component: str
    status: str
    detail: str = ""


def module_exists(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ModuleNotFoundError):
        return False


def tcp_open(host: str, port: int, timeout: float = 0.4) -> bool:
    try:
        with socket.create_connection(
            (host, port),
            timeout=timeout,
        ):
            return True
    except OSError:
        return False


def detect_gpu() -> list[HealthResult]:
    results: list[HealthResult] = []

    if not shutil.which("nvidia-smi"):
        results.append(
            HealthResult(
                "NVIDIA GPU",
                "NOT FOUND",
                "nvidia-smi unavailable",
            )
        )
        return results

    try:
        command = [
            "nvidia-smi",
            "--query-gpu=name,memory.total,memory.used",
            "--format=csv,noheader,nounits",
        ]

        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )

        if completed.returncode != 0:
            results.append(
                HealthResult(
                    "NVIDIA GPU",
                    "ERROR",
                    completed.stderr.strip(),
                )
            )
            return results

        rows = [
            line.strip()
            for line in completed.stdout.splitlines()
            if line.strip()
        ]

        for index, row in enumerate(rows):
            parts = [part.strip() for part in row.split(",")]

            if len(parts) >= 3:
                name, total, used = parts[:3]

                results.append(
                    HealthResult(
                        f"GPU {index}",
                        "READY",
                        f"{name}; VRAM {used}/{total} MB",
                    )
                )

    except Exception as exc:
        results.append(
            HealthResult(
                "NVIDIA GPU",
                "ERROR",
                str(exc),
            )
        )

    return results


class FatherHealthScanner:

    def __init__(self):
        self.registry = FatherRegistry()

    def scan(self) -> list[HealthResult]:
        results: list[HealthResult] = []

        # Hardware
        results.extend(detect_gpu())

        # LLM runtimes
        ollama = tcp_open("127.0.0.1", 11434)
        llama_cpp = tcp_open("127.0.0.1", 8080)

        if ollama:
            results.append(
                HealthResult(
                    "local_llm",
                    "READY",
                    "Ollama detected on :11434",
                )
            )
        elif llama_cpp:
            results.append(
                HealthResult(
                    "local_llm",
                    "READY",
                    "llama.cpp detected on :8080",
                )
            )
        else:
            results.append(
                HealthResult(
                    "local_llm",
                    "STOPPED",
                    "No active Ollama/llama.cpp endpoint",
                )
            )

        # Speech-to-text
        if module_exists("faster_whisper"):
            results.append(
                HealthResult(
                    "faster_whisper",
                    "INSTALLED",
                    "Python module available",
                )
            )
        else:
            results.append(
                HealthResult(
                    "faster_whisper",
                    "NOT INSTALLED",
                    "Python module unavailable",
                )
            )

        # Text-to-speech
        xtts = module_exists("TTS")
        piper = (
            module_exists("piper")
            or module_exists("piper_tts")
        )
        windows_tts = module_exists("pyttsx3")

        if xtts:
            results.append(
                HealthResult(
                    "local_tts",
                    "READY",
                    "Coqui/XTTS module detected",
                )
            )
        elif piper:
            results.append(
                HealthResult(
                    "local_tts",
                    "READY",
                    "Piper module detected",
                )
            )
        elif windows_tts:
            results.append(
                HealthResult(
                    "local_tts",
                    "READY",
                    "Windows TTS / pyttsx3",
                )
            )
        else:
            results.append(
                HealthResult(
                    "local_tts",
                    "NOT INSTALLED",
                    "XTTS/Piper/pyttsx3 not detected",
                )
            )

        # Image generation
        if tcp_open("127.0.0.1", 8188):
            results.append(
                HealthResult(
                    "comfyui",
                    "READY",
                    "ComfyUI detected on :8188",
                )
            )
        else:
            results.append(
                HealthResult(
                    "comfyui",
                    "STOPPED",
                    "ComfyUI port :8188 unavailable",
                )
            )

        # Registry-known models
        models = self.registry.models.get("models", {})

        for model_id in (
            "qwen3_embedding",
            "qwen3_reranker",
        ):
            config = models.get(model_id)

            if not config:
                results.append(
                    HealthResult(
                        model_id,
                        "NOT REGISTERED",
                    )
                )
                continue

            results.append(
                HealthResult(
                    model_id,
                    str(
                        config.get(
                            "status",
                            "unknown",
                        )
                    ).upper(),
                    "Model Zoo registry",
                )
            )

        return results


def print_report(results: list[HealthResult]) -> None:
    print()
    print("=" * 78)
    print("FATHER RUNTIME HEALTH")
    print("=" * 78)

    for result in results:
        print(
            f"{result.component:<24}"
            f"{result.status:<16}"
            f"{result.detail}"
        )

    print("=" * 78)


if __name__ == "__main__":
    scanner = FatherHealthScanner()
    print_report(scanner.scan())
