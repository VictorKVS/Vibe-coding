# ALINA Knowledge Base — политика происхождения, хранения и трассировки

## 1. Назначение

Этот документ задаёт обязательные правила для **универсальной базы знаний всех агентов**. Один объект знания хранится один раз и переиспользуется ссылками из профилей Аналитика, Программиста, Security, OSINT и других агентов.

Главный принцип:

```text
ONE KNOWLEDGE OBJECT
→ ONE CANONICAL ID
→ ONE SOURCE OF TRUTH
→ MANY AGENTS MAY REFERENCE IT
→ ZERO COPY-PASTE DUPLICATES
```

Перед созданием нового объекта всегда выполняется поиск существующего объекта в `source_registry.v1.json`, `analyst_method_cards.v1.json`, `registry/technologies.json` и связанных индексах. Если объект найден — он переиспользуется или версионируется, но не копируется.

---

## 2. Обязательная маркировка происхождения

Каждое знание, правило, алгоритм, метод, порог, формула или архитектурное решение должно иметь `origin_class`.

| `origin_class` | Что означает | Можно считать подтверждённым фактом? |
|---|---|---|
| `SOURCE_DERIVED` | извлечено из проверенного ГОСТ/ISO/W3C/NIST/книги/статьи/официальной документации | только при точном `source_ref` и `source_locator` |
| `PROJECT_DECISION` | решение, принятое внутри проекта ALINA | да как факт о проектном решении, но не как внешний научный факт |
| `ASSISTANT_PROPOSAL` | предложено LLM/ассистентом как вариант | нет, пока не прошло review |
| `HUMAN_DECISION` | явно утверждено человеком | да как решение проекта |
| `BENCHMARK_MEASURED` | получено из теста/benchmark/телеметрии | да в пределах конкретного теста и версии |
| `INFERENCE` | аналитический вывод из нескольких источников | нет как первичный факт; нужен evidence map |
| `HYPOTHESIS` | рабочая версия | нет |

Нельзя выдавать `ASSISTANT_PROPOSAL`, `INFERENCE` или `HYPOTHESIS` за данные стандарта или книги.

---

## 3. Минимальный provenance-контракт

Для любого `SOURCE_DERIVED` объекта обязательны поля:

```text
record_id
origin_class
source_ref
source_title
source_version_or_year
source_locator
acquisition_uri
accessed_at
source_file_path        # если оригинал законно предоставлен локально
source_hash_sha256      # если есть локальный файл
extraction_note_path
created_by
review_status
record_status
supersedes              # если это новая версия
```

### Правило локатора

`source_locator` должен указывать место, откуда извлечено знание:

```text
ГОСТ/ISO:   раздел / пункт / подпункт / таблица / приложение
книга:      глава / раздел / страница или стабильный номер секции
W3C/NIST:   раздел / heading / stable fragment id
код:        repository path + symbol/function + commit SHA
benchmark:  test id + dataset/version + run id
```

Если точный локатор не проверен по оригиналу, ставится:

```text
locator_status = pending_verification
```

Такое знание остаётся `draft` и не может автоматически переходить в `verified`.

---

## 4. Что означает `registered`

Запись источника в `source_registry.v1.json` со статусом `registered` означает только:

> источник известен системе и внесён в библиографический реестр.

Это **не означает**, что:

- оригинал скачан;
- текст полностью прочитан;
- конкретные пункты проверены;
- методическая карточка подтверждена данным источником;
- источник разрешено хранить в Git.

До проверки оригинала связанные Method Cards сохраняют статус `draft`.

---

## 5. Физическое хранение источников

Канонический каталог Meta/Universal KB:

```text
DZ_17/knowledge_base/
```

Рабочие оригиналы стандартов и книг не считаются частью Git-репозитория автоматически. Их физическое место на машине проекта определено как:

```text
DZ_17/knowledge_base/materials/originals/<SOURCE_ID>/
```

Для каждого обработанного источника рядом создаётся собственный слой результатов:

```text
DZ_17/knowledge_base/materials/extracts/<SOURCE_ID>/
```

Сюда допускаются только наши структурированные извлечения, конспекты, карточки и индексы, не нарушающие права на оригинал.

Машиночитаемый реестр источников остаётся единственным библиографическим источником истины:

```text
DZ_17/knowledge_base/source_registry.v1.json
```

Физическая карта всех компонентов ведётся в:

```text
DZ_17/knowledge_base/PHYSICAL_MAP.md
```

---

## 6. Правило обработки ГОСТов и книг

Обработка любого источника выполняется только по цепочке:

```text
REGISTER SOURCE
→ VERIFY TITLE / VERSION / STATUS
→ RECORD ACQUISITION URI
→ OBTAIN ORIGINAL LEGALLY
→ CALCULATE HASH (если есть файл)
→ BUILD STRUCTURE MAP
→ EXTRACT RELEVANT FRAGMENTS
→ ADD EXACT LOCATORS
→ WRITE OUR SUMMARY
→ MAP TO CONCEPT / METHOD / ALGORITHM / CONTROL / METRIC
→ SENIOR REVIEW
→ VERIFIED RECORD
```

Запрещено писать `из ГОСТ X` или `по книге Y`, если нет проверенного `source_ref + source_locator`.

---

## 7. Разделение внешнего знания и проектных идей

В документации разработки каждый шаг фиксируется так:

```text
WHAT CHANGED
WHY
ORIGIN_CLASS
SOURCE / DECISION
PHYSICAL PATH
OBJECT IDS
TEST / REVIEW
RESULT
```

Если решение придумано внутри проекта, это прямо пишется:

```text
origin_class = PROJECT_DECISION
```

Если решение предложено LLM, но ещё не принято:

```text
origin_class = ASSISTANT_PROPOSAL
review_status = pending
```

Если в проект вставлено правило из ГОСТа/книги:

```text
origin_class = SOURCE_DERIVED
source_ref = <ID>
source_locator = <точный пункт/глава>
```

---

## 8. Запрет на дублирование

Перед созданием записи выполняется:

```text
SEARCH
↓
FOUND?
├─ YES → REUSE
│        ├─ достаточно → LINK
│        └─ недостаточно → EXTEND / NEW VERSION
└─ NO  → CREATE → REGISTER
```

Дубликатом считается не только одинаковый текст, но и второй объект с тем же смыслом, источником и областью применимости без явной связи `supersedes`, `extends` или `alias_of`.

---

## 9. Агенты не владеют копиями общего знания

Профиль агента хранит ссылки:

```text
COMMON FOUNDATION
+ ROLE PROFILE
+ DOMAIN PROFILE
+ TECH PROFILE
+ PROJECT CONTEXT
+ TASK CONTEXT
```

Например:

```text
SENIOR_PROGRAMMER
inherits FOUNDATION
references METHOD-DECISION-001
references CTRL-SECURE-CODE-001
extends TECH-PYTHON
```

Сам ГОСТ, метод или правило при этом не копируется в папку агента.

---

## 10. Definition of Done для знания

Запись может получить статус `verified`, только если одновременно выполнено:

1. существует стабильный `record_id`;
2. определён `origin_class`;
3. для внешнего знания есть `source_ref`;
4. проверены версия и статус источника;
5. есть точный `source_locator`;
6. при наличии локального оригинала зафиксирован hash;
7. указан физический путь записи;
8. известен автор/агент изменения;
9. выполнен review;
10. изменение отражено в `DEVELOPMENT_JOURNAL.md`;
11. нет второго канонического объекта с тем же смыслом.
