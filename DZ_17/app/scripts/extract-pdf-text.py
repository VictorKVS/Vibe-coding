#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract page text from a PDF into JSON for ALINA Translator.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        from pypdf import PdfReader
    except Exception:
        print(
            "[ALINA] Python package 'pypdf' is required. Install it with:\n"
            "  python -m pip install --user pypdf",
            file=sys.stderr,
        )
        return 2

    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    if not input_path.exists():
        print(f"[ALINA] PDF not found: {input_path}", file=sys.stderr)
        return 3

    reader = PdfReader(str(input_path))
    pages = []
    nonempty = 0
    for index, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            text = ""
            extraction_error = str(exc)
        else:
            extraction_error = None
        text = text.replace("\u0000", "").replace("\r\n", "\n").replace("\r", "\n")
        if text.strip():
            nonempty += 1
        pages.append(
            {
                "page_number": index,
                "text": text,
                "chars": len(text),
                "extraction_error": extraction_error,
            }
        )

    metadata = {}
    try:
        raw = reader.metadata or {}
        for key, value in raw.items():
            if value is not None:
                metadata[str(key)] = str(value)
    except Exception:
        metadata = {}

    payload = {
        "schema_version": "alina-pdf-extract-v1",
        "source_path": str(input_path),
        "page_count": len(pages),
        "nonempty_pages": nonempty,
        "metadata": metadata,
        "pages": pages,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[ALINA] PDF pages: {len(pages)}; text pages: {nonempty}")
    print(f"[ALINA] Extract: {output_path}")
    if pages and nonempty / len(pages) < 0.5:
        print("[ALINA] Warning: less than half of pages contain extracted text; the PDF may need OCR.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
