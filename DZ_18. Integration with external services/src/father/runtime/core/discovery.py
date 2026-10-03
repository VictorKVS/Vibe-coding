from __future__ import annotations

import json
import urllib.request


def get_json(url: str, timeout: float = 5.0):
    with urllib.request.urlopen(
        url,
        timeout=timeout,
    ) as response:
        return json.loads(
            response.read().decode("utf-8")
        )


def discover_ollama():
    print()
    print("OLLAMA MODEL ZOO")
    print("-" * 78)

    try:
        data = get_json(
            "http://127.0.0.1:11434/api/tags"
        )

        models = data.get("models", [])

        if not models:
            print("No Ollama models found.")
            return []

        result = []

        for model in models:
            details = model.get("details", {})

            name = model.get("name", "?")
            size = model.get("size", 0)

            result.append(name)

            print(
                f"{name:<42}"
                f"{size / 1024**3:>7.2f} GB   "
                f"{details.get('parameter_size', '')}"
            )

        return result

    except Exception as exc:
        print(f"OLLAMA ERROR: {exc}")
        return []


def discover_comfyui():
    print()
    print("COMFYUI IMAGE ZOO")
    print("-" * 78)

    try:
        stats = get_json(
            "http://127.0.0.1:8188/system_stats"
        )

        print("ComfyUI API: READY")

        devices = (
            stats
            .get("devices", [])
        )

        for device in devices:
            name = device.get("name", "?")
            vram_total = device.get("vram_total", 0)
            vram_free = device.get("vram_free", 0)

            print(
                f"Device: {name} | "
                f"VRAM free "
                f"{vram_free / 1024**3:.2f} / "
                f"{vram_total / 1024**3:.2f} GB"
            )

        print()
        print("CHECKPOINTS")
        print("-" * 78)

        data = get_json(
            "http://127.0.0.1:8188/"
            "object_info/CheckpointLoaderSimple"
        )

        node = data.get(
            "CheckpointLoaderSimple",
            {}
        )

        ckpt_data = (
            node
            .get("input", {})
            .get("required", {})
            .get("ckpt_name", [])
        )

        checkpoints = []

        if (
            ckpt_data
            and isinstance(ckpt_data[0], list)
        ):
            checkpoints = ckpt_data[0]

        if not checkpoints:
            print("No checkpoints returned.")
            return []

        for checkpoint in checkpoints:
            print(checkpoint)

        return checkpoints

    except Exception as exc:
        print(f"COMFYUI ERROR: {exc}")
        return []


if __name__ == "__main__":
    print()
    print("=" * 78)
    print("FATHER MODEL ZOO DISCOVERY")
    print("=" * 78)

    ollama_models = discover_ollama()
    image_models = discover_comfyui()

    print()
    print("=" * 78)
    print("DISCOVERY SUMMARY")
    print("=" * 78)

    print(
        f"Ollama models:     {len(ollama_models)}"
    )

    print(
        f"Image checkpoints: {len(image_models)}"
    )

    print("=" * 78)
