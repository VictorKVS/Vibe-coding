from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

from build_152_staging import odt_paragraphs, classify, build_articles, norm_text, sha256_text


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def looks_like_152(path: Path) -> bool:
    name = path.name.lower()
    return (
        '152' in name
        or 'персональн' in name
        or 'personal' in name
    ) and path.suffix.lower() == '.odt'


def scan_candidates(root: Path) -> tuple[list[Path], list[dict]]:
    """Walk Windows trees without aborting on stale/missing/inaccessible folders."""
    candidates: set[Path] = set()
    scan_errors: list[dict] = []

    def onerror(exc: OSError) -> None:
        scan_errors.append({
            'path': getattr(exc, 'filename', None),
            'error': f'{type(exc).__name__}: {exc}',
        })

    for dirpath, _dirnames, filenames in os.walk(root, topdown=True, onerror=onerror, followlinks=False):
        base = Path(dirpath)
        for filename in filenames:
            if not filename.lower().endswith('.odt'):
                continue
            path = base / filename
            if looks_like_152(path):
                candidates.add(path)

    return sorted(candidates, key=lambda p: str(p).lower()), scan_errors


def inspect(path: Path) -> dict:
    display_path = str(path.absolute())
    try:
        raw_sha = file_sha256(path)
        size = path.stat().st_size
        paragraphs = odt_paragraphs(path)
        canonical, notes = classify(paragraphs)
        canonical_text = norm_text('\n\n'.join(canonical))
        articles = build_articles(canonical)
        article_numbers = [a['article_no'] for a in articles]
        has_expected_title = 'О персональных данных' in canonical_text
        has_article_1 = '1' in article_numbers
        has_article_25 = '25' in article_numbers
        looks_complete = (
            has_expected_title
            and has_article_1
            and has_article_25
            and len(canonical_text) > 30000
            and len(articles) >= 25
        )
        acceptance = {
            'has_expected_title': has_expected_title,
            'has_article_1': has_article_1,
            'has_article_25': has_article_25,
            'looks_complete': looks_complete,
        }
        return {
            'path': display_path,
            'source_sha256': raw_sha,
            'source_bytes': size,
            'paragraphs_extracted': len(paragraphs),
            'canonical_chars': len(canonical_text),
            'canonical_sha256': sha256_text(canonical_text),
            'articles_count': len(articles),
            'article_numbers': article_numbers,
            'change_notes_count': len(notes),
            'acceptance': acceptance,
            'error': None,
        }
    except Exception as exc:
        return {
            'path': display_path,
            'error': f'{type(exc).__name__}: {exc}',
        }


def main() -> int:
    ap = argparse.ArgumentParser(description='Compare local 152-FZ ODT candidates without DB writes')
    ap.add_argument('--root', default=r'G:\1', type=Path)
    ap.add_argument('--output', default=Path('../database_snapshots/staging/152-fz/source-comparison.json'), type=Path)
    args = ap.parse_args()

    root = args.root.absolute()
    if not root.exists():
        raise SystemExit(f'Root not found: {root}')

    candidates, scan_errors = scan_candidates(root)
    rows = [inspect(p) for p in candidates]

    by_source_sha: dict[str, list[str]] = {}
    by_canonical_sha: dict[str, list[str]] = {}
    for row in rows:
        source_sha = row.get('source_sha256')
        if source_sha:
            by_source_sha.setdefault(source_sha, []).append(row['path'])
        csha = row.get('canonical_sha256')
        if csha:
            by_canonical_sha.setdefault(csha, []).append(row['path'])

    successful = [r for r in rows if not r.get('error')]
    ranked = sorted(
        successful,
        key=lambda r: (
            bool(r['acceptance']['looks_complete']),
            bool(r['acceptance']['has_expected_title']),
            r['articles_count'],
            r['canonical_chars'],
            r['source_bytes'],
        ),
        reverse=True,
    )

    report = {
        'status': 'STAGING_ONLY',
        'database_write': False,
        'root': str(root),
        'candidate_count': len(rows),
        'successful_count': len(successful),
        'scan_error_count': len(scan_errors),
        'scan_errors': scan_errors,
        'source_sha_groups': by_source_sha,
        'canonical_sha_groups': by_canonical_sha,
        'recommended_candidate': ranked[0] if ranked else None,
        'candidates': rows,
    }

    out = args.output.absolute()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

    print(json.dumps({
        'status': report['status'],
        'candidate_count': report['candidate_count'],
        'successful_count': report['successful_count'],
        'scan_error_count': report['scan_error_count'],
        'unique_source_files': len(by_source_sha),
        'unique_canonical_texts': len(by_canonical_sha),
        'recommended_candidate': report['recommended_candidate'],
        'output': str(out),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
