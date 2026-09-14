from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

DOCUMENT_ID = "e6adee9c-5e22-47b9-ba33-269b7e67414a"
DOCUMENT_CODE = "FZ-152"
EXPECTED_SOURCE_SHA = "9a1607881b504374386a4020e0fa957b84dfc522ee513443dfe66c9bf62b3ebb"
EXPECTED_CANONICAL_SHA = "6932b37eb2760db45873a0bcb727c228d483459524ce51f640309dbca0b481fb"
AS_OF = "2026-09-14"
EDITION_EFFECTIVE_FROM = "2026-07-26"
OFFICIAL_PRAVO_ND = "102108261"
OFFICIAL_URL = "https://pravo.gov.ru/proxy/ips/?docbody=&nd=102108261"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def dollar_quote(value: str, seed: str) -> str:
    tag = re.sub(r"[^A-Za-z0-9_]", "_", seed)[:40] or "txt"
    marker = f"${tag}$"
    while marker in value:
        tag += "x"
        marker = f"${tag}$"
    return f"{marker}{value}{marker}"


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate deterministic SQL import for staged 152-FZ")
    ap.add_argument(
        "--staging",
        type=Path,
        default=Path("../database_snapshots/staging/152-fz/152-fz.staging.json"),
    )
    ap.add_argument(
        "--canonical",
        type=Path,
        default=Path("../database_snapshots/staging/152-fz/152-fz.canonical.txt"),
    )
    ap.add_argument(
        "--output",
        type=Path,
        default=Path("../database_snapshots/staging/152-fz/152-fz.import.sql"),
    )
    args = ap.parse_args()

    staging_path = args.staging.resolve()
    canonical_path = args.canonical.resolve()
    output_path = args.output.resolve()

    report = json.loads(staging_path.read_text(encoding="utf-8"))
    canonical_text = canonical_path.read_text(encoding="utf-8").strip()

    acceptance = report.get("acceptance", {})
    if not acceptance.get("ready_for_db_review"):
        raise SystemExit("Staging is not ready_for_db_review")
    if report.get("database_write") is not False:
        raise SystemExit("Unexpected staging state: database_write must be false")
    if report.get("document_id") != DOCUMENT_ID:
        raise SystemExit(f"Unexpected document_id: {report.get('document_id')}")
    if report.get("document_code") != DOCUMENT_CODE:
        raise SystemExit(f"Unexpected document_code: {report.get('document_code')}")
    if report.get("as_of") != AS_OF:
        raise SystemExit(f"Unexpected as_of: {report.get('as_of')}")
    if report.get("source_sha256") != EXPECTED_SOURCE_SHA:
        raise SystemExit("Source SHA-256 changed since source selection")
    if report.get("canonical_sha256") != EXPECTED_CANONICAL_SHA:
        raise SystemExit("Staging canonical SHA-256 changed")
    if sha256_text(canonical_text) != EXPECTED_CANONICAL_SHA:
        raise SystemExit("Canonical text file SHA-256 does not match staging report")

    articles = report.get("articles", [])
    if len(articles) != 30:
        raise SystemExit(f"Expected 30 articles, got {len(articles)}")
    article_numbers = [str(a.get("article_no")) for a in articles]
    if article_numbers[0] != "1" or article_numbers[-1] != "25":
        raise SystemExit("Article sequence boundary check failed")

    for article in articles:
        text = article["text"]
        if sha256_text(text) != article["sha256"]:
            raise SystemExit(f"Article {article['article_no']} SHA-256 mismatch")

    source_file = report.get("source_file", "")
    future_count = int(report.get("future_change_notes_count", 0))
    metadata = {
        "document_code": DOCUMENT_CODE,
        "as_of": AS_OF,
        "canonical_sha256": EXPECTED_CANONICAL_SHA,
        "source_kind": "GARANT_WORKING_COPY",
        "source_authority_note": "Secondary working capture; exact full-text official comparison pending",
        "official_identity": {"portal": "pravo.gov.ru", "nd": OFFICIAL_PRAVO_ND},
        "future_change_notes_count": future_count,
        "staging_gate": "ready_for_db_review",
        "verification_gate": "PENDING_EXACT_OFFICIAL_FULLTEXT_COMPARISON",
    }

    lines: list[str] = []
    lines += [
        "-- GENERATED FILE. DO NOT EDIT BY HAND.",
        "-- FATHER 152-FZ candidate import v1",
        "-- Source text is staged and hash-locked but remains UNVERIFIED until exact official comparison.",
        "\\encoding UTF8",
        "\\pset pager off",
        "BEGIN;",
        "",
        "DO $$",
        "BEGIN",
        f"  IF NOT EXISTS (SELECT 1 FROM normative.documents WHERE id = '{DOCUMENT_ID}'::uuid AND doc_code = '{DOCUMENT_CODE}') THEN",
        "    RAISE EXCEPTION 'Canonical FZ-152 document row not found or identity mismatch';",
        "  END IF;",
        "  IF EXISTS (",
        "    SELECT 1 FROM normative.document_versions",
        f"    WHERE document_id = '{DOCUMENT_ID}'::uuid AND version_no = 1",
        f"      AND coalesce(metadata->>'canonical_sha256','') <> '{EXPECTED_CANONICAL_SHA}'",
        "  ) THEN",
        "    RAISE EXCEPTION 'Version 1 already exists with a different canonical hash';",
        "  END IF;",
        "END;",
        "$$;",
        "",
        "INSERT INTO normative.document_versions (",
        "  document_id, version_no, edition_label, legal_status, verification_status,",
        "  source_authority_level, source_url, source_capture_ref, source_sha256,",
        "  canonical_text, effective_from, metadata",
        ") VALUES (",
        f"  '{DOCUMENT_ID}'::uuid,",
        "  1,",
        "  'Редакция по состоянию на 14.09.2026; изменения по 26.07.2026',",
        "  'EFFECTIVE',",
        "  'UNVERIFIED',",
        "  'A2',",
        f"  {sql_literal(OFFICIAL_URL)},",
        f"  {sql_literal(source_file)},",
        f"  '{EXPECTED_SOURCE_SHA}',",
        f"  {dollar_quote(canonical_text, 'fz152canonical')},",
        f"  DATE '{EDITION_EFFECTIVE_FROM}',",
        f"  {sql_literal(json.dumps(metadata, ensure_ascii=False))}::jsonb",
        ")",
        "ON CONFLICT (document_id, version_no) DO NOTHING;",
        "",
        "DO $$",
        "DECLARE",
        "  v_version_id uuid;",
        "  v_root_id uuid;",
        "BEGIN",
        "  SELECT id INTO STRICT v_version_id",
        "  FROM normative.document_versions",
        f"  WHERE document_id = '{DOCUMENT_ID}'::uuid AND version_no = 1;",
        "",
        "  INSERT INTO normative.document_fragments (",
        "    version_id, fragment_type, ordinal, canonical_key, locator, heading, text_content, is_atomic, metadata",
        "  ) VALUES (",
        "    v_version_id, 'document', 0, 'document', 'document',",
        "    'Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных»',",
        "    '', false, '{\"projection\":\"root\"}'::jsonb",
        "  )",
        "  ON CONFLICT (version_id, canonical_key) DO NOTHING;",
        "",
        "  SELECT id INTO STRICT v_root_id",
        "  FROM normative.document_fragments",
        "  WHERE version_id = v_version_id AND canonical_key = 'document';",
    ]

    for ordinal, article in enumerate(articles, start=1):
        no = str(article["article_no"])
        heading = str(article.get("heading") or "")
        text = str(article["text"])
        text_sha = str(article["sha256"])
        article_meta = json.dumps(
            {
                "document_code": DOCUMENT_CODE,
                "as_of": AS_OF,
                "source_sha256": EXPECTED_SOURCE_SHA,
                "canonical_sha256": EXPECTED_CANONICAL_SHA,
                "staging_article_no": no,
            },
            ensure_ascii=False,
        )
        lines += [
            "",
            "  INSERT INTO normative.document_fragments (",
            "    version_id, parent_fragment_id, fragment_type, ordinal, canonical_key, locator,",
            "    heading, text_content, text_sha256, source_section, is_atomic, metadata",
            "  ) VALUES (",
            "    v_version_id, v_root_id, 'article',",
            f"    {ordinal},",
            f"    {sql_literal('article.' + no)},",
            f"    {sql_literal('Статья ' + no)},",
            f"    {sql_literal(heading)},",
            f"    {dollar_quote(text, 'article_' + no.replace('.', '_'))},",
            f"    '{text_sha}',",
            f"    {sql_literal('Статья ' + no)},",
            "    false,",
            f"    {sql_literal(article_meta)}::jsonb",
            "  )",
            "  ON CONFLICT (version_id, canonical_key) DO NOTHING;",
        ]

    lines += [
        "",
        "  INSERT INTO workbench.events (actor_ref, actor_role, event_type, entity_type, entity_id, reason, trace_id, payload)",
        "  SELECT",
        "    'father-importer', 'SYSTEM', 'NORMATIVE_VERSION_IMPORTED', 'normative.document_version', v_version_id,",
        "    'Imported staged FZ-152 candidate after deterministic hash and structure checks',",
        "    'FZ152-V1-IMPORT',",
        f"    {sql_literal(json.dumps({'document_code': DOCUMENT_CODE, 'version_no': 1, 'verification_status': 'UNVERIFIED', 'canonical_sha256': EXPECTED_CANONICAL_SHA}, ensure_ascii=False))}::jsonb",
        "  WHERE NOT EXISTS (",
        "    SELECT 1 FROM workbench.events",
        "    WHERE event_type = 'NORMATIVE_VERSION_IMPORTED' AND trace_id = 'FZ152-V1-IMPORT'",
        "  );",
        "END;",
        "$$;",
        "",
        "COMMIT;",
        "",
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")

    summary = {
        "status": "DB_IMPORT_PREPARED",
        "database_write": False,
        "document_id": DOCUMENT_ID,
        "version_no": 1,
        "verification_status": "UNVERIFIED",
        "source_authority_level": "A2",
        "source_sha256": EXPECTED_SOURCE_SHA,
        "canonical_sha256": EXPECTED_CANONICAL_SHA,
        "articles": len(articles),
        "future_change_notes_count": future_count,
        "output_sql": str(output_path),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
