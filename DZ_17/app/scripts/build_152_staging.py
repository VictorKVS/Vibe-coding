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
EFFECTIVE_DATE_RE = re.compile(
    r'\bс\s+(\d{1,2})\s+'
    r'(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+'
    r'(\d{4})\s*г\.?',
    re.I,
)
MONTHS = {
    'января': 1,
    'февраля': 2,
    'марта': 3,
    'апреля': 4,
    'мая': 5,
    'июня': 6,
    'июля': 7,
    'августа': 8,
    'сентября': 9,
    'октября': 10,
    'ноября': 11,
    'декабря': 12,
}


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


def classify(paragraphs: list[str]) -> tuple[list[str], list[dict], list[str]]:
    canonical: list[str] = []
    notes: list[dict] = []
    source_header_notes: list[str] = []
    in_change_note = False
    skip_change_history_line = False
    article = None

    for raw in paragraphs:
        p = norm_text(raw)
        if not p or PAGE_STAMP_RE.match(p):
            continue

        if p.startswith('С изменениями и дополнениями от:'):
            source_header_notes.append(p)
            skip_change_history_line = True
            continue
        if skip_change_history_line:
            source_header_notes.append(p)
            skip_change_history_line = False
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

    return canonical, notes, source_header_notes


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


def effective_date_from_text(text: str) -> date | None:
    m = EFFECTIVE_DATE_RE.search(text)
    if not m:
        return None
    day = int(m.group(1))
    month = MONTHS[m.group(2).lower()]
    year = int(m.group(3))
    try:
        return date(year, month, day)
    except ValueError:
        return None


def annotate_notes(notes: list[dict], as_of: date) -> list[dict]:
    result: list[dict] = []
    for note in notes:
        item = dict(note)
        eff = effective_date_from_text(item['text'])
        item['effective_from'] = eff.isoformat() if eff else None
        item['is_future_as_of'] = bool(eff and eff > as_of)
        result.append(item)
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description='Build read-only staging package for 152-FZ from ODT')
    ap.add_argument('--input', required=True, type=Path)
    ap.add_argument('--output-dir', default=Path('../database_snapshots/staging/152-fz'), type=Path)
    ap.add_argument('--as-of', default='2026-09-14')
    args = ap.parse_args()

    src = args.input.resolve()
    if not src.exists():
        raise SystemExit(f'Input not found: {src}')
    as_of = date.fromisoformat(args.as_of)

    raw = src.read_bytes()
    paragraphs = odt_paragraphs(src)
    canonical, notes, source_header_notes = classify(paragraphs)
    canonical_text = norm_text('\n\n'.join(canonical))
    articles = build_articles(canonical)
    notes = annotate_notes(notes, as_of)
    future_notes = [n for n in notes if n.get('is_future_as_of')]

    acceptance = {
        'has_expected_title': 'О персональных данных' in canonical_text,
        'has_article_1': any(a['article_no'] == '1' for a in articles),
        'has_article_25': any(a['article_no'] == '25' for a in articles),
        'no_garant_markers': 'ГАРАНТ:' not in canonical_text and 'Система ГАРАНТ' not in canonical_text,
        'no_future_editorial_markers': 'См. будущую редакцию' not in canonical_text,
        'looks_complete': len(canonical_text) > 30000 and len(articles) >= 25,
    }
    acceptance['ready_for_db_review'] = all(acceptance.values())

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
        'source_header_notes': source_header_notes,
        'canonical_chars': len(canonical_text),
        'canonical_sha256': sha256_text(canonical_text),
        'articles_count': len(articles),
        'article_numbers': [a['article_no'] for a in articles],
        'change_notes_count': len(notes),
        'future_change_notes_count': len(future_notes),
        'future_change_notes': future_notes,
        'articles': articles,
        'acceptance': acceptance,
    }
    (out / '152-fz.staging.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8'
    )

    print(json.dumps({
        'status': report['status'],
        'database_write': report['database_write'],
        'source_sha256': report['source_sha256'],
        'canonical_sha256': report['canonical_sha256'],
        'canonical_chars': report['canonical_chars'],
        'articles_count': report['articles_count'],
        'change_notes_count': report['change_notes_count'],
        'future_change_notes_count': report['future_change_notes_count'],
        'acceptance': report['acceptance'],
        'output_dir': str(out),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
