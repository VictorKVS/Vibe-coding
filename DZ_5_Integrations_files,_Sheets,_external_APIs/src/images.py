from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from PIL import Image, ImageOps


def normalize_image(path: str | Path, output_dir: str | Path) -> Dict[str, Any]:
    src = Path(path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{src.stem}_normalized.png"

    with Image.open(src) as img:
        original_format = img.format
        exif = {}
        try:
            raw_exif = img.getexif()
            exif = {str(k): str(v) for k, v in raw_exif.items()}
        except Exception:
            pass

        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        img.save(out, format="PNG", optimize=True)

        return {
            "normalized_path": str(out),
            "width": img.width,
            "height": img.height,
            "mode": img.mode,
            "original_format": original_format,
            "exif": exif,
        }
