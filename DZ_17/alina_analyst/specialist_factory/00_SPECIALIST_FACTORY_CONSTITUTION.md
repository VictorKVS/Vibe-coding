# ALINA Specialist Factory — Конституция

**Статус:** Draft v0.1  
**Роль-эталон:** Specialist Knowledge Engineer  
**Назначение:** правила построения доказуемых цифровых специалистов в FATHER.

## 1. Миссия

Specialist Factory превращает запрос на профессию или специализацию в воспроизводимый пакет знаний, компетенций, методов, источников, тестов и истории развития цифрового специалиста.

Главная цепочка:

```text
REQUEST
→ PROFESSION RESEARCH
→ EVIDENCE
→ PROFESSION BLUEPRINT
→ COMPETENCY MAP
→ CURRICULUM
→ SOURCE ORDERS
→ KNOWLEDGE BUILD
→ SPECIALIST ASSEMBLY
→ EXAM
→ GAP ANALYSIS
→ IMPROVEMENT
→ REGRESSION
→ VERSIONED SPECIALIST
```

## 2. Основные законы

1. **Evidence First.** Существенное утверждение о профессии, компетенции или обязательном знании должно иметь проверяемое основание.
2. **Авторитет аналитика не заменяет доказательство.**
3. **Knowledge ≠ Skill ≠ Competency.** Наличие текста в KB не доказывает способность применять знание.
4. **Chunk ≠ Knowledge Unit.** Chunk — техническая единица retrieval; знание — семантически типизированная и доказуемая единица.
5. **RAG ≠ Specialist.** RAG является механизмом доступа к части знаний.
6. **Prompt ≠ Profession.** Ролевая инструкция не создаёт компетентность.
7. **Human education is evidence, not truth.** Учебные планы, профессиональные стандарты, Body of Knowledge, сертификации и вакансии анализируются совместно; ни один класс источников не считается универсальной истиной.
8. **Resident ≠ On-Demand.** Специалист обязан глубоко владеть профессиональным ядром и уметь обнаруживать/закрывать периферийные пробелы по требованию.
9. **Unknown is a valid state.** При недостатке оснований система обязана сообщать о недостаточности знаний.
10. **No silent overwrite.** Источники, знания, blueprint, тесты и специалисты версионируются.
11. **No silent self-improvement.** Изменение production-специалиста проходит benchmark, regression и human approval.
12. **Provenance end-to-end.** Вывод должен трассироваться до версии источника и точного фрагмента.

## 3. Классы утверждений

Каждый существенный элемент обязан иметь тип:

- SOURCE_FACT — непосредственно установлено источником;
- ANALYTICAL_INFERENCE — аналитический вывод из нескольких оснований;
- HYPOTHESIS — проверяемое предположение;
- FATHER_DESIGN_DECISION — наше инженерное решение;
- UNKNOWN — данных недостаточно;
- CONTESTED — имеются существенные противоречащие основания.

Нельзя представлять ANALYTICAL_INFERENCE или FATHER_DESIGN_DECISION как SOURCE_FACT.

## 4. Модель компетентности

FATHER использует многослойную модель:

```text
TASK / OUTCOME
      ↑
COMPETENCY
      ↑
SKILL / METHOD
      ↑
KNOWLEDGE
      ↑
EVIDENCE
      ↑
SOURCE
```

Дополнительно учитываются ответственность, сложность контекста, автономность, устойчивость результата и способность объяснить решение.

Внешние ориентиры:
- NIST NICE: Task, Knowledge, Skill statements и Work Roles.
- SFIA 9: разделение knowledge/skill/competency и 7 уровней ответственности.
- IIBA/BABOK: knowledge areas, tasks, techniques, underlying competencies.
- ISO 30401: управление системой знаний и её постоянное улучшение.

Эти frameworks — источники методических конструкций, но FATHER не копирует ни один из них как универсальную модель всех профессий.

## 5. Канонический алгоритм

### A01 — Profession Definition
Уточнить профессию, специализацию, контекст, юрисдикцию, отрасль и целевой уровень.

### A02 — Profession Discovery
Исследовать человеческую профессию: стандарты, образовательные программы, Body of Knowledge, сертификации, рабочие задачи, методы, инструменты и границы.

