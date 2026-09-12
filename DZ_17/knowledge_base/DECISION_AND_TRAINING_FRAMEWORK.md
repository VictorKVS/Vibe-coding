# ALINA Analyst — Decision & Training Framework

## 1. Назначение

Этот документ задаёт, **как Аналитик должен принимать инженерные и методические решения** и как на этой основе формировать базы знаний для агентов разных уровней компетенции.

Главный принцип:

```text
РЕШЕНИЕ
≠ "LLM так решила"

РЕШЕНИЕ =
требование
+ применённый метод
+ источники
+ критерии
+ веса критериев
+ альтернативы
+ расчёт
+ объяснение выбора
+ ограничения
+ проверка
```

Каждое значимое решение должно быть воспроизводимо без доступа к скрытой chain-of-thought модели.

---

# 2. Обязательная карточка алгоритма / метода

Каждый Algorithm / Method в Meta-KB хранится как самостоятельная карточка.

Минимальный контракт:

```text
ID
Название
Версия
Статус
Задача
Область применимости
Входы
Выходы
Алгоритм по шагам
Формулы / правила
Параметры
Критерии качества
Ограничения
Известные failure modes
Альтернативные методы
Почему выбран этот метод
Источники
Точные локаторы источников
Тесты
Benchmark / evidence of effectiveness
Связанные агенты
Связанные Domain Profiles
```

## 2.1. Ссылка на источник обязательна

Недостаточно написать:

```text
Источник: книга по Python
```

Нужно:

```text
source_id: BOOK-...
title: ...
locator_type: chapter | section | clause | page | theorem | algorithm
locator: "Chapter 6 / §6.3"
idea_used: "...
```

Для стандарта:

```text
ГОСТ / ISO / W3C
→ номер
→ полное название
→ пункт / подпункт / раздел
→ какое требование или принцип извлечён
```

Если полный оригинал ещё не загружен и точный пункт не проверен:

```text
locator_status = pending_verification
```

Система не должна придумывать номер пункта.

---

# 3. Авторское право и извлечение идей

Мы не копируем книги целиком и не строим Meta-KB как склад чужого текста.

Допустимая стратегия проекта:

```text
ORIGINAL SOURCE
      ↓
CONCEPT / IDEA
      ↓
OUR FORMULATION
      ↓
METHOD CARD
      ↓
ALGORITHM / IMPLEMENTATION
```

В Meta-KB сохраняются:

- библиографическая карточка;
- точный locator;
- собственное краткое изложение идеи;
- формализованная процедура;
- наши критерии применимости;
- наш код/псевдокод;
- наши тесты;
- наши результаты benchmark;
- сведения о том, что идея адаптирована из источника.

Длинные фрагменты чужих книг в базу по умолчанию не включаются.

---

# 4. Decision Record — почему выбрано именно это решение

Каждое архитектурное, алгоритмическое или технологическое решение создаёт `DecisionRecord`.

Пример:

```text
DEC-TECH-0042

Вопрос:
Какой язык использовать для нового analysis worker?

Альтернативы:
A. Python
B. Go
C. Rust
D. TypeScript

Критерии:
- ecosystem_fit
- ML_NLP_support
- performance_requirement
- developer_productivity
- integration_cost
- memory_pressure
- operational_complexity
- security_tooling

Источники:
- требования системы
- benchmark проекта
- документация библиотек
- System Analyst assessment

Результат:
Python

Почему:
...
```

DecisionRecord должен сохраняться даже после изменения решения.

Старое решение получает:

```text
status = superseded
superseded_by = DEC-...
```

---

# 5. Формула выбора

По умолчанию используем объяснимую многокритериальную модель.

Для альтернативы `a`:

```text
Score(a) = Σ(w_i × s_i(a)) - Σ(p_j(a))
```

где:

- `w_i` — вес критерия;
- `s_i(a)` — нормализованная оценка альтернативы по критерию `0..1`;
- `p_j(a)` — штрафы за hard/soft constraints.

Условия:

```text
Σ w_i = 1
```

Hard constraint может полностью исключить вариант:

```text
if violates_mandatory_requirement:
    eligible = false
```

## 5.1. Пример выбора языка

```text
criterion                  weight
---------------------------------
ML/NLP ecosystem             0.25
integration with ALINA       0.20
development speed            0.15
runtime performance          0.15
memory efficiency            0.10
security tooling             0.05
operations/deployment        0.05
team competence              0.05
                            -----
                             1.00
```

