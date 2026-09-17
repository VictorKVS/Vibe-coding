# Legal / Information Security Document Intake

Status: `IMPLEMENTED P0 / EVOLVING`

Origin class: `HUMAN_DECISION + PROJECT_DECISION`

## Цель

Обрабатывать локальный каталог документов **строго по одному файлу**, читать содержимое, восстанавливать юридически значимое полное название независимо от сокращённого имени файла, регистрировать provenance и помещать результат в общую Knowledge Base без дублей.

```text
DOWNLOADS
→ ONE FILE
→ SHA-256
→ READ PDF
→ IDENTIFY DOCUMENT FROM CONTENT
→ DEDUP SOURCE/CAPTURE
→ REGISTER IN KNOWLEDGE FACTORY
→ DOMAIN ROUTING
→ PROPOSED LEGAL-IB REGISTRY RECORD
→ OFFICIAL STATUS VERIFICATION
→ STRUCTURE / REQUIREMENTS EXTRACTION
→ REVIEW
→ VERIFIED KB
```

## 1. Почему имя файла не является названием

При скачивании браузер/сайт может сократить или исказить имя файла. Поэтому поле `full_title` запрещено заполнять только из filename.

Filename хранится локально как alias. Юридически значимые поля извлекаются из самого документа:

```text
document_type
issuer
document_number
document_date
subject
full_title
```

Для каждого поля сохраняется evidence с номером страницы и коротким наблюдаемым фрагментом.

## 2. Последовательная обработка

Команда по умолчанию берёт только следующий ещё не обработанный PDF:

```powershell
npm run kf:intake-downloads
```

Каталог по умолчанию:

```text
%USERPROFILE%\Downloads
```

Можно указать другой:

```powershell
npm run kf:intake-downloads -- --input-dir "D:\Docs"
```

Обработать весь каталог можно только последовательно, без параллельного чтения документов:

```powershell
npm run kf:intake-downloads -- --input-dir "D:\Docs" --all 1
```

`--all` означает цикл `one-by-one`, а не параллельную обработку.

## 3. Идентификация

P0 детерминированно распознаёт как минимум:

```text
Федеральный закон
Указ Президента РФ
Постановление Правительства РФ
Приказ
ГОСТ / ГОСТ Р / ISO-derived standard
Методические рекомендации
Требования
Положение
Письмо
```

Отдельно определяется issuer, например:

```text
Правительство РФ
Президент РФ
ФСТЭК России
ФСБ России
Роскомнадзор
Минцифры России
```

Для ИБ ставятся domain tags, например:

```text
personal_data
kii
information_security
state_secret
cryptography
fstec
fsb
gis_security
```

## 4. Domain routing

```text
legal + IB       → legal_ib
standard + IB    → standards_ib
IB reference     → ib_reference
legal, not IB    → legal_general
standard, not IB → standards_general
other            → unclassified
```

Автоматически в канонический `legal_ib` registry записываются только высокоуверенные карточки без обязательных пропусков. Даже они получают:

```text
status = proposed
review_status = pending
legal_status = pending_official_verification
```

Никакой локальный PDF сам по себе не считается доказательством того, что нормативный акт действует на текущую дату.

## 5. Source / Capture dedup

Capture определяется SHA-256 файла.

Для юридического документа Source получает стабильный ID из наблюдаемой юридической идентичности (`type + issuer + number + date`). Поэтому две скачанные редакции одного акта могут относиться к одному Source и разным Capture.

Если идентичность недостаточна, Source временно остаётся hash-based и требует дальнейшего reconciliation.

## 6. Физическое хранение

Локально, вне Git:

```text
DZ_17/app/runtime/legal-intake/
├── intake-state.v1.json
├── extracts/
│   └── <SHA16>.json
└── candidates/
    └── <SHA16>.json
```

Knowledge Factory:

```text
DZ_17/app/runtime/knowledge-factory/
├── sources/
├── captures/
├── spans/
└── ...
```

Канонический доменный registry:

```text
DZ_17/knowledge_base/domains/legal_ib/document_registry.v1.json
```

Локальные абсолютные пути в канонический registry не переносятся.

## 7. Требования к дальнейшей юридической обработке

После identity stage документ должен пройти:

```text
OFFICIAL SOURCE CHECK
→ current status / amendments / repeal / draft state
→ STRUCTURE
   article / clause / subclause / appendix / table
→ REQUIREMENTS EXTRACTION
→ SUBJECT / OBJECT / CONDITION / ACTION / DEADLINE / EXCEPTION
→ CROSS-REFERENCES
→ CONTRADICTIONS / SUPERSEDES
→ REVIEW
```

До этого момента система знает, **что это за документ и где он лежит**, но не должна утверждать, что все его нормы уже разобраны или что акт актуален.

## 8. Fail-safe

- сокращённый filename никогда не заменяет title из текста;
- низкая уверенность → `needs_review`;
- не найден номер/предмет нормативного акта → без auto-publish;
- одинаковый SHA-256 → duplicate skip;
- похожий номер уже в registry → `possible_same_document_ids`, без скрытого merge;
- OCR-плохой PDF остаётся parser/review problem, а не «прочитанным» документом;
- verified/legal-current статус не выставляется автоматически.
