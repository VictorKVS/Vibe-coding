# Техническое задание
# ALINA / Universal Analyst Core

## 0. Статус документа

Документ фиксирует генеральную идею и целевое ТЗ для развития ALINA из мультимодального помощника в универсальный аналитический конвейер построения проверяемых баз знаний.

Текущий ДЗ-17 остаётся учебным и демонстрационным контуром `text + image → multimodal analysis`. Universal Analyst Core — дальнейшее production-направление, которое использует тот же LLM Gateway, Model Manager, Vision-контур и KB Analyst, но расширяет их до многоступенчатой аналитической системы.

---

# 1. Генеральная задача

Создать систему, которая принимает неструктурированные данные разных типов, максимально полно раскладывает их по составляющим, строит доказательную и структурную основу, подготавливает компактный и трассируемый пакет для **Главного GPT-аналитика**, получает его проверку и только после этого допускает знания в предметную базу знаний.

Главный принцип:

```text
НЕ:
сырой материал → одна LLM → ответ

А:
сырой материал
→ извлечение
→ декомпозиция
→ нормализация
→ evidence
→ граф
→ гипотезы
→ GPT Senior Analyst review
→ Human Review при необходимости
→ Verified Knowledge
→ Knowledge Base
```

Локальный Analyst Core не должен пытаться заменить сильную внешнюю модель во всех задачах. Его первичная функция — **подготовить данные для старшего аналитика настолько хорошо, чтобы сильная модель тратила ресурсы только на сложную проверку, сопоставление, неопределённость и выводы**.

---

# 2. Конечная цель

Система должна постепенно превратиться в универсальную фабрику предметных баз знаний, способную работать по разным специальностям через подключаемые Domain Profiles.

Целевая формула:

```text
UNSTRUCTURED DATA
       ↓
UNIVERSAL ANALYST CORE
       ↓
DOMAIN PROFILE
       ↓
GPT SENIOR REVIEW
       ↓
VERIFIED DOMAIN KB
       ↓
CORRECTION / EXPERIENCE STORE
       ↓
IMPROVED ROUTING / PROMPTS / RULES / MODELS
```

Долгосрочная цель — снижать долю ручной и внешней проверки за счёт накопления проверенных решений, но не снижать требования к provenance и качеству.

---

# 3. Основные роли системы

## 3.1. Tool Zoo

Tool Zoo добывает и нормализует первичные наблюдения.

Примеры:

- file ingest;
- hashing;
- PDF/DOCX/XLSX/PPTX parsing;
- HTML/Markdown/JSON parsing;
- OCR;
- STT;
- FFmpeg/keyframes;
- metadata/EXIF;
- language detection;
- regex/rules;
- NER;
- chunking;
- embeddings;
- reranking;
- image similarity/hash;
- document structure extraction.

Tool Zoo не создаёт «истину». Его результат — `Observation`.

## 3.2. Analysis Zoo

Analysis Zoo работает поверх observations/evidence и создаёт структурированные кандидаты знаний.

Базовые роли:

- Entity Analyst;
- Claim Analyst;
- Fact Analyst;
- Relation Analyst;
- Event Analyst;
- Timeline Analyst;
- Cause/Effect Analyst;
- Dialogue Analyst;
- Knowledge-State Analyst;
- Contradiction Analyst;
- Hypothesis Analyst;
- Source Reliability Analyst;
- Cross-document Analyst;
- Narrative Drift / «Фейкомёт»;
- Visual Analyst;
- Visual Continuity Analyst;
- KB Validator;
- Socrates / Counter-evidence Analyst.

Domain Profile может добавлять специализированные роли.

## 3.3. GPT Senior Analyst

Главный GPT-аналитик получает не исходный хаос, а подготовленный `Candidate Knowledge Package`.

Он должен:

- проверить понимание сущностей;
- проверить различие facts / claims / hypotheses;
- найти пропущенные альтернативные объяснения;
- проверить противоречия;
- оценить достаточность evidence;
- проверить причинно-следственные связи;
- проверить timeline;
- проверить источники и provenance;
- запросить дополнительные данные, если доказательств недостаточно;
- принять, отклонить или исправить candidate knowledge;
- не утверждать данные автоматически при существенной неопределённости.

