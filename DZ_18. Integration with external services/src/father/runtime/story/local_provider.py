from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional

from father.runtime.story.model_router import (
    StoryModelSpec,
)


REPO_ROOT = (
    Path(__file__)
    .resolve()
    .parents[4]
)

MODEL_ROOT = (
    REPO_ROOT
    / "models"
)


def find_llama_cli() -> Path:
    direct = shutil.which(
        "llama-cli"
    )

    if direct:
        return Path(
            direct
        )

    local = os.environ.get(
        "LOCALAPPDATA"
    )

    if local:
        roots = [
            Path(local)
            / "Microsoft"
            / "WinGet"
            / "Links",

            Path(local)
            / "Microsoft"
            / "WinGet"
            / "Packages",
        ]

        for root in roots:
            if not root.exists():
                continue

            matches = list(
                root.rglob(
                    "llama-cli.exe"
                )
            )

            if matches:
                return matches[0]

    raise FileNotFoundError(
        "llama-cli.exe not found"
    )


def find_model_file(
    spec: StoryModelSpec,
) -> Path:
    folder = (
        MODEL_ROOT
        / spec.folder
    )

    if not folder.exists():
        raise FileNotFoundError(
            f"Model folder not found: {folder}"
        )

    files = sorted(
        folder.glob("*.gguf"),
        key=lambda item: (
            item.stat().st_size
        ),
        reverse=True,
    )

    if not files:
        raise FileNotFoundError(
            f"No GGUF found in: {folder}"
        )

    return files[0]


class LlamaCppStoryProvider:
    def __init__(
        self,
        spec: StoryModelSpec,
        context: int = 8192,
        gpu_layers: int = 999,
        timeout_seconds: int = 900,
    ):
        self.spec = spec
        self.context = context
        self.gpu_layers = gpu_layers
        self.timeout_seconds = timeout_seconds

        self.llama_cli = (
            find_llama_cli()
        )

        self.model_file = (
            find_model_file(
                spec
            )
        )

    def generate(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        json_schema_file: Optional[Path] = None,
        reasoning: bool = True,
    ) -> str:

        token_budget = (
            max_tokens
            if max_tokens is not None
            else self.spec.max_tokens
        )

        temp = (
            temperature
            if temperature is not None
            else self.spec.temperature
        )

        if len(prompt) > 24000:
            raise ValueError(
                "Prompt exceeds Story Provider v1 safety limit "
                "of 24000 characters. "
                "Use chunked extraction."
            )

        args = [
            str(
                self.llama_cli
            ),

            "-m",
            str(
                self.model_file
            ),

            "-ngl",
            str(
                self.gpu_layers
            ),

            "-c",
            str(
                self.context
            ),

            "-n",
            str(
                token_budget
            ),

            "--temp",
            str(
                temp
            ),

            "--single-turn",

            "--no-display-prompt",

            "--color",
            "off",
        ]

        if not reasoning:
            args.extend(
                [
                    "--reasoning",
                    "off",

                    "--reasoning-budget",
                    "0",
                ]
            )

        if json_schema_file is not None:
            args.extend(
                [
                    "--json-schema-file",
                    str(
                        json_schema_file
                    ),
                ]
            )

        args.extend(
            [
                "-p",
                prompt,
            ]
        )

        completed = subprocess.run(
            args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=self.timeout_seconds,
            check=False,
        )

        if completed.returncode != 0:
            error = (
                completed.stderr
                or completed.stdout
                or "unknown llama.cpp error"
            )

            raise RuntimeError(
                error[-4000:]
            )

        output = (
            completed.stdout
            or ""
        ).strip()

        if not output:
            raise RuntimeError(
                "llama.cpp returned empty output"
            )

        return output
