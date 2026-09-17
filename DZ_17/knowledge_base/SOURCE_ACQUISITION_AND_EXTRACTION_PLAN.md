# ALINA Universal / Analyst Meta-KB — план сбора источников и извлечения методик

## 1. Принцип работы

Используем уже существующие документы репозитория как каркас и **дополняем их**, а не создаём параллельную документацию заново.

Базовые опорные документы:

- `../METHODOLOGY_AND_STANDARDS.md` — мастер-перечень нормативной и методической базы;
- `README.md` — роль общего FOUNDATION и Meta-KB;
- `ANALYST_KB_SPEC.md` — логическая модель Meta-KB;
- `PROVENANCE_AND_STORAGE_POLICY.md` — обязательные правила origin/source locator/storage/dedup;
- `PHYSICAL_MAP.md` — физическая карта базы;
- `source_registry.v1.json` — единый библиографический реестр источников;
- `analyst_method_cards.v1.json` — карточки методов;
- `trace_contract.v1.json` — трассировка решений;
- `DECISION_AND_TRAINING_FRAMEWORK.md` — правила выбора решений;
- `ANALYST_PROFESSOR_ROLE.md` — роль Главного Аналитика;
- `PROGRAMMER_AGENT_KB_LEVELS.md` — пример специализации агента;
- `../DEVELOPMENT_JOURNAL.md` — журнал всех значимых изменений.

Новые материалы сначала проверяются на наличие уже описанного источника/правила/метода, затем дополняют существующую карточку или создают новую версию.

```text
SEARCH EXISTING
→ REUSE / LINK
→ EXTEND / NEW VERSION only if needed
→ CREATE only if no canonical object exists
```

---

## 2. Порядок наполнения

Работа выполняется в две большие очереди.

### Очередь A — ГОСТ / ISO / W3C / NIST / OWASP / MITRE

Сначала разбирается нормативно-методическое ядро. Для каждого документа формируется карточка:

```text
SOURCE
├── canonical source_id
├── полное название
├── редакция / год
├── статус документа
├── официальный источник / acquisition_uri
├── accessed_at
├── source_file_path (если оригинал законно получен)
├── source_hash_sha256 (если есть локальный файл)
├── область применимости
├── раздел / пункт / подпункт
├── locator_status
├── собственное краткое изложение требования или идеи
├── связанные Concept
├── связанные Method
├── связанные Algorithm
├── обязательные Control
└── Metric
```

Правило: номер пункта/подпункта фиксируется только после проверки оригинала. До проверки:

```text
locator_status = pending_verification
record_status = draft
```

### Очередь B — книги, статьи, открытые курсы и официальная документация

После нормативного слоя разбираем литературу по тем же правилам, но не копируем длинные фрагменты текста.

```text
ORIGINAL SOURCE
→ EXACT LOCATOR
→ IDEA
→ OUR SUMMARY
→ METHOD
→ ALGORITHM
→ IMPLEMENTATION OPTION
→ TEST / BENCHMARK
```

---

## 3. Что именно извлекаем из каждого источника

Для Universal/Analyst Meta-KB интересуют не «конспекты книг», а практические единицы знания:

1. **Concept** — термин и смысл;
2. **Principle** — общий принцип;
3. **Method** — повторяемая процедура;
4. **Algorithm** — вычислимая последовательность действий;
5. **Formula** — формула, score, threshold или rule;
6. **Decision Criterion** — критерий выбора решения;
7. **Failure Mode** — известный тип ошибки;
8. **Control** — обязательная проверка/ограничение;
9. **Metric** — чем измеряется качество;
10. **Benchmark idea** — как проверить метод на наших данных;
11. **Applicability** — где метод применять, а где нет;
12. **Source locator** — точный раздел/пункт/глава после проверки;
13. **Origin class** — источник/проектное решение/измерение/гипотеза;
14. **Physical path** — где лежит карточка/извлечение/оригинал.

---

## 4. Формат Method Card после обработки источника

