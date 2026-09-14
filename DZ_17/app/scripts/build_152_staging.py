from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET

ARTICLE_RE = re.compile(r'^Статья\s+(\d+(?:\.\d+)*)\.\s*(.*)$', re.I)
PAGE_STAMP_RE = re.compile(r'^\d{2}/\d{2}/\d{4}\s+Система\s+ГАРАНТ\b', re.I)
COMMENT_PREFIXES = (
    'ГАРАНТ:',
    'Информация об изменениях:',
    'См. предыдущую редакцию',
    'См. текст ',
    'См. будущую редакцию',
    'См. комментарии ',
)
CHANGE_RE = re.compile(
    r'^(?:Федеральным законом|Статья|Часть|Пункт|Подпункт|Абзац|Настоящий Федеральный закон).*',
    re.I,
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def norm_text(text: str) -> str:
    text = text.replace('\ufeff', '').replace('\u00ad', '')
    text = re.sub(r'[ \t\r\f\v]+', ' ', text)
    text = re.sub(r' *\n *', '\n', text)
    return text.strip()


def odt_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as zf:
        xml = zf.read('content.xml')
    root = ET.fromstring(xml)
    out: list[str] = []
    for elem in root.iter():
        local = elem.tag.rsplit('}', 1)[-1]
        if local not in {'p', 'h'}:
            continue
        text = norm_text(''.join(elem.itertext()))
        if text:
            out.append(text)
    return out


def classify(paragraphs: list[str]) -> tuple[list[str], list[dict]]:
    canonical: list[str] = []
    notes: list[dict] = []
    in_change_note = False
    article = None

    for raw in paragraphs:
        p = norm_text(raw)
        if not p or PAGE_STAMP_RE.match(p):
            continue
        m = ARTICLE_RE.match(p)
        if m:
            article = m.group(1)
            canonical.append(p)
            in_change_note = False
            continue
        if p == 'Информация об изменениях:':
            in_change_note = True
            continue
        if p.startswith(COMMENT_PREFIXES):
            notes.append({'article': article, 'kind': 'comment', 'text': p})
            continue
        if in_change_note and CHANGE_RE.match(p):
            notes.append({'article': article, 'kind': 'change_note', 'text': p})
            continue
        # Current legal wording resumes on numbered clauses or ordinary body text.
        in_change_note = False
        canonical.append(p)

    return canonical, notes


def build_articles(canonical: list[str]) -> list[dict]:
    articles: list[dict] = []
    current: dict | None = None
    for p in canonical:
        m = ARTICLE_RE.match(p)
        if m:
            if current:
                current['text'] = '\n'.join(current.pop('_parts'))
                current['sha256'] = sha256_text(current['text'])
                articles.append(current)
            current = {
                'article_no': m.group(1),
                'heading': m.group(2).strip(),
                '_parts': [p],
            }
        elif current:
            current['_parts'].append(p)
    if current:
        current['text'] = '\n'.join(current.pop('_parts'))
        current['sha256'] = sha256_text(current['text'])
        articles.append(current)
    return articles


def main() -> int:
    ap = argparse.ArgumentParser(description='Build read-only staging package for 152-FZ from ODT')
    ap.add_argument('--input', required=True, type=Path)
    ap.add_argument('--output-dir', default=Path('../database_snapshots/staging/152-fz'), type=Path)
    ap.add_argument('--as-of', default='2026-09-14')
    args = ap.parse_args()

    src = args.input.resolve()
    if not src.exists():
        raise SystemExit(f'Input not found: {src}')
    date.fromisoformat(args.as_of)

    raw = src.read_bytes()
    paragraphs = odt_paragraphs(src)
    canonical, notes = classify(paragraphs)
    canonical_text = norm_text('\n\n'.join(canonical))
    articles = build_articles(canonical)

    out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    (out / '152-fz.canonical.txt').write_text(canonical_text, encoding='utf-8')
    (out / '152-fz.change-notes.json').write_text(
        json.dumps(notes, ensure_ascii=False, indent=2), encoding='utf-8'
    )

    report = {
        'status': 'STAGING_ONLY',
        'database_write': False,
        'document_code': 'FZ-152',
        'document_id': 'e6adee9c-5e22-47b9-ba33-269b7e67414a',
        'as_of': args.as_of,
        'source_file': str(src),
        'source_sha256': sha256_bytes(raw),
        'source_bytes': len(raw),
        'paragraphs_extracted': len(paragraphs),
        'canonical_chars': len(canonical_text),
        'canonical_sha256': sha256_text(canonical_text),
        'articles_count': len(articles),
        'article_numbers': [a['article_no'] for a in articles],
        'change_notes_count': len(notes),
        'articles': articles,
        'acceptance': {
            'has_expected_title': 'О персональных данных' in canonical_text,
            'has_article_1': any(a['article_no'] == '1' for a in articles),
            'has_article_25': any(a['article_no'] == '25' for a in articles),
            'looks_complete': len(canonical_text) > 30000 and len(articles) >= 25,
        },
    }
    (out / '152-fz.staging.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8'
    )

    print(json.dumps({
        'status': report['status'],
        'source_sha256': report['source_sha256'],
        'canonical_sha256': report['canonical_sha256'],
        'canonical_chars': report['canonical_chars'],
        'articles_count': report['articles_count'],
        'change_notes_count': report['change_notes_count'],
        'acceptance': report['acceptance'],
        'output_dir': str(out),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
