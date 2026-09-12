# ALINA — Universal Knowledge Base / Analyst Meta-KB

Эта база является **общим методическим фундаментом для всех агентов ALINA**. Аналитик, Программист, Security/OSINT и другие роли не получают отдельные копии общих знаний: они наследуют единое ядро и добавляют только специализацию.

```text
UNIVERSAL FOUNDATION KB
        ↓ inherit/reference
ROLE PROFILE
        ↓
DOMAIN / TECH SPECIALIZATION
        ↓
PROJECT / TASK CONTEXT
```

Текущий каталог исторически развивался как Analyst Meta-KB, поэтому часть файлов ориентирована на Аналитика. Универсальные знания постепенно выделяются в общий FOUNDATION **без копирования содержимого**.

Главное правило:

```text
ONE KNOWLEDGE OBJECT
→ ONE CANONICAL ID
→ ONE SOURCE OF TRUTH
→ MANY AGENTS MAY REFERENCE IT
→ ZERO COPY-PASTE DUPLICATES
```

## 1. Роль базы

ALINA Analyst работает над предметной Knowledge Base и использует общую Meta/Universal KB как слой методологии.

```text
DOMAIN KB                         UNIVERSAL / ANALYST META-KB
facts                             methods
claims                            standards
entities                          algorithms
relations                         quality rules
events                            provenance rules
hypotheses                        review rules
sources                           security controls
      \                           /
       \                         /
        └── ALINA AGENT ─────────┘
                 ↓
        auditable result
```

Meta-KB не должна подменять предметные данные. Она определяет **как работать с ними**.

## 2. Главный инвариант

Каждый значимый вывод обязан быть воспроизводим по внешне проверяемому trace:

```text
QUESTION
→ PLAN
→ KB QUERIES
→ RETRIEVED RECORDS
→ APPLIED METHOD
→ EVIDENCE FOR / AGAINST
→ ALTERNATIVES
→ QUALITY CHECKS
→ CONCLUSION
→ PROPOSED KB CHANGE
→ REVIEW
```

Система не обязана и не должна сохранять скрытую внутреннюю цепочку рассуждений модели. Вместо неё хранится **аудируемое обоснование**: входные записи, запросы, правила, методы, evidence, результаты проверок, версии prompt/schema/model и итоговое решение.

## 3. Состав текущей базы

```text
knowledge_base/
├── README.md
├── ANALYST_KB_SPEC.md
├── PROVENANCE_AND_STORAGE_POLICY.md
├── PHYSICAL_MAP.md
├── SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md
├── DECISION_AND_TRAINING_FRAMEWORK.md
├── ANALYST_PROFESSOR_ROLE.md
├── PROGRAMMER_AGENT_KB_LEVELS.md
├── source_registry.v1.json
├── analyst_method_cards.v1.json
├── trace_contract.v1.json
├── open_access_library.v1.json
├── algorithm_decision_card.schema.json
└── materials/
    └── README.md
```

Главные навигационные файлы:

- `PHYSICAL_MAP.md` — **где физически лежит каждый слой**;
- `PROVENANCE_AND_STORAGE_POLICY.md` — **как фиксировать происхождение, source locator, hash и запрет дублей**;
- `../DEVELOPMENT_JOURNAL.md` — **что придумано/изменено, куда вставлено и почему**;
- `source_registry.v1.json` — единый библиографический реестр источников.

В дальнейшем добавляются только необходимые слои без параллельных копий:

```text
standards/          структурированные карточки стандартов
books/              библиографические карточки и наши конспекты
methods/            алгоритмические методики
controls/           quality/security/governance rules
benchmarks/         эталонные кейсы
examples/           verified examples from GPT/Human corrections
ontology/           понятия и отношения Meta-KB
```

## 4. Приоритет источников

Для методологии используется иерархия:

```text
P0  действующие стандарты и нормативные требования
P1  международные стандарты / W3C / NIST / OWASP / MITRE
P1  признанные учебники и монографии
P2  peer-reviewed papers / официальная документация
P3  verified internal examples
P4  эвристики ALINA — только с явной маркировкой
```

## 5. Правило происхождения знания

Каждая методическая карточка должна содержать минимум:

- `source_refs` — на каких источниках основана;
- `method_version` — версия методики;
- `applicability` — где применять;
- `inputs` / `outputs`;
- `checks` — обязательные проверки;
- `failure_modes` — известные ошибки;
- `explanation_requirements` — что показать пользователю;
- `status` — `draft / verified / superseded`.

Для внешнего знания дополнительно обязательны точный `source_locator`, версия/год источника, URI получения и при наличии локального оригинала его путь и SHA-256. Полный контракт определён в `PROVENANCE_AND_STORAGE_POLICY.md`.

`registered` в `source_registry.v1.json` означает только наличие библиографической записи. Это **не означает**, что оригинал прочитан и конкретный пункт подтверждён.

## 6. Не храним книги как «магический корпус»

Полные тексты стандартов и книг добавляются только при законном наличии файла/лицензии. В Git по умолчанию хранятся:

- библиографические записи;
- наши структурированные конспекты;
- ссылки/идентификаторы;
- методические карточки;
- ссылки на точные разделы после проверки оригинала;
- извлечённые правила и алгоритмы в собственной формулировке.

Рабочее физическое место для законно полученных оригиналов и извлечений описано в `materials/README.md` и `PHYSICAL_MAP.md`.

## 7. Связь с предметными KB и агентами

Любой Domain Profile (`narrative`, `osint`, `cybersecurity`, `regulatory`, `programming`, ...) наследует общее ядро, а затем добавляет свои стандарты, онтологию, правила evidence и специализированные методы.

```text
UNIVERSAL FOUNDATION
      ↓ inherit/reference
ROLE PROFILE
      ↓
DOMAIN PROFILE
      ↓ configure
DOMAIN KB / TASK
```

Профиль агента содержит ссылки на canonical IDs, а не копии стандартов или методик.

## 8. Защита от дублей

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

Technology Registry репозитория также проверяется до реализации новой возможности:

```text
docs/TECHNOLOGY_REGISTRY.md
registry/technologies.json
```

## 9. Definition of Done для первого слоя

Первый слой считается собранным, когда:

1. есть Source Registry;
2. есть Method Cards для основного аналитического цикла;
3. есть Trace Contract;
4. каждая Method Card связана с источниками;
5. для подтверждённого внешнего знания есть точный source locator;
6. физическое место записи видно в `PHYSICAL_MAP.md`;
7. Аналитик может по каждому выводу показать `evidence → method → checks → result`;
8. Senior может проверить тот же пакет независимо;
9. исправления Senior/Human попадают в Experience Store;
10. каждое значимое изменение отражено в `DEVELOPMENT_JOURNAL.md`;
11. нет параллельного канонического дубля того же знания.
