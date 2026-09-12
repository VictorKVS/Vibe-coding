# ALINA Analyst — Meta Knowledge Base

Эта база знаний предназначена **не для предметной области пользователя**, а для самой аналитической системы ALINA. Она отвечает на вопрос: **как Аналитик должен исследовать любую предметную KB, какими методами пользоваться, какие ограничения соблюдать и как объяснять каждое действие**.

## 1. Роль базы

ALINA Analyst работает над предметной Knowledge Base и использует эту Meta-KB как слой методологии.

```text
DOMAIN KB                         ANALYST META-KB
facts                             methods
claims                            standards
entities                          algorithms
relations                         quality rules
events                            provenance rules
hypotheses                        review rules
sources                           security controls
      \                           /
       \                         /
        └── ALINA ANALYST ──────┘
                 ↓
        auditable conclusion
```

Meta-KB не должна подменять предметные данные. Она определяет **как работать с ними**.

## 2. Главный инвариант

Каждый значимый вывод Аналитика обязан быть воспроизводим по внешне проверяемому trace:

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

## 3. Состав Meta-KB

```text
knowledge_base/
├── README.md
├── ANALYST_KB_SPEC.md
├── source_registry.v1.json
├── analyst_method_cards.v1.json
└── trace_contract.v1.json
```

В дальнейшем добавляются:

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

Каждая методическая карточка должна содержать:

- `source_refs` — на каких источниках основана;
- `method_version` — версия методики;
- `applicability` — где применять;
- `inputs` / `outputs`;
- `checks` — обязательные проверки;
- `failure_modes` — известные ошибки;
- `explanation_requirements` — что показать пользователю;
- `status` — draft / verified / superseded.

## 6. Не храним книги как «магический корпус»

Полные тексты стандартов и книг добавляются только при законном наличии файла/лицензии. В Git по умолчанию хранятся:

- библиографические записи;
- наши структурированные конспекты;
- ссылки/идентификаторы;
- методические карточки;
- ссылки на точные разделы после загрузки оригинала;
- извлечённые правила и алгоритмы в собственной формулировке.

## 7. Связь с предметными KB

Любой Domain Profile (`narrative`, `osint`, `cybersecurity`, `regulatory`, ...) наследует общее ядро Meta-KB, а затем добавляет свои стандарты, онтологию, правила evidence и специализированные методы.

```text
ANALYST META-KB
      ↓ inherit
DOMAIN PROFILE
      ↓ configure
DOMAIN KB ANALYSIS
```

## 8. Definition of Done для первого слоя

Первый слой Meta-KB считается собранным, когда:

1. есть Source Registry;
2. есть Method Cards для основного аналитического цикла;
3. есть Trace Contract;
4. каждая Method Card связана с источниками;
5. Аналитик может по каждому выводу показать `evidence → method → checks → result`;
6. GPT Senior может проверить тот же пакет независимо;
7. исправления Senior/Human попадают в Experience Store.
