# ALINA Legal / IB Document Intake — acceptance record

Дата: 2026-09-14

Origin class:

```text
HUMAN_DECISION + PROJECT_DECISION
```

Пользователь задал правило: локальные документы из Downloads обрабатывать по одному; сокращённое имя файла не считать названием; читать документ, восстанавливать полное юридическое название и реквизиты из содержания, регистрировать в базе данных/Knowledge Factory и общей Knowledge Base без дублей.

## Реализованный путь

```text
Downloads
→ select ONE pending PDF
→ SHA-256
→ extract page-addressable text
→ deterministic identity from document text
→ source/capture dedup
→ Knowledge Factory ingest
→ domain routing
→ runtime candidate
→ high-confidence legal_ib / standards_ib → PROPOSED canonical registry record
→ official-status verification required
→ later structure / requirements / review
```

## Что именно определяется

```text
full_title
document_type
issuer
document_number
document_date_raw
document_date_iso
subject
security_tags
collection
title_confidence
needs_review
page evidence
```

Filename сохраняется только в local runtime candidate как alias. Он не является юридически значимым evidence для `full_title`.

## Физические пути

### Код

```text
DZ_17/app/scripts/lib/document-identity.mjs
DZ_17/app/scripts/intake-downloads-one-by-one.mjs
DZ_17/app/scripts/ingest-pdf-kf.mjs
DZ_17/app/scripts/extract-pdf-text.py
DZ_17/app/scripts/document-intake-selftest.mjs
```

### Runtime local-only

```text
DZ_17/app/runtime/legal-intake/
├── intake-state.v1.json
├── extracts/<SHA16>.json
└── candidates/<SHA16>.json

DZ_17/app/runtime/knowledge-factory/
├── sources/
├── captures/
├── spans/
└── ...
```

`runtime/legal-intake/` добавлен в `.gitignore`.

### Каноническая Knowledge Base

```text
DZ_17/knowledge_base/domains/legal_ib/README.md
DZ_17/knowledge_base/domains/legal_ib/document_registry.v1.json
```

### Процесс

```text
DZ_17/processes/LEGAL_DOCUMENT_INTAKE.md
DZ_17/processes/FATHER_DOCUMENT_KNOWLEDGE_PIPELINE.md
```

## Dedup

```text
Capture key = SHA-256 file
Source key for sufficiently identified legal act = hash(type + issuer + number + date)
```

Это позволяет разным скачанным файлам/редакциям одного юридического акта ссылаться на стабильный Source, сохраняя отдельные Capture. Если юридическая идентичность недостаточна, временно используется hash-based Source и запись получает review.

## Domain routing

```text
legal + IB       → legal_ib
standard + IB    → standards_ib
IB reference     → ib_reference
legal, not IB    → legal_general
standard, not IB → standards_general
other            → unclassified
```

Пока автоматически в Git-registry попадают только high-confidence `legal_ib` / `standards_ib` записи и только как:

```text
status = proposed
review_status = pending
legal_status = pending_official_verification
```

Никакой локальный документ не получает `verified/current` автоматически.

## Команды

Один следующий документ из стандартного Downloads:

```powershell
cd "G:\1\Vibe coding\Vibe-coding\DZ_17\app"
npm run kf:intake-downloads
```

Другой каталог:

```powershell
npm run kf:intake-downloads -- --input-dir "D:\Documents"
```

Весь каталог, но строго последовательно:

```powershell
npm run kf:intake-downloads -- --input-dir "D:\Documents" --all 1
```

## Связанные commits

```text
60cce202fbdc912a8ec38562a2102cf97acae445  initial deterministic document identity resolver
141380bef31cc15d28072d737f24fbfee78fb810  canonical legal IB document registry
a86dc7a680ccf3c194e79aa7891c07df6efb0a82  legal IB domain rules
70e1a41af1f09fdeaa1cd369348c24514bd21a6d  stable Source ID support in PDF ingest
15bdf212015099659ff8cc4e59640c6e31a14e24  sequential Downloads intake
33d477d110b6050df59e3b2b4cdbca7e17209b9b  identity fixtures
ab3694a4db8f1e47dacb26e08f1cc87e4ea62c22  npm commands
75f3f17f483d527a1f15bcfd77a7e43f539249a9  local runtime ignore
56a5d43217afd928df8beec7a1b0fc4709edd696  dedicated intake CI
5ea31414358bdae04545ec6a40e581f8748739aa  documented intake algorithm
11cdba8dcb4e8ab2724eddefb20dade99aa787ef  split legal-heading recognition fix
65333723d9a0d2b9f0743c44f2fcb97cfe4c95d0  Cyrillic marker boundary fix
```

## Не считать завершённым

P0 ещё не означает, что документ полностью юридически разобран. Следующие обязательные слои:

```text
1. official source / current legal status verification;
2. legal structure: article / clause / subclause / appendix;
3. requirement extraction: subject → action → object → condition → deadline → exception;
4. cross-reference graph and supersedes/amendments;
5. contradiction detection;
6. authorized review → verified canonical knowledge.
```

Это следующие этапы, а не скрыто подразумеваемая часть текущего intake.