### A03 — Evidence Register
Зарегистрировать каждое основание с provenance, датой, версией, authority и locator.

### A04 — Profession Blueprint
Сформировать доказуемое лекало профессии.

### A05 — Competency Map
Разложить результаты работы на знания, навыки, методы, решения и уровни ответственности.

### A06 — Learning Graph
Определить prerequisites и разумный порядок освоения.

### A07 — Curriculum
Определить resident knowledge, on-demand map, практику, regulatory layer и assessment plan.

### A08 — FATHER Inventory
Проверить, какие знания уже существуют в Knowledge Core.

### A09 — Gap Register
Зафиксировать отсутствующие/слабые области.

### A10 — OSINT Research Orders
Передать OSINT Analyst конкретные заказы на источники, а не запрос "найди всё".

### A11 — Source Validation
Проверить идентичность, версию, происхождение, полноту, актуальность и независимость источников.

### A12 — Knowledge Build
Извлечь concepts, definitions, facts, claims, requirements, methods, procedures, cases, anti-patterns, evidence и contradictions.

### A13 — Specialist Assembly
Собрать versioned Specialist Package.

### A14 — Examination
Проверить знания, применение, анализ новой ситуации, обнаружение ошибок, синтез и защиту решения.

### A15 — Failure Classification
Каждый провал классифицировать минимум как:
- KNOWLEDGE_GAP;
- RETRIEVAL_GAP;
- REASONING_GAP;
- TOOL_GAP;
- BLUEPRINT_GAP.

### A16 — Improvement
Исправлять причину провала, а не автоматически добавлять документы.

### A17 — Regression
Убедиться, что улучшение не ухудшило ранее пройденные способности.

### A18 — Release
Создать новую версию специалиста с журналом изменений и evidence.

## 6. Quality Gates

Специалист не получает статус VALIDATED, пока:
- определены scope и out_of_scope;
- критические компетенции имеют evidence;
- обязательное resident knowledge покрыто;
- legal/regulatory statements отделены от recommendations;
- provenance проходит до фрагмента источника;
- тестовый набор отделён от учебного;
- пройдены practical и unseen cases;
- ошибки классифицированы;
- выполнен regression;
- неизвестные области явно видимы.

## 7. Запрещённые сокращения

Нельзя считать специалиста готовым на основании:
- количества PDF;
- размера vector DB;
- числа chunks;
- красивого system prompt;
- самооценки LLM;
- одного экзамена;
- совпадения с заранее известными ответами;
- единственного framework.

## 8. Первичная роль

Первым специалистом является **Specialist Knowledge Engineer**. Он строится вручную и проверяется человеком. Его первый внешний экзамен — построение доказуемого blueprint системного инженера/аналитика без специальных hard-coded исключений.

## 9. Официальные методические опоры

- NIST SP 800-181 Rev.1, NICE Framework: https://csrc.nist.gov/pubs/sp/800/181/r1/final
- SFIA 9 documentation: https://sfia-online.org/en/sfia-9/documentation
- SFIA Knowledge, Skill and Competency: https://sfia-online.org/en/about-sfia/about-sfia-appendices/knowledge-skill-and-competency
- SFIA Levels of Responsibility: https://sfia-online.org/en/sfia-9/responsibilities
- IIBA BABOK structure: https://www.iiba.org/knowledgehub/business-analysis-body-of-knowledge-babok-guide/1-Introduction/1-4-structure-of-the-babok-guide/
- IIBA Business Analysis Competency Model preview: https://www.iiba.org/globalassets/professional-development/develop-your-skills/competency-model/files/business-analysis-competency-model-v4-preview-edition.pdf
- ISO 30401:2018: https://www.iso.org/standard/68683.html

## 10. Статус стандарта ISO 30401

На дату подготовки документа действующим опубликованным изданием остаётся ISO 30401:2018 с поправками; ISO/DIS 30401 Edition 2 находится в разработке. Draft не должен смешиваться с действующим стандартом как одна редакция.

---
**Следующий документ:** 01_PROFESSION_RESEARCH_METHOD.md