Если задача — массовый NLP/ML worker, Python может выиграть по ecosystem/integration/development speed.

Если задача — высоконагруженный сетевой collector, веса меняются, и Go/Rust могут победить.

**Значит выбор языка не глобальный. Он выполняется под конкретный workload.**

---

# 6. Кто имеет право менять веса

Вес не должен появляться из ответа LLM.

Источник веса фиксируется:

```text
weight_origin =
- requirement
- benchmark
- domain_policy
- system_analyst
- security_requirement
- operator_override
```

Для каждого веса сохраняются:

```text
value
reason
source_ref
approved_by
valid_from
version
```

Если вес экспертный и ещё не подтверждён benchmark:

```text
calibration_status = expert_estimate
```

После испытаний:

```text
calibration_status = benchmark_calibrated
```

---

# 7. System Analyst как отдельная роль

System Analyst не заменяет алгоритм выбора, а **формирует требования, критерии и ограничения**.

Его функции:

```text
BUSINESS NEED
↓
functional requirements
non-functional requirements
constraints
expected load
latency target
memory budget
security requirements
integration requirements
maintainability
↓
DECISION CRITERIA
```

Мнение System Analyst всегда маркируется как:

```text
expert_assessment
```

и отделяется от:

```text
measured_fact
standard_requirement
benchmark_result
```

---

# 8. Пример полного выбора: Python

Задача:

> Реализовать агент извлечения сущностей, фактов и связей из текстовой KB.

### 8.1. Требования

```text
NLP/ML libraries required
LLM clients required
rapid experiments required
JSON/JSON Schema support required
PostgreSQL/pgvector integration required
batch processing required
moderate latency acceptable
```

### 8.2. Альтернативы

```text
Python
Go
Rust
TypeScript
```

### 8.3. Проверяемые данные

Система собирает:

```text
library availability
benchmark latency
RAM usage
CPU usage
integration complexity
LOC / development time
error rate
test coverage
security findings
```

### 8.4. Выбор

При текущих требованиях Python может быть выбран, если итоговый score максимален и отсутствуют hard blockers.

### 8.5. Почему

Объяснение должно строиться из **критериев и измерений**, а не из утверждения "Python популярен".

---

# 9. После выбора технологии — строится собственная KB технологии

Например выбрали Python.

Создаётся:

```text
TECH-KB / PYTHON
```

Внутри:

```text
language fundamentals
stdlib
project conventions
typing
async
concurrency
performance
memory
security
testing
packaging
FastAPI
Pydantic
PostgreSQL
pgvector
LLM clients
profiling
observability
failure patterns
verified examples
```

Но агенту не нужна вся Python KB одновременно.

---

# 10. Три уровня базы знаний программиста

## Level 1 — Junior Agent

Назначение: безопасно выполнять ограниченные задачи по готовым правилам.

Получает:

```text
mandatory standards/policies
approved stack
coding rules
basic language constructs
approved libraries
secure defaults
test templates
examples
forbidden patterns
escalation rules
```

Не должен самостоятельно менять архитектуру или выбирать новую библиотеку без эскалации.

## Level 2 — Middle Agent

Получает Junior Layer +:

```text
architecture patterns
performance trade-offs
concurrency
error handling
profiling
API contracts
DB patterns
security analysis
library comparison
refactoring rules
integration patterns
benchmark methodology
```

Может предлагать изменения, но high-impact решения требуют review.

## Level 3 — Senior Agent

Получает Junior + Middle +:

```text
system design
architecture decisions
technology selection
capacity planning
failure analysis
threat modeling
trade-off analysis
migration strategy
complex debugging
cross-domain constraints
benchmark design
review of junior/middle work
```

Senior Agent обязан объяснить решение через DecisionRecord.

---

# 11. Общая фундаментальная библиотека для агентов

Большинство рабочих агентов наследуют единое основание:

```text
AGENT FOUNDATION KB
├── legal & compliance
├── organizational policy
├── information security
├── AI governance
├── data handling
├── provenance
├── auditability
├── secure development
├── quality management
├── incident handling
└── role boundaries
```

То есть программист, системный аналитик, KB engineer, administrator, QA, AI Security analyst получают единый обязательный слой.