## 3.4. Human Reviewer

Человек подключается при:

- значимых противоречиях;
- недостаточном evidence;
- конкурирующих версиях;
- важных канонических/юридических/исследовательских решениях;
- расхождении локального анализатора и GPT Senior Analyst;
- низкой confidence;
- потенциально необратимом изменении KB.

---

# 4. Общая архитектура

```text
SOURCE MATERIAL
text / image / audio / video / documents / OSINT
        ↓
INGEST
        ↓
TOOL ZOO
        ↓
OBSERVATIONS
        ↓
EVIDENCE LAYER
        ↓
ENTITY GRAPH
        ↓
ANALYSIS ZOO
        ↓
HYPOTHESIS GRAPH
        ↓
CANDIDATE KNOWLEDGE PACKAGE
        ↓
GPT SENIOR ANALYST
        ↓
VERIFY / REJECT / CORRECT / REQUEST MORE DATA
        ↓
HUMAN REVIEW when required
        ↓
APPROVED KNOWLEDGE
        ↓
KNOWLEDGE BASE
        ↓
EXPERIENCE / CORRECTION STORE
```

---

# 5. Состояния данных

Минимальная state machine:

```text
RAW
↓
OBSERVATION
↓
EVIDENCE_CANDIDATE
↓
EVIDENCE_ACCEPTED / EVIDENCE_REJECTED
↓
PROPOSED_KNOWLEDGE
↓
GPT_REVIEWED
↓
HUMAN_REVIEW_REQUIRED / APPROVED / REJECTED
↓
PUBLISHED_KNOWLEDGE
↓
SUPERSEDED when later corrected
```

Ни один промежуточный элемент не должен тихо превращаться в подтверждённое знание.

---

# 6. Базовый контракт знания

Все анализаторы обязаны отдавать совместимые структуры.

Пример:

```json
{
  "id": "FACT-00421",
  "type": "fact",
  "subject": "ENTITY-17",
  "predicate": "owns",
  "object": "ENTITY-22",
  "source_id": "DOC-004",
  "source_fragment_id": "CH-081",
  "confidence": 0.87,
  "extractor": "relation_analyst_v2",
  "model": "local-text-8b-q4",
  "status": "proposed",
  "created_at": "ISO-8601"
}
```

Обязательные свойства:

- `id`;
- `type`;
- `status`;
- `source_id`;
- ссылка на точный source fragment;
- `confidence`;
- extractor/tool/model identity;
- timestamps;
- schema version.

---

# 7. Candidate Knowledge Package для GPT Senior Analyst

Главный аналитик не должен получать весь исходный корпус по умолчанию.

Пакет должен содержать:

```text
CASE
SCOPE
DOMAIN PROFILE
SOURCE INDEX
SOURCE QUALITY
OBSERVATIONS SUMMARY
ENTITIES
CLAIMS
FACT CANDIDATES
RELATION CANDIDATES
EVENTS
TIMELINE
CONTRADICTIONS
UNCERTAIN ITEMS
HYPOTHESES
COUNTER-EVIDENCE
OPEN QUESTIONS
PROVENANCE MAP
LOCAL ANALYST TRACE
```

Каждый элемент должен позволять быстро запросить исходный фрагмент при необходимости.

Пример summary:

```text
CASE-0071
Sources: 14
Chunks: 386
Entities: 42
Claims: 117
Fact candidates: 73
Relations: 91
Events: 28
Timeline nodes: 31
Contradictions: 6
Uncertain: 11
Hypotheses: 4
```

---

# 8. Evidence-first правила

Системные инварианты:

1. Evidence before assertion.
2. Observation не равен факту.
3. Claim не равен факту.
4. Hypothesis не равна факту.
5. Модель не может скрыто повышать статус знания.
6. Любой published fact должен иметь provenance.
7. Неопределённость хранится явно.
8. Конкурирующие версии могут существовать одновременно.
9. Исправление не удаляет историю: старое знание становится `superseded`.
10. Проверяемость важнее краткости.

