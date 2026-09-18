# FATHER / ALINA Analyst Foundation

Status: `PROJECT_DECISION / EVOLVING`

## 1. Назначение

FATHER в этом контуре — не отдельная копия базы знаний, а управляющий слой над уже существующей Universal / Analyst Meta-KB. Он определяет, **как документ проходит путь от сырого источника до проверяемого знания, алгоритма и условий реализации**.

Главный инвариант:

```text
ONE SOURCE OF TRUTH
→ canonical IDs
→ role/profile references
→ task-specific RAG
→ no copied standards/books/methods per agent
```

Канонические методические знания остаются в `DZ_17/knowledge_base/`. FATHER хранит только orchestration contracts, role profiles, prompts, RAG policy, run traces и решения.

## 2. Компетенция Главного Аналитика FATHER

Главный Аналитик работает на Senior/Professor уровне и обязан:

- определить цель и границы анализа;
- проверить источник, происхождение, версию, язык и статус;
- выбрать нужные роли Tool Zoo / Analysis Zoo;
- отделять `SOURCE_DERIVED`, `INFERENCE`, `HYPOTHESIS`, `PROJECT_DECISION`;
- не путать физическую структуру документа с границами идей;
- не создавать постоянные чанки по фиксированному размеру, если можно восстановить семантические границы;
- по каждой идее выделять утверждения, допущения, ограничения, контрпримеры и пробелы;
- преобразовывать метод/идею в варианты реализации только как `implementation_option` до review;
- строить как положительные, так и негативные сценарии;
- описывать необходимые, достаточные и блокирующие условия реализации;
- сохранять трассу `source → span → idea → method → algorithm → scenario → decision`;
- не переводить `proposed/candidate` в `approved/production` автоматически.

## 3. Наследование знаний

```text
UNIVERSAL FOUNDATION KB
        ↓
ANALYST META-KB
        ↓
ROLE-ANALYST-FATHER
        ↓
DOMAIN PROFILE
        ↓
TASK CONTEXT
        ↓
RAG PACKAGE
```

Профиль Analyst не содержит копии Method Cards или стандартов. Он содержит ссылки на канонические объекты и retrieval policy.

## 4. Канонический маршрут документа

```text
D0 RECEIVE
→ D1 REGISTER / HASH / PROVENANCE / SECURITY
→ D2 READ / PARSE
→ D3 LANGUAGE GATE
     ├─ target language acceptable → continue
     └─ translation required → Translator → translation QA → continue
→ D4 STRUCTURE RECONSTRUCTION
     document → part → chapter → section → subsection / article / clause / paragraph
→ D5 IDEA DETECTION
→ D6 IDEA-BOUNDARY SEGMENTATION
→ D7 KNOWLEDGE EXTRACTION
     concept / claim / principle / method / evidence / limitation / contradiction
→ D8 ALGORITHM ENGINEERING
→ D9 SCENARIO ENGINEERING
     positive / nominal / negative / adversarial / failure
→ D10 REALIZATION CONDITIONS
     prerequisites / dependencies / thresholds / resources / constraints / stop conditions
→ D11 VALIDATION / COUNTER-EVIDENCE / SECURITY
→ D12 CANONICAL KB PROPOSAL
→ D13 REVIEW / VERSION / PUBLISH
```

## 5. Что заносится в базу при входе документа

Минимальная карточка:

```text
source_id
capture_id
source_type
title
authors / organization
edition / version / publication date
canonical_uri
acquisition_uri
accessed_at
language
mime_type
size_bytes
sha256
storage_ref
license/access notes
source_status
parser_status
security_status
origin_class
created_at
```

Для нормативных/юридически значимых документов дополнительно:

```text
validity_status
valid_from / valid_to if verified
supersedes / superseded_by
change_history refs
official_source flag
locator_status
```

Запрещено придумывать отсутствующие метаданные. Неизвестное хранится как `null / unknown / pending_verification`.

## 6. Чтение и перевод

Документ сначала читается в оригинале настолько, насколько позволяет parser/format. Перевод включается только при необходимости для downstream-ролей.

```text
ORIGINAL
→ source spans with exact locators
→ optional LocalizedText / translated projection
```

Перевод не заменяет оригинал и не становится новым Source. Для каждого переведённого сегмента сохраняются:

```text
source_span_id
source_language
target_language
translator/model trace
terminology refs
translation_status
review status
```

## 7. Структура документа

Сначала восстанавливается физическая/логическая структура:

```text
document
part
chapter
section
subsection
article
clause
subclause
paragraph
list/table/figure/example/appendix
```

A2 может выдавать `PROPOSED / INFERENCE`. До проверки эвристическая структура не перезаписывает canonical structure.

## 8. Идея как отдельная единица анализа

Идея — смысловой блок, который может пересекать абзацы и страницы, но должен иметь точный provenance.

Карточка IdeaCandidate:

```text
idea_id
source_id
capture_id
span_refs[]
structure_refs[]
title
summary_our_words
idea_type
claims[]
assumptions[]
conditions[]
limitations[]
counterpoints[]
open_questions[]
origin_class = SOURCE_DERIVED | INFERENCE
status = candidate
confidence_breakdown
```

## 9. Чанки только по границам идей

Permanent fixed-size chunks не являются каноническим знанием.

```text
StructureNode + SourceSpan
→ detect OPEN idea
→ accumulate neighboring spans
→ detect semantic closure / transition
→ CLOSE idea
→ IdeaChunk
```

IdeaChunk хранит ссылки на исходные spans и может иметь overlap только как производный runtime-context. Канонический текст источника не дублируется.

Граница идеи считается кандидатом, если наблюдается один или несколько признаков:

