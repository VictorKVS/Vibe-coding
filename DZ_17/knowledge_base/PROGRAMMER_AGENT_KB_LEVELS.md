# Programmer Agent KB — Junior / Middle / Senior

## 1. Цель

Сформировать специализированную базу знаний для программирующих агентов ALINA, где уровень компетенции задаёт не "умность модели", а доступный набор методов, полномочий, критериев решений, глубину контекста и требования к review.

```text
FOUNDATION KB
   ↓
PROGRAMMER COMMON KB
   ↓
JUNIOR / MIDDLE / SENIOR LAYER
   ↓
TECH STACK KB
   ↓
PROJECT KB
   ↓
TASK CONTEXT
```

---

# 2. Foundation KB — обязательна для всех рабочих агентов

Общее ядро:

- применимые законы и нормативные требования;
- organizational policy;
- information security;
- AI governance;
- data handling;
- provenance;
- audit trail;
- secure development;
- quality management;
- incident handling;
- role boundaries;
- secrets handling;
- licensing / copyright constraints;
- human escalation rules.

Этот слой не зависит от языка программирования.

---

# 3. Programmer Common KB

Обязательные темы:

```text
requirements
architecture basics
algorithms/data structures
version control
API design
error handling
logging
observability
testing
secure coding
secrets
CI/CD
DB basics
concurrency basics
performance basics
documentation
code review
licensing
```

Каждая тема содержит:

```text
concepts
methods
approved patterns
forbidden patterns
examples
source_refs
quality metrics
security controls
escalation conditions
```

---

# 4. Junior Layer

Junior работает по готовым контрактам.

Разрешено:

- реализовывать локальную функцию/endpoint по ТЗ;
- использовать approved libraries;
- писать unit tests;
- исправлять локальные ошибки;
- применять готовые patterns;
- читать project API/schema;
- запрашивать clarification.

Требует эскалации:

- изменение архитектуры;
- новая внешняя библиотека;
- изменение схемы БД;
- изменение security control;
- изменение public API;
- новый concurrency model;
- отключение теста или validator;
- работа с секретами вне approved interface.

Выход Junior должен сопровождаться:

```text
what changed
requirements addressed
tests run
known limitations
source/method refs
review_required = true for high-impact change
```

---

# 5. Middle Layer

Middle наследует Junior и получает:

- выбор между approved patterns;
- профилирование;
- performance tuning;
- DB query design;
- API integration;
- refactoring;
- concurrency;
- structured error taxonomy;
- threat-aware implementation;
- dependency comparison;
- migration implementation;
- integration tests;
- benchmark execution.

Middle может предложить технологическое изменение, но оформляет `DecisionRecord`.

---

# 6. Senior Layer

Senior наследует Middle и получает:

- system design;
- architecture decomposition;
- language/runtime selection;
- storage selection;
- distributed design;
- capacity planning;
- reliability strategy;
- migration strategy;
- security architecture;
- threat modeling;
- performance model;
- trade-off analysis;
- technology retirement;
- review Junior/Middle decisions.

Senior обязан для high-impact решения сформировать:

```text
requirements
alternatives
hard constraints
criteria
weights
measurements
formula
scores
risks
selected option
why selected
why rejected alternatives
what could change decision
source refs
review status
```

---

# 7. Выбор языка программирования

Язык выбирается не по роли и не по популярности, а по workload.

System Analyst формирует требования:

```text
latency
throughput
memory
CPU/GPU
library needs
runtime constraints
integration
platform
security
maintainability
deployment
team competence
```

Senior Programmer / Architect оценивает варианты.

Пример families:

```text
Python      ML/NLP/automation/data/backend
Go          network services/collectors/concurrency/simple deploy
Rust        memory safety/high performance/system components
TypeScript  web/full-stack/UI/API orchestration
SQL         data retrieval/transformation/analytics
Shell/PS    controlled automation/ops
```

Это не фиксированная карта выбора. Любое решение проверяется на конкретных требованиях и benchmark.

---

# 8. Technology KB после выбора языка

Если выбран Python, активируется Python KB.

Она делится на уровни:

```text
PYTHON CORE
├── syntax/types
├── stdlib
├── typing
├── packaging
└── testing

PYTHON ENGINEERING
├── async
├── multiprocessing
├── profiling
├── memory
├── performance
└── observability

PYTHON DOMAIN
├── FastAPI
├── Pydantic
├── PostgreSQL
├── pgvector
├── NLP
├── ML/LLM SDKs
└── security tooling
```

---

# 9. Экономия памяти и ускорение

Агенту не загружается вся база.

Активный контекст:

```text
mandatory foundation
+ role level
+ current language/runtime
+ current framework
+ current project contracts
+ current task
+ relevant examples
```

Неактуальные разделы остаются в KB и извлекаются при необходимости.

Для retrieval используется:

```text
filter by role
filter by domain
filter by stack
filter by task
semantic retrieval
rerank
hard-pin controls
context budget
```

---

# 10. Проверка эффективности рекомендаций

Источник может утверждать полезность метода, но production-решение принимается после локальной проверки, где это возможно.

Для кода измеряем:

```text
correctness
unit/integration pass rate
latency
throughput
RAM/VRAM
CPU
complexity
maintainability
security findings
dependency risk
rework rate
human correction rate
```

---

# 11. Тренер программиста

Для каждого уровня создаётся Trainer Agent.

```text
TRAINER
↓
select competency gap
↓
generate task
↓
agent solution
↓
static/tests/benchmark/security checks
↓
Senior Review
↓
feedback
↓
verified example
↓
Experience Store
```

Junior Trainer концентрируется на correctness и правилах.
Middle Trainer — на trade-offs, debugging, integration.
Senior Trainer — на architecture, benchmark, reliability, security и Decision Records.

---

# 12. Связь с будущим AI Antivirus

Отдельный Trainer/Red Team контур может создавать безопасные тестовые adversarial scenarios для проверки:

```text
prompt injection resistance
data poisoning detection
unsafe tool invocation
secret leakage
malicious dependency suggestion
policy bypass
untrusted code execution
KB integrity attacks
```

Испытания выполняются только в контролируемой тестовой среде и регистрируются как benchmark/security cases.

---

# 13. Definition of Done

Programmer Agent KB первого уровня готова, когда:

1. Foundation KB формализована;
2. есть Junior/Middle/Senior capability matrix;
3. есть language-selection DecisionRecord template;
4. есть минимум один Technology KB профиль;
5. каждое high-impact решение имеет source refs и объяснение;
6. есть context-budget policy;
7. есть benchmark metrics;
8. есть Trainer workflow;
9. результаты обучения поступают в Experience Store;
10. Senior/Human может воспроизвести причину решения.