---

# 9. Работа нескольких анализаторов

Для сложных задач допускается независимый анализ несколькими ролями/моделями.

Пример:

```text
Local Entity Analyst
        │
Local Relation Analyst
        │
Rule Engine
        │
        ▼
MERGER / COMPARATOR
        ↓
agreement / disagreement / uncertainty
```

При расхождении результат не выбирается скрыто по одному score. Создаётся конфликт и передаётся старшему анализатору.

---

# 10. Model Manager

Пользователь не должен работать с LM Studio или другими отдельными GUI-инструментами.

Модели управляются непосредственно ALINA.

Целевые источники моделей:

```text
LOCAL DIRECT
- llama.cpp / GGUF router

EXTERNAL
- GigaChat
- OpenAI / compatible APIs when enabled
```

Требования:

- список доступных моделей в UI;
- ручной выбор модели;
- режим AUTO;
- capability-aware routing;
- отдельные модели для `dialogue`, `vision`, `kb_extract`, `kb_validate`, `deep_analysis`, `socrates`;
- автоматический fallback;
- trace фактически использованной модели;
- latency/error telemetry;
- API keys только server-side;
- local model binaries не коммитятся в Git.

---

# 11. Распределение нагрузки

Для текущего ПК целевой baseline:

```text
4 CPU-heavy lanes
+ 1 local GPU-heavy lane
+ 2 external GigaChat lanes
= 7 параллельных полезных линий
```

Экспериментальный профиль:

```text
4 CPU + 1 GPU + 3 external = 8 lanes
```

GPU scheduler:

```text
GPU_HEAVY_SEMAPHORE = 1
```

То есть text LLM / vision / STT используют GPU по очереди, а не пытаются постоянно жить в VRAM одновременно.

Подробный расчёт: `ANALYST_ZOO_CAPACITY.md`.

---

# 12. Локальная и внешняя аналитика

## Локально

Локальный слой выполняет массовые операции:

- ingest;
- parsing;
- OCR;
- STT;
- chunking;
- NER;
- embeddings;
- reranking;
- entity extraction;
- claims/facts/relations/events extraction;
- initial graph;
- preliminary timeline;
- preliminary contradictions;
- visual observation;
- routine validation.

## GPT / GigaChat Senior Layer

Сильная внешняя модель используется для:

- deep cross-document synthesis;
- сложных конфликтов;
- hypothesis competition;
- counter-evidence;
- Socrates review;
- сложной причинности;
- проверки неоднозначных сущностей;
- high-impact KB validation;
- независимого второго мнения.

Цель — не передавать внешней модели каждый chunk, а только качественно подготовленный набор сложных случаев.

---

# 13. Human-in-the-loop

UI должен позволять:

```text
PROPOSED
├── APPROVE
├── REJECT
├── EDIT
└── REQUEST RECHECK
```

Дополнительно:

- массовое подтверждение безопасных элементов;
- фильтр по confidence;
- фильтр по severity;
- просмотр provenance;
- просмотр source fragment;
- сравнение local vs GPT conclusion;
- просмотр причины исправления.

---

# 14. Knowledge Base

Целевая persistence-архитектура:

```text
PostgreSQL
+ pgvector
+ object storage for originals/assets
+ append-only audit/event log
```

Минимальные сущности ядра:

```text
sources
captures
fragments
observations
entities
claims
facts
relations
events
timeline_nodes
hypotheses
counter_evidence
reviews
corrections
knowledge_records
versions
provenance_edges
domain_profiles
analyst_runs
```

---

# 15. Experience / Correction Store

Система обязана сохранять не только финальный ответ, но и процесс исправления.

```text
INPUT
↓
LOCAL RESULT
↓
GPT REVIEW
↓
CORRECTION
↓
REASON
↓
FINAL KNOWLEDGE
```

Пример:

```text
local candidate:
A → owns → B
confidence 0.71

GPT correction:
REJECT owns
REPLACE WITH uses
reason: source describes temporary use, not ownership
```

Эта пара становится verified training/example record.

---

# 16. Самосовершенствование

Первый этап — не автоматическое fine-tuning, а накопление и использование проверенного опыта.

Система должна улучшать:

- prompts;
- schemas;
- routing;
- confidence thresholds;
- deterministic rules;
- few-shot examples;
- choice of model by task/domain;
- validator policies.

Только после накопления достаточного verified corpus допускается отдельный контур:

```text
VERIFIED CORPUS
↓
TRAINING DATASET
↓
LoRA / fine-tuning / distillation
↓
NEW MODEL VERSION
↓
BENCHMARK
↓
SHADOW MODE
↓
PROMOTION if quality improves
```

Новая модель не заменяет старую автоматически без benchmark и acceptance gate.

---

# 17. Domain Profiles

Universal Analyst Core должен быть предметно-независимым.

Профиль определяет:

- ontology;
- entity types;
- relation types;
- schemas;
- tools;
- extraction prompts;
- validators;
- evidence requirements;
- confidence thresholds;
- quality tests.

Плановые профили:

## NARRATIVE

```text
character
scene
location
artifact
dialogue
knowledge state
plot thread
visual state
continuity
```

## OSINT

```text
person
organization
account
domain
wallet
infrastructure
event
claim
evidence
hypothesis
```

## CYBERSECURITY

```text
asset
vulnerability
threat actor
TTP
IOC
control
risk
attack path
mitigation
```

## REGULATORY

```text
document
clause
requirement
subject
object
condition
exception
responsibility
effective date
conflict
```

В дальнейшем: engineering, research, finance и другие направления.

---

# 18. Narrative Profile как первый сложный профиль

Для ALINA / книжного проекта дополнительно требуются:

- Scene Analyst;
- Character Analyst;
- Dialogue / Utterance Analyst;
- Who-Knows-What Analyst;
- Relationship-State Analyst;
- Timeline Analyst;
- Plot-Thread Analyst;
- Foreshadowing/Payoff Analyst;
- Visual Identity Analyst;
- Wardrobe/Prop/Injury State Analyst;
- Continuity Checker.

Пример одного source fragment:

```text
«Максим вошёл в ангар. На нём всё ещё была порванная форма после тренировки. Анна сказала ему, что Кравцов уже знает правду об оружии его деда».
```

Должен породить независимые кандидаты:

```text
ENTITY: Максим, Анна, Кравцов, ангар, оружие
EVENT: Максим вошёл в ангар
LOCATION STATE: Максим → ангар
WARDROBE STATE: форма → повреждена
DIALOGUE: speaker=Анна, listener=Максим
CLAIM: Кравцов знает правду
KNOWLEDGE TRANSFER: Анна → Максим
TIMELINE: после тренировки
RELATION: оружие → принадлежало → деду
```

---

# 19. Multimodal requirements

Входы:

```text
TEXT
IMAGE
AUDIO
VIDEO
PDF/DOCX/XLSX/PPTX
SCREENSHOT
```

Каждый тип проходит собственный Tool Zoo, но далее должен переходить в единый evidence/knowledge contract.

Image pipeline:

```text
IMAGE
↓
VISION OBSERVATION
↓
OBJECT / APPEARANCE / TEXT / SCENE STATE
↓
PROPOSED KNOWLEDGE
```

Audio/video:

```text
AUDIO / VIDEO
↓
STT + timestamps + keyframes
↓
claims / speakers / events / visual observations
↓
PROPOSED KNOWLEDGE
```

---

# 20. Provenance

Каждый вывод должен быть воспроизводим назад до источника.

```text
KNOWLEDGE RECORD
↓
REVIEW
↓
ANALYST RUN
↓
EVIDENCE
↓
OBSERVATION
↓
SOURCE FRAGMENT
↓
ORIGINAL SOURCE
```

Оригинал не перезаписывается производной версией.

---

# 21. Audit / Event Ledger

Все значимые операции пишутся в append-only ledger:

- ingest;
- extraction;
- model call;
- candidate creation;
- status change;
- GPT review;
- human review;
- correction;
- publication;
- supersede;
- model/prompt/schema version change.

Никаких silent changes.

---

# 22. Telemetry

Обязательные метрики:

```text
items/min
chunks/min
tokens/sec
images/min
audio realtime factor
VRAM peak
RAM peak
CPU utilization
queue wait
provider latency
retry rate
429/error rate
rework rate
acceptance rate
correction rate
GPT disagreement rate
human escalation rate
```

После появления достаточной телеметрии автоматически считать:

```text
скорость vs 1 поток
% ускорения / замедления
throughput за проход
throughput накопительно
доля повторной работы
остаток
ETA завершения
```

До появления измерений значения не придумываются.

---

# 23. Метрики качества

Минимум:

- entity precision / recall на размеченном наборе;
- relation accuracy;
- fact acceptance rate;
- contradiction detection rate;
- provenance completeness;
- GPT correction rate;
- human correction rate;
- false-canon rate;
- hallucinated source rate;
- duplicate entity rate;
- timeline consistency rate;
- processing cost per item;
- latency by stage.

Критическая метрика:

```text
published knowledge without traceable provenance = 0
```

---

# 24. Безопасность

Требования:

- secrets только server-side;
- API keys не логируются;
- model binaries не попадают в Git;
- originals имеют hash;
- все модификации versioned;
- human approval обязателен для high-impact изменений;
- external provider receives only data permitted by project policy;
- domain profile может запрещать отправку отдельных типов данных во внешний API;
- redaction/anonymization stage должен быть подключаемым до external provider.

---

# 25. Функциональные требования MVP

## P0

1. Unified Source/Observation/Evidence contract.
2. Model Manager: local GGUF + external GigaChat + AUTO/manual switch.
3. Tool Zoo registry.
4. Analysis Zoo registry.
5. Candidate Knowledge Package.
6. GPT Senior Analyst review contract.
7. Human review UI.
8. Provenance chain.
9. Local persistence for development.
10. Telemetry.

## P1

1. PostgreSQL/pgvector.
2. Graph relations.
3. Experience/Correction Store.
4. Narrative Domain Profile.
5. OSINT Domain Profile.
6. Socrates/counter-evidence workflow.
7. Batch scheduler.
8. Resource-aware router CPU/GPU/EXTERNAL.

## P2

1. Regulatory/Cybersecurity profiles.
2. Automatic prompt/routing optimization from verified history.
3. Benchmark suite per domain.
4. Shadow testing new model versions.
5. Dataset export for LoRA/fine-tuning.

---

# 26. Критерии приёмки P0

P0 считается готовым, если:

- можно загрузить текст и изображение;
- Tool Zoo создаёт observations с source/provenance;
- Analysis Zoo формирует структурированные candidates;
- candidates не становятся KB автоматически;
- формируется Candidate Knowledge Package;
- пакет можно отправить GPT Senior Analyst;
- GPT возвращает structured review;
- исправления сохраняются отдельно от исходного candidate;
- пользователь может approve/reject/edit;
- approved knowledge имеет полный provenance;
- local/external model можно поменять из ALINA;
- фактически использованная модель видна в trace;
- telemetry записывает latency/errors/resource usage;
- build и smoke tests проходят.

---

# 27. Не входит в первый MVP

- полностью автономное изменение канона/KB без review;
- автоматическое fine-tuning в production;
- скрытое удаление противоречащих версий;
- публикация knowledge без provenance;
- попытка держать десятки LLM одновременно;
- обязательное использование одного конкретного провайдера.

---

# 28. Генеральный принцип продукта

> **Analyst Core — это не чат-бот, который отвечает на вопросы. Это конвейер превращения сырого материала в проверяемое знание. Локальный зоопарк максимально готовит данные, сильный GPT-аналитик проверяет сложные места, человек контролирует значимые решения, а вся история исправлений превращается в опыт для последующего автоматического улучшения специализированных аналитиков и баз знаний.**