- смена тезиса/объекта рассуждения;
- новый метод/принцип;
- новый пример, который вводит самостоятельный тезис;
- явный заголовок/подзаголовок;
- переход `problem → solution`, `claim → evidence`, `rule → exception`;
- завершение аргумента и переход к следующему.

## 10. Из идеи в алгоритм

Для каждой идеи отдельно проверяется, является ли она:

```text
CONCEPT
PRINCIPLE
CLAIM
METHOD
ALGORITHM CANDIDATE
CONTROL
METRIC
FAILURE MODE
IMPLEMENTATION OPTION
```

Если идея допускает реализацию, создаётся AlgorithmCandidate:

```text
algorithm_id
source_basis[]
problem
objective
inputs
outputs
preconditions
steps
branch_conditions
state_changes
dependencies
controls
metrics
failure_modes
alternatives
assumptions
security_implications
reversibility
status
```

Авторская идея и наша реализация разделяются:

```text
SOURCE IDEA
→ METHOD
→ IMPLEMENTATION OPTION (ours)
→ ALGORITHM CANDIDATE
```

## 11. Положительные и негативные сценарии

Для каждого AlgorithmCandidate обязательны минимум:

```text
POSITIVE
ожидаемый успешный путь

NOMINAL
обычная эксплуатация

NEGATIVE
ошибка входных данных / отсутствующая зависимость / неверное предположение

ADVERSARIAL
злонамеренное или манипулятивное воздействие, если применимо

DEGRADED
частичная недоступность модели/сервиса/источника

ROLLBACK
условия остановки и возврата
```

Сценарий содержит:

```text
scenario_id
algorithm_id
initial_conditions
stimulus
expected_behavior
observable_result
failure_signal
controls
metrics
severity
recovery
```

## 12. Условия реализации

Условия не прячутся внутри текста алгоритма. Они представлены отдельно:

```text
REQUIRED       без этого реализация невозможна
SUFFICIENT     этого достаточно для выбранного варианта
ENVIRONMENT    ОС / сеть / runtime / hardware / data
RESOURCE       CPU / GPU / RAM / latency / budget
DATA           формат / качество / полнота / freshness
LEGAL          license / compliance / allowed use
SECURITY       access / isolation / approval / secrets
QUALITY        минимальный benchmark / accuracy / error rate
DEPENDENCY     внешний API / библиотека / сервис
STOP           когда выполнение запрещено или должно остановиться
REVIEW         когда нужен Senior/Human
```

## 13. Оркестрация ролей

FATHER не обязан поднимать отдельную LLM на каждую роль. Роль = prompt + schema + RAG profile + model route.

Базовые роли:

```text
Source Curator
Translator
Structure Analyst
Idea Boundary Analyst
Claim/Concept Analyst
Method Analyst
Algorithm Engineer
Scenario Analyst
Realization Conditions Analyst
Provenance Validator
Security Reviewer
Socrates / Counter-evidence Reviewer
KB Publisher
```

Физические модели выбираются router-ом по сложности и ресурсному бюджету.

## 14. 5-поточный baseline

Пять параллельных аналитических дорожек после стабилизации Source/Capture:

```text
S1 SOURCE / STRUCTURE
S2 IDEA / SEMANTICS
S3 METHODS / ALGORITHMS
S4 NEGATIVE / SECURITY / COUNTER-EVIDENCE
S5 PROVENANCE / TELEMETRY / QUALITY
```

Потоки могут читать один canonical Source, но не создают независимые копии знания. Все записи сходятся через canonical IDs и ReviewDecision.

## 15. Definition of Done документа

Документ считается аналитически обработанным, когда:

- зарегистрирован Source/Capture и hash;
- есть provenance и security status;
- документ прочитан parser-ом, ошибки чтения видимы;
- при необходимости есть проверяемая translation projection;
- структура восстановлена до достаточной глубины;
- выделены IdeaCandidate и IdeaChunk по смысловым границам;
- каждая используемая идея имеет source/span refs;
- идеи классифицированы в knowledge objects;
- для реализуемых методов созданы AlgorithmCandidate;
- для алгоритмов есть positive/negative/degraded/adversarial scenarios по применимости;
- явно описаны realization conditions;
- противоречия и gaps не скрыты;
- выполнен provenance/security/review gate;
- canonical publish происходит только после разрешённого review;
- trace позволяет воспроизвести весь маршрут.

## 16. Обязательный режим Zero-Base Reconstruction

Для обучения, benchmark и независимой проверки Аналитик должна уметь проходить документ **с нуля**, не используя готовые связи canonical Knowledge Graph как входные доказательства.

Эталонный процесс определён в:

```text
DZ_17/knowledge_base/ZERO_BASE_ANALYST_RECONSTRUCTION.md
```

Главный маршрут:

```text
MINIMAL SEED
→ PRIMARY SOURCE DISCOVERY
→ IDENTITY
→ ORIGINAL / CURRENT VERSION
→ AMENDMENT DISCOVERY
→ TIMELINE
→ STRUCTURAL DIFF
→ RELATED DOCUMENT DISCOVERY
→ RELATION CLASSIFICATION
→ REQUIREMENT EXTRACTION
→ HISTORICAL / POLICY CONTEXT
→ CAUSE / IMPACT ANALYSIS
→ CONTRADICTIONS / GAPS
→ INDEPENDENT GRAPH CANDIDATE
→ FREEZE
→ UNBLIND CANONICAL KB
→ COMPARE / REVIEW / CHANGESET
```

В `blind_mode=true` retrieval не должен отдавать Аналитику готовые graph edges, requirement mappings, impact conclusions и ранее сформированные причинные объяснения. Canonical KB открывается только после фиксации независимого результата.

152-ФЗ является первым эталонным benchmark-документом этого режима. Цель — научить Аналитика методу самостоятельного исследования, а не запомнить заранее подготовленный набор связей.