```text
method_id
name
version
status
origin_class
problem
applicability
inputs
outputs
steps
algorithm_refs
formula_refs
criteria
weights
weight_origins
controls
metrics
failure_modes
alternatives
decision_rule
source_refs
source_locators
extraction_note_paths
implementation_notes
benchmark_plan
explanation_requirements
review_status
supersedes
```

Веса и пороги не считаются «истиной из книги». Для них отдельно фиксируем происхождение:

```text
standard_requirement
measured_fact
benchmark_result
scientific_evidence
expert_estimate
system_analyst_assessment
security_requirement
operator_override
```

---

## 5. Физический маршрут одного источника

Для каждого обработанного источника должна быть видна полная цепочка:

```text
source_registry.v1.json
  ↓ source_id
materials/originals/<SOURCE_ID>/original.<ext>       # LOCAL_ONLY, если оригинал есть
  ↓ hash + locator
materials/extracts/<SOURCE_ID>/structure-map.md
  ↓
materials/extracts/<SOURCE_ID>/extraction-notes.md
  ↓ canonical IDs
analyst_method_cards.v1.json / future common registries
  ↓ references only
profiles/<domain>.v1.json
  ↓
Runtime agent context
```

Если оригинал не хранится локально, цепочка всё равно обязана содержать `acquisition_uri`, `accessed_at` и точный locator в доступной официальной/легальной версии.

Физические пути всех слоёв поддерживаются в `PHYSICAL_MAP.md`.

---

## 6. Правило выбора решения

Любое значимое решение должно иметь минимум:

```text
REQUIREMENTS
→ HARD CONSTRAINTS
→ ALTERNATIVES
→ CRITERIA
→ WEIGHTS
→ MEASUREMENTS
→ SCORE / FORMULA
→ SENSITIVITY CHECK
→ SELECTED OPTION
→ WHY SELECTED
→ WHY OTHERS REJECTED
→ WHAT CAN CHANGE THE DECISION
```

Базовая многокритериальная форма:

```text
Score(a) = Σ(w_i × s_i(a)) - Σ(p_j(a))
Σ w_i = 1
```

Формула может заменяться другой, если методика/исследование/benchmark это обосновывает. Тогда DecisionRecord хранит версию формулы и причину замены.

---

## 7. Первая очередь ГОСТов

Разбирать в таком порядке:

1. ГОСТ Р 71540-2024 / ISO/IEC 5392:2024 — эталонная архитектура инженерии знаний;
2. ГОСТ Р ИСО 30401-2020 — системы менеджмента знаний;
3. ГОСТ Р 58545-2019 — сбор, классификация, маркировка и обработка информации;
4. ГОСТ Р 70889-2023 / ISO/IEC 8183:2023 — жизненный цикл данных;
5. ГОСТ Р 71484.1-2024 — качество данных, понятия;
6. ГОСТ Р 71484.2-2024 — показатели качества;
7. ГОСТ Р 71484.3-2024 — управление качеством данных;
8. ГОСТ Р 71484.4-2024 — процесс управления качеством данных;
9. ГОСТ Р 72663-2026 — измерение качества данных;
10. ГОСТ Р 59276-2020 — доверие к системам ИИ;
11. ГОСТ Р 71539-2024 / ISO/IEC 5338:2023 — жизненный цикл систем ИИ;
12. ГОСТ Р ИСО/МЭК 42001-2024 — менеджмент ИИ;
13. ГОСТ Р ИСО/МЭК 27001-2021 и 27002-2021 — ISMS/controls;
14. ГОСТ Р 56939-2024 — безопасная разработка ПО;
15. Р 50.1.028-2001 — IDEF0.

**Важно:** сам перечень выше является планом обработки. Наличие позиции в плане или `source_registry.v1.json` ещё не означает, что конкретные пункты стандарта проверены.

После каждой обработки обновляются:

```text
source_registry.v1.json
materials/extracts/<SOURCE_ID>/...
соответствующие canonical Method/Concept/Control records
PHYSICAL_MAP.md при появлении нового физического файла
DEVELOPMENT_JOURNAL.md
список открытых вопросов
```

---

## 8. Открытая электронная библиотека проекта

В приоритете легально доступные открытые источники:

- официальные сайты стандартов/организаций;
- author-hosted drafts;
- university-hosted textbooks/notes;
- Open Access books;
- arXiv / institutional repositories;
- W3C / NIST / OWASP / MITRE;
- официальная документация языков, библиотек и платформ.

Платные/закрытые книги регистрируем библиографически. Полный текст анализируем только если пользователь законно предоставил файл или у нас есть разрешённый доступ.

---

## 9. Кандидаты открытых источников, требующие фиксации точного URI/версии

Ниже перечислены источники, ранее выбранные как полезные. До занесения точного `acquisition_uri`, `accessed_at`, версии и локаторов они остаются **registered/candidate**, а не доказательством конкретного метода.

### Information Retrieval

**Manning, Raghavan, Schütze — Introduction to Information Retrieval**  
Предполагаемое применение: retrieval, ranking, relevance, evaluation.

### NLP

**Jurafsky & Martin — Speech and Language Processing**  
Предполагаемое применение: normalization, NLP pipeline, embeddings, IE, parsing, language models.

### Graph Representation

**William L. Hamilton — Graph Representation Learning**  
Предполагаемое применение: node embeddings, GNN, multi-relational graphs.

### Open Access Knowledge Graphs

**Knowledge Graphs and Big Data Processing**  
Предполагаемое применение: KG pipelines, big data integration и практика.

### Web Standards

W3C PROV-O, RDF, OWL, SPARQL, JSON-LD, SHACL. Для использования конкретного правила требуется точный stable locator.

### AI Governance / Security

NIST AI RMF, NIST GenAI Profile, OWASP GenAI/LLM, MITRE ATLAS. Для каждой извлечённой нормы/методики требуется точная версия и locator.

---

## 10. Практический цикл обработки одного источника

```text
SEARCH EXISTING SOURCE ID
↓
REGISTER / REUSE SOURCE
↓
VERIFY TITLE / VERSION / STATUS
↓
RECORD ACQUISITION URI + ACCESSED_AT
↓
OBTAIN ORIGINAL LEGALLY (если нужно)
↓
CALCULATE SHA-256 (если есть локальный файл)
↓
BUILD STRUCTURE MAP
↓
SELECT RELEVANT SECTIONS
↓
EXTRACT IDEAS IN OUR WORDS
↓
ADD EXACT LOCATORS
↓
MAP TO CONCEPTS / METHODS / ALGORITHMS / CONTROLS / METRICS
↓
CREATE / UPDATE CANONICAL RECORD
↓
DEFINE IMPLEMENTATION OPTIONS
↓
DEFINE TEST / BENCHMARK
↓
RUN SENIOR REVIEW
↓
UPDATE PHYSICAL_MAP + DEVELOPMENT_JOURNAL
↓
PUBLISH VERIFIED RECORD
```

---

## 11. Definition of Done одного источника

Источник считается обработанным, когда:

- проверены название, версия и статус;
- зафиксирован `acquisition_uri` и дата доступа;
- при наличии локального оригинала записаны физический путь и SHA-256;
- выделены релевантные разделы;
- есть точные локаторы для использованных идей;
- идеи изложены своими словами;
- каждый объект имеет `origin_class`;
- созданы связи `Source → Concept → Method → Algorithm → Control/Metric`;
- определены области применимости и ограничения;
- сформирован минимум один implementation note;
- если заявляется преимущество метода — есть benchmark или научное основание;
- запись прошла Senior Review;
- изменения версионированы;
- физическое расположение отражено в `PHYSICAL_MAP.md`;
- изменение зафиксировано в `DEVELOPMENT_JOURNAL.md`;
- перед созданием проверено отсутствие canonical duplicate.