## 11.1. Offensive / adversarial roles

Белый хакер, red-team и агент социальной инженерии **не освобождаются от закона и контроля**.

У них другой профиль исполнения:

```text
AUTHORIZED_SECURITY_PROFILE
├── explicit scope
├── Rules of Engagement
├── asset allowlist
├── time window
├── permitted techniques
├── prohibited techniques
├── approval chain
├── evidence handling
└── stop conditions
```

То есть отличается операционная методика, но не исчезают legal/compliance/audit controls.

---

# 12. Принцип минимальной активной памяти

Полная Meta-KB может быть большой, но в context агента загружается только необходимый диапазон.

```text
GLOBAL FOUNDATION
      +
ROLE PROFILE
      +
DOMAIN PROFILE
      +
TASK-SPECIFIC RETRIEVAL
      +
LOCAL EVIDENCE
      =
ACTIVE CONTEXT
```

Это даёт:

- меньше токенов;
- меньше latency;
- меньше шума;
- меньше противоречащих инструкций;
- ниже стоимость внешней модели;
- проще проверка provenance.

---

# 13. Алгоритм формирования active context

```text
1. identify task
2. identify role
3. load mandatory foundation controls
4. select domain profile
5. retrieve relevant method cards
6. retrieve relevant source-derived rules
7. retrieve current project constraints
8. retrieve task evidence
9. rerank
10. enforce token/context budget
11. preserve mandatory controls
12. send context to model
```

При сокращении контекста нельзя выбрасывать mandatory compliance/security controls.

---

# 14. Context Budget

Для каждого фрагмента считаем utility:

```text
Utility(chunk) =
  relevance × w_r
+ authority × w_a
+ task_criticality × w_t
+ recency × w_c
+ provenance_quality × w_p
- redundancy_penalty
```

Затем выбираем записи в пределах бюджета.

Hard-pinned records:

```text
mandatory_policy
security_control
explicit_user_constraint
current_API_contract
current_schema
```

не участвуют в обычном отсечении.

---

# 15. Как доказываем эффективность алгоритма

Нельзя написать:

> этот алгоритм эффективнее.

Нужно хранить:

```text
claim_of_effectiveness
↓
source / paper / book / standard
↓
conditions
↓
our benchmark
↓
measured metrics
↓
comparison
↓
confidence
```

Метрики зависят от задачи:

```text
precision
recall
F1
latency
throughput
RAM
VRAM
CPU
error rate
rework rate
cost
security findings
human correction rate
```

Внешняя публикация даёт основание попробовать метод, но **наша production-рекомендация должна подтверждаться собственным benchmark на нашем workload**.

---

# 16. Объяснение решения пользователю

На сайте ALINA для любого решения должна быть кнопка `Почему?`.

Она показывает:

```text
РЕШЕНИЕ
Python

ЗАДАЧА
NLP/LLM analysis worker

АЛЬТЕРНАТИВЫ
Python / Go / Rust / TypeScript

КРИТЕРИИ И ВЕСА
...

РАСЧЁТ
...

HARD CONSTRAINTS
...

ИСТОЧНИКИ
ГОСТ ... п. ...
Book ... chapter ...
Benchmark BM-...

МНЕНИЕ SYSTEM ANALYST
...

РИСКИ
...

ПОЧЕМУ НЕ ВЫБРАНЫ ОСТАЛЬНЫЕ
...

STATUS
approved / experimental / superseded
```

---

# 17. Целевая архитектура компетенции агента

```text
                    AGENT
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
 FOUNDATION KB    ROLE KB      DOMAIN KB
 laws/policy      junior       Python
 security         middle       OSINT
 AI governance    senior       regulatory
 provenance                    narrative
         │            │            │
         └────────────┼────────────┘
                      ▼
                 TASK CONTEXT
                      ↓
                   MODEL
                      ↓
               TRACEABLE ACTION
```

---

# 18. Главное правило проекта

Мы строим не библиотеку ответов.

Мы строим **систему воспроизводимого выбора**:

```text
что нужно сделать
→ какие есть варианты
→ чем они отличаются
→ по каким критериям сравниваем
→ откуда взяты критерии
→ какие веса
→ откуда взяты веса
→ какие измерения
→ какая формула
→ что победило
→ почему
→ что может изменить решение
```

Именно эта структура должна стать общей для всех профессиональных агентов ALINA.
