# ALINA Analyst Core — журнал разработки и изменений KB

Назначение: фиксировать **что именно было придумано, что взято из источника, куда физически вставлено, почему принято решение и как оно проверяется**.

Этот журнал не хранит скрытую внутреннюю цепочку рассуждений модели. Он хранит воспроизводимое инженерное обоснование и provenance изменений.

---

## 1. Обязательный формат записи

Каждая значимая разработка или изменение Knowledge Base получает запись:

```text
DATE / COMMIT
TASK
WHAT CHANGED
WHY
ORIGIN_CLASS
SOURCE / DECISION
SOURCE LOCATOR
PHYSICAL PATHS
CANONICAL OBJECT IDS
DEPENDENCIES
VALIDATION / TEST
REVIEW STATUS
RESULT
NEXT STEP
```

Допустимые `origin_class` определены в:

```text
DZ_17/knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md
```

---

## 2. Правило для данных из ГОСТов, ISO, книг и официальной документации

Запись вида:

```text
«Добавлено по ГОСТ ...»
```

запрещена без следующих данных:

```text
source_ref
source_title
source_version_or_year
source_locator
acquisition_uri
accessed_at
source_file_path        # если оригинал есть локально
source_hash_sha256      # если оригинал есть локально
extraction_note_path
```

Если точный пункт ещё не проверен:

```text
locator_status = pending_verification
record_status = draft
```

Такой материал нельзя выдавать как подтверждённое требование стандарта.

---

## 3. Начальная инвентаризация состояния

### 2026-09-12 — Universal KB / dedup / provenance documentation

**COMMITS**

```text
1d9fb05b93595a98ec303db2812ef6ce13095f2c  provenance/storage policy
b5bbf77c2645591d131083279a6c5d0018150559  physical KB map
8215df099db29630473e68ecd9d7fafaa8df5e1e  materials workspace
2e2dd1f0b4466a836d577bfb16f3a57d8458753a  initial development journal
51185df6d020352bc07b9799be3853c4e749542d  universal KB README update
5ab097a36dbb86702b9fbd717e157825a3dcdad1  documentation index update
4f37715919b31fbf4024a83bfda2ff9527f45f75  source acquisition plan hardening
2ef9fb3cb114a99f940f617f7ccb7bcc849ee625  local-only originals/indexes guard
```

**TASK**  
Зафиксировать единую базу знаний для всех агентов, запретить дублирование и сделать физическое местонахождение знаний наблюдаемым.

**WHAT CHANGED**

Созданы правила provenance и физического хранения, физическая карта KB и рабочее место для исходных материалов. Обновлены главная карта документации, README базы и план обработки источников. Добавлен `.gitignore`, чтобы полные оригиналы и производные runtime-индексы по умолчанию оставались локальными.

**WHY**

В репозитории уже существуют несколько KB-подобных слоёв: Technology Registry, ранний Markdown knowledge pack, ALINA Analyst Meta-KB, Domain Profiles и прикладной KB Analyst. Без явной карты возникает риск повторного создания одинаковых знаний и потери происхождения данных.

**ORIGIN_CLASS**

```text
HUMAN_DECISION      — требование пользователя: одна универсальная база для всех агентов, специализации различаются;
PROJECT_DECISION    — canonical ID, reference-only inheritance, physical map, mandatory provenance contract;
```

**SOURCE / DECISION**

Использованы уже существующие проектные решения:

```text
docs/TECHNOLOGY_REGISTRY.md
registry/technologies.json
DZ_17/knowledge_base/README.md
DZ_17/knowledge_base/ANALYST_KB_SPEC.md
DZ_17/knowledge_base/SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md
```

В Technology Registry уже действует принцип «сначала искать готовое, потом reuse/improve/create». В Meta-KB уже действует разделение `Claim ≠ Fact`, provenance, review и Domain Profile inheritance. Новые документы не заменяют эти решения, а вводят единый governance-слой и карту расположения.

**SOURCE LOCATOR**

Для этой записи используются repository paths и текущие документы проекта. Внешние ГОСТ/книги в данном изменении **не извлекались и не цитировались как источник новых фактов**.

**PHYSICAL PATHS**

Созданы:

```text
DZ_17/knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md
DZ_17/knowledge_base/PHYSICAL_MAP.md
DZ_17/knowledge_base/materials/README.md
DZ_17/knowledge_base/materials/.gitignore
DZ_17/DEVELOPMENT_JOURNAL.md
```

Обновлены:

```text
DZ_17/knowledge_base/README.md
DZ_17/DOCUMENTATION_INDEX.md
DZ_17/knowledge_base/SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md
```

**CANONICAL OBJECT IDS**

Новые предметные объекты знания специально не создавались. Созданы governance/index documents. Существующие IDs продолжают использоваться из `source_registry.v1.json`, `analyst_method_cards.v1.json` и `registry/technologies.json`.

**VALIDATION / TEST**

Документальная проверка:

```text
- нет копии исходных ГОСТов/книг;
- нет нового параллельного source registry;
- существующий source_registry.v1.json остаётся библиографическим source of truth;
- PHYSICAL_MAP указывает реальные пути и отдельно помечает planned/local-only;
- rules запрещают SOURCE_DERIVED без exact locator;
- полные originals и runtime indexes защищены local-only .gitignore;
- ранее названные «подтверждённые открытые источники» в плане понижены до candidate/registered, пока не записаны exact URI/version/locator;
```

**REVIEW STATUS**

```text
accepted_by_user_direction / implementation documented
```

**RESULT**

Зафиксирована модель:

```text
UNIVERSAL FOUNDATION KB
        ↓ reference/inherit
ROLE PROFILE
        ↓
DOMAIN / TECH SPECIALIZATION
        ↓
PROJECT / TASK CONTEXT
```

Знания стандартов, методов и технологий не копируются в каталоги агентов.

**NEXT STEP**

1. Проаудировать `source_registry.v1.json`: для каждого источника определить `registered / original_available / extracted / locator_verified / reviewed`.
2. Для первого ГОСТа создать structure map и extraction notes с точными локаторами.
3. Проверить все `source_refs` в `analyst_method_cards.v1.json`; до проверки оригиналов сохранить карточки `draft`.
4. Ввести автоматический validator provenance/dedup.

---

## 4. Шаблон следующей записи

```markdown
### YYYY-MM-DD — <короткое название>

**COMMITS**
...

**TASK**
...

**WHAT CHANGED**
...

**WHY**
...

**ORIGIN_CLASS**
`SOURCE_DERIVED | PROJECT_DECISION | ASSISTANT_PROPOSAL | HUMAN_DECISION | BENCHMARK_MEASURED | INFERENCE | HYPOTHESIS`

**SOURCE / DECISION**
...

**SOURCE LOCATOR**
...

**PHYSICAL PATHS**
...

**CANONICAL OBJECT IDS**
...

**DEPENDENCIES**
...

**VALIDATION / TEST**
...

**REVIEW STATUS**
...

**RESULT**
...

**NEXT STEP**
...
```

---

## 5. Запрет на «тихие» изменения

Нельзя считать работу завершённой, если:

- создан новый KB-объект, но он не зарегистрирован;
- правило из внешнего источника не имеет `source_ref` и точного locator;
- проектная идея записана так, будто она взята из ГОСТа или книги;
- файл перемещён, но `PHYSICAL_MAP.md` не обновлён;
- создана вторая копия знания вместо ссылки на canonical ID;
- изменена методика, но не указана версия/supersedes;
- нет записи, какой commit/путь содержит изменение.
