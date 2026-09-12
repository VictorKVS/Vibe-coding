# ALINA Analyst Core — методология, стандарты и литература

Статус: рабочий мастер-перечень нормативно-методической базы проекта.

Цель документа — зафиксировать, на каких стандартах, рекомендациях и книгах строятся алгоритмы и процессы ALINA Analyst Core: ingest, data quality, knowledge engineering, provenance, graph, NLP, verification, human review, AI governance, security, testing и развитие специализированных Domain Profiles.

> Важно: не существует одного ГОСТа, полностью описывающего весь pipeline `RAW → Evidence → Graph → Senior Review → Verified KB`. Методика проекта собирается как согласованный стек из нескольких действующих стандартов и признанных инженерных источников.

---

# 1. Нормативное ядро проекта — использовать обязательно

| Приоритет | Документ | Роль в ALINA Analyst Core |
|---|---|---|
| P0 | **ГОСТ Р 71540-2024 (ИСО/МЭК 5392:2024)** — Искусственный интеллект. Эталонная архитектура инженерии знаний | Главный нормативный каркас Knowledge Engineering: роли, действия, компоненты, отношения, словарь инженерии знаний |
| P0 | **ГОСТ Р 71476-2024** — Искусственный интеллект. Концепции и терминология искусственного интеллекта | Единая терминология AI/ML/моделей/компонентов |
| P0 | **ГОСТ Р 71539-2024 (ISO/IEC 5338:2023)** — Искусственный интеллект. Процессы жизненного цикла системы искусственного интеллекта | Lifecycle системы ИИ, процессы определения, контроля, эксплуатации и улучшения |
| P0 | **ГОСТ Р ИСО/МЭК 42001-2024** — Искусственный интеллект. Система менеджмента | AI governance, управление системой, роли, ответственность, постоянное улучшение |
| P0 | **ГОСТ Р 30401-2020 / ГОСТ Р ИСО 30401-2020** — Системы менеджмента знаний. Основные требования | Верхний уровень Knowledge Management: создание, поддержание, анализ и совершенствование знаний |
| P0 | **ГОСТ Р 58545-2019** — Менеджмент знаний. Руководящие указания по сбору, классификации, маркировке и обработке информации | Прямое основание для ingest/classification/marking/handling и правил доступа |
| P0 | **ГОСТ Р 70889-2023 (ISO/IEC 8183:2023)** — Искусственный интеллект. Структура жизненного цикла данных | Жизненный цикл данных от комплектования до вывода из эксплуатации |
| P0 | **ГОСТ Р 71484.1-2024 (ISO/IEC 5259-1:2024)** — Качество данных для аналитики и МО. Часть 1 | Терминология и концептуальная база data quality |
| P0 | **ГОСТ Р 71484.2-2024 (ISO/IEC 5259-2:2024)** — Качество данных. Часть 2. Показатели качества данных | Метрики качества данных |
| P0 | **ГОСТ Р 71484.3-2024 (ISO/IEC 5259-3:2024)** — Качество данных. Часть 3. Требования и рекомендации по управлению качеством данных | Data Quality Management |
| P0 | **ГОСТ Р 71484.4-2024 (ISO/IEC 5259-4:2024)** — Качество данных. Часть 4. Структура процесса управления качеством данных | Процессная модель data quality |
| P0 | **ГОСТ Р 72663-2026** — SQuaRE. Измерение качества данных | Количественные показатели качества структурированных данных |
| P0 | **ГОСТ Р 59276-2020** — Системы искусственного интеллекта. Способы обеспечения доверия. Общие положения | Trustworthiness, качество, жизненный цикл, факторы снижения доверия |
| P0 | **ГОСТ Р 59277-2020** — Классификация систем искусственного интеллекта | Классификация типов AI-систем и применимости методов |
| P0 | **Р 50.1.028-2001** — Методология функционального моделирования | IDEF0: Input / Control / Output / Mechanism; функциональная модель процессов |

---

# 2. Менеджмент знаний, записей и происхождения информации

| Приоритет | Документ | Использование |
|---|---|---|
| P1 | **ГОСТ Р 54877-2016** — Менеджмент знаний. Измерение знаний | KPI/эффективность процессов Knowledge Management |
| P1 | **ГОСТ Р 54876-2011** — Менеджмент знаний. Взаимосвязь менеджмента знаний с культурой и организационными процессами | Организационная интеграция KB и процессов |
| P1 | **ГОСТ Р ИСО 30300-2015** — Системы управления документами. Основные положения и словарь | Терминология records/document management |
| P1 | **ГОСТ Р ИСО 30301-2014** — Системы менеджмента записей. Требования | Управление записями, traceability, контроль записей |
| P1 | **ГОСТ Р ИСО 30302-2022** — Системы управления документами. Руководство по внедрению | Практическая реализация records management |
| P1 | **W3C PROV-DM / PROV-O** | Формальная модель provenance: Entity / Activity / Agent, связи происхождения |
| P1 | **Dublin Core Metadata Terms** | Базовая совместимая метамодель описания источников и цифровых объектов |

---

# 3. Инженерия данных, knowledge graph и семантическая совместимость

| Приоритет | Документ | Использование |
|---|---|---|
| P1 | **ГОСТ Р ИСО/МЭК 20547-3-2024** — Эталонная архитектура больших данных. Часть 3 | Архитектурные роли и функциональные компоненты data platform |
| P1 | **W3C RDF 1.1 Concepts and Abstract Syntax** | Базовая triple-модель `subject-predicate-object` |
| P1 | **W3C OWL 2** | Формальная модель онтологий, классов, свойств, ограничений |
| P1 | **W3C SPARQL 1.1** | Запросы к RDF/knowledge graph |
| P1 | **W3C JSON-LD 1.1** | Передача linked data через JSON/API |
| P1 | **SHACL (W3C)** | Валидация графов знаний и ограничений схемы |

---

# 4. Системная и программная инженерия

| Приоритет | Документ | Использование |
|---|---|---|
| P1 | **ГОСТ Р ИСО/МЭК 12207-2010** — Процессы жизненного цикла программных средств | Процессы разработки, эксплуатации, сопровождения, V&V |
| P1 | **ГОСТ Р 56923-2016 / ISO/IEC TR 24748-3** | Руководство по применению 12207 |
| P1 | **ГОСТ Р 58609-2019** — Состав и содержание информационных элементов жизненного цикла | Требования к проектной и эксплуатационной документации |
| P1 | **ГОСТ Р ИСО/МЭК 25000-2021** — SQuaRE. Руководство | Общая система оценки качества ПО |
| P1 | **ГОСТ Р ИСО/МЭК 25010-2015** — Модели качества систем и программных продуктов | Модель качества приложения Analyst Core |
| P1 | **ГОСТ Р ИСО/МЭК 25020-2023** — Основные принципы измерения качества | Система метрик качества |
| P1 | **ГОСТ Р ИСО/МЭК 25023-2021** — Измерения качества системы и программной продукции | Количественные software quality metrics |
| P1 | **ГОСТ Р 72497-2025** — Обзор и применение моделей качества | Актуальный дополнительный каркас моделей качества |

---

# 5. Тестирование, верификация и валидация

| Приоритет | Документ | Использование |
|---|---|---|
| P1 | **ГОСТ Р 56920-2024** — Тестирование ПО. Общие положения | Общая стратегия тестирования, включая системы ИИ |
| P1 | **ГОСТ Р 56921-2016** — Тестирование ПО. Часть 2. Процессы тестирования | Процессная организация тестирования |
| P1 | **ГОСТ Р 56922-2016** — Тестирование ПО. Часть 3. Документация тестирования | Шаблоны test plan / test report |
| P2 | **ISO/IEC/IEEE 29119 series** | Международная основа software testing |
| Historical | **ПНСТ 965-2024** — Тестирование систем ИИ | Отменён; не нормативное основание, но можно изучать как источник методик AI testing |

---

# 6. AI governance, risk, bias, controllability

| Приоритет | Документ | Использование |
|---|---|---|
| P1 | **ISO/IEC 23894:2023** — Artificial intelligence — Guidance on risk management | AI-specific risk management |
| P1 | **ГОСТ Р ИСО 31000-2019** — Менеджмент риска. Принципы и руководство | Общая методология рисков |
| P1 | **ГОСТ Р 72254-2025** — Применение ГОСТ Р ИСО 31000-2019 в системах менеджмента | Актуальное руководство по применению risk management |
| P1 | **ПНСТ 837-2023** — Управляемость автоматизированных систем ИИ | Observability, transitions, handoff, uncertainty, validation |
| P1 | **ПНСТ 839-2023** — Смещенность в системах ИИ и при принятии решений | Bias detection/measurement/mitigation |
| P1 | **ПНСТ 838-2023 / ISO/IEC 23053:2022** — Framework for AI systems using ML | Описание компонентов и функций ML-based AI system |
| P1 | **ПНСТ 843-2023 / ISO/IEC 38507:2022** | AI governance implications для организаций |
| P1 | **ПНСТ 963-2024 / ISO/IEC 5339:2024** — Guidance for AI applications | Guidance по проектированию и эксплуатации AI-приложений |
| P1 | **ПНСТ 953-2024** — Классификация алгоритмов и вычислительных методов | Каталог/таксономия алгоритмов для Model/Algorithm Registry |
| Historical | **ПНСТ 776-2022** — AI Risk Management | Отменён; не использовать как действующее нормативное основание |

---

# 7. Информационная безопасность и AI Security

| Приоритет | Документ | Использование |
|---|---|---|
| P0/P1 | **ГОСТ Р ИСО/МЭК 27001-2021** | ISMS, управление ИБ |
| P1 | **ГОСТ Р ИСО/МЭК 27002-2021** | Каталог мер ИБ |
| P1 | **ГОСТ Р 56939-2024** — Разработка безопасного ПО | Secure SDLC, SAST/DAST/SCA, устранение уязвимостей |
| P2 | **ГОСТ Р ИСО/МЭК 27017-2021** | Безопасность облачных сервисов, если используем cloud |
| P2 | **ГОСТ Р ИСО/МЭК 27018-2020** | Защита ПДн в публичных облаках, если применимо |
| P1 | **NIST AI RMF 1.0 + AI RMF Playbook** | Практическая модель Govern / Map / Measure / Manage |
| P1 | **NIST AI 600-1 Generative AI Profile** | Риски генеративного ИИ |
| P0/P1 | **OWASP GenAI / LLM Top 10 2026** | Prompt injection, sensitive information disclosure, supply chain, poisoning, improper output handling и др. |
| P1 | **MITRE ATLAS** | Threat model и база TTP атак на AI/ML/GenAI/Agentic systems |
| P2 | **NIST SP 800-53 / 800-61 / 800-207** | Security controls, incident response, Zero Trust — при переходе в enterprise |
| P2 | **ПНСТ 1046-2026** — Искусственный интеллект в критической информационной инфраструктуре. Общие положения | Профиль для будущего KII/critical-infrastructure режима |

---

# 8. Непрерывность, аудит, эксплуатация

| Приоритет | Документ | Использование |
|---|---|---|
| P2 | **ГОСТ Р ИСО 22301-2021** — Системы менеджмента непрерывности деятельности | Backup/restore, отказоустойчивость, continuity |
| P1 | **ГОСТ Р ИСО 31000-2019** | Риски эксплуатации и изменений |
| P1 | **ГОСТ Р ИСО/МЭК 27001/27002** | Audit, logging, access control, security incidents |

---

# 9. Моделирование архитектуры и бизнес-процессов

| Приоритет | Документ/метод | Использование |
|---|---|---|
| P0 | **Р 50.1.028-2001 / IDEF0** | Функциональная декомпозиция процессов |
| P1 | **BPMN 2.0 / ISO/IEC 19510** | Event-driven workflow, swimlanes, gateways, exceptions |
| P1 | **C4 Model** | Context / Container / Component / Deployment архитектура |
| P1 | **OpenAPI 3.x** | Формальный контракт REST API |
| P1 | **JSON Schema 2020-12** | Формальные data contracts между модулями |
| P1 | **AsyncAPI** | Контракты event-driven взаимодействия, когда появится Process Event Bus |

---

# 10. Законодательство РФ — подключается по профилю данных

Не является алгоритмической основой Analyst Core, но обязательно учитывается в соответствующих Domain Profiles и при эксплуатации:

- **149-ФЗ** «Об информации, информационных технологиях и о защите информации»;
- **152-ФЗ** «О персональных данных» — если есть ПДн;
- **187-ФЗ** «О безопасности критической информационной инфраструктуры РФ» — при KII-профиле;
- **98-ФЗ** «О коммерческой тайне» — при работе с закрытой корпоративной информацией;
- подзаконные акты ФСТЭК/ФСБ/РКН — для конкретного режима обработки и класса системы.

---

# 11. Основная литература по алгоритмам и методологии

## A. Information Retrieval / RAG / поиск

1. **Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze — Introduction to Information Retrieval.**  
   База для inverted index, ranking, TF-IDF/BM25, evaluation, relevance.

2. **Ricardo Baeza-Yates, Berthier Ribeiro-Neto — Modern Information Retrieval.**  
   Дополнительная теория retrieval/search.

## B. NLP / extraction / LLM

3. **Dan Jurafsky, James H. Martin — Speech and Language Processing, 3rd ed. draft.**  
   NLP, tokenization, classification, sequence labeling, transformers, LLM, ASR/TTS.

4. **Steven Bird, Ewan Klein, Edward Loper — Natural Language Processing with Python.**  
   Классические NLP pipelines, полезно для rule/ML baseline.

5. **Lewis Tunstall, Leandro von Werra, Thomas Wolf — Natural Language Processing with Transformers.**  
   Практика transformer-based extraction/classification.

## C. Knowledge Graph / ontology / semantic layer

6. **Aidan Hogan et al. — Knowledge Graphs.**  
   Data graphs, schema, identity, context, deductive/inductive knowledge, creation, enrichment, quality, refinement, publication.

7. **Dean Allemang, James Hendler, Fabien Gandon — Semantic Web for the Working Ontologist, 3rd ed.**  
   RDF/RDFS/OWL, domain ontologies, semantic modeling.

8. **William L. Hamilton — Graph Representation Learning.**  
   Graph embeddings, GNN, multi-relational graph learning.

## D. Uncertainty / hypotheses / probabilistic reasoning

9. **Daphne Koller, Nir Friedman — Probabilistic Graphical Models: Principles and Techniques.**  
   Bayesian/Markov models, uncertainty, inference, relational/dynamic models.

10. **Judea Pearl — Causality.**  
    Причинно-следственный анализ, causal graphs, interventions.

11. **Judea Pearl, Dana Mackenzie — The Book of Why.**  
    Более прикладное введение в причинность.

## E. Data Quality / Entity Resolution / Data Engineering

12. **Carlo Batini, Monica Scannapieco — Data and Information Quality: Dimensions, Principles and Techniques.**  
    Accuracy, completeness, consistency, provenance, matching, quality improvement.

13. **Carlo Batini, Monica Scannapieco — Data Quality: Concepts, Methodologies and Techniques.**  
    Базовый методический справочник по data quality.

14. **Martin Kleppmann, Chris Riccomini — Designing Data-Intensive Applications, 2nd ed., 2026.**  
    Storage, consistency, streaming, replication, integrity, dataflows, distributed systems.

15. **Joe Celko — Joe Celko’s SQL for Smarties / Trees and Hierarchies in SQL.**  
    Практические модели связей/иерархий при работе с SQL.

## F. AI / ML system design

16. **Stuart Russell, Peter Norvig — Artificial Intelligence: A Modern Approach, 4th ed.**  
    Search, knowledge, reasoning, uncertainty, planning, ML, NLP, agents.

17. **Chip Huyen — Designing Machine Learning Systems.**  
    Production ML lifecycle, data, monitoring, reliability, retraining, platform design.

18. **Andriy Burkov — Machine Learning Engineering.**  
    Практический production ML.

## G. Business Process / architecture

19. **Marlon Dumas, Marcello La Rosa, Jan Mendling, Hajo Reijers — Fundamentals of Business Process Management, 2nd ed.**  
    BPM lifecycle: identification, modeling, analysis, redesign, automation, monitoring.

20. **Bruce Silver — BPMN Method and Style, 2nd ed.**  
    Практика построения корректных и однозначных BPMN моделей.

21. **Simon Brown — Software Architecture for Developers / C4 Model.**  
    Архитектурные уровни C4 и документирование архитектуры.

22. **Mark Richards, Neal Ford — Fundamentals of Software Architecture.**  
    Архитектурные стили, trade-offs, модульность, evolutionary architecture.

## H. Security / threat modeling

23. **Adam Shostack — Threat Modeling: Designing for Security.**  
    STRIDE, threat modeling workflow.

24. **Ross Anderson — Security Engineering.**  
    Системная инженерия безопасности.

25. **Michael Howard, David LeBlanc — Writing Secure Code.**  
    Secure design and implementation.

---

# 12. Как литература привязывается к нашему pipeline

```text
RAW / SOURCE
→ ГОСТ Р 58545
→ ГОСТ Р 70889
→ records/provenance standards

PARSE / NORMALIZE / QUALITY
→ ГОСТ Р 71484.1-.4
→ ГОСТ Р 72663-2026
→ Batini & Scannapieco

CHUNK / SEARCH / RAG
→ Manning/Raghavan/Schütze
→ Jurafsky/Martin

ENTITY / CLAIM / FACT / RELATION
→ Jurafsky/Martin
→ Hogan et al.
→ Russell/Norvig

ONTOLOGY / GRAPH
→ ГОСТ Р 71540-2024
→ RDF / OWL / SPARQL / JSON-LD / SHACL
→ Allemang/Hendler/Gandon

TIMELINE / HYPOTHESIS / CAUSALITY
→ Koller/Friedman
→ Pearl

SENIOR REVIEW / TRUST / HUMAN-IN-THE-LOOP
→ ГОСТ Р 59276
→ ГОСТ Р ИСО/МЭК 42001
→ NIST AI RMF

AI SECURITY
→ ГОСТ Р 56939-2024
→ ISO 27001/27002
→ OWASP GenAI Top 10
→ MITRE ATLAS

PROCESS / ARCHITECTURE
→ Р 50.1.028-2001 IDEF0
→ BPMN 2.0
→ C4
→ OpenAPI / JSON Schema / AsyncAPI
```

---

# 13. Приоритет изучения

## Первая волна — читать и применять немедленно

1. ГОСТ Р 71540-2024 — инженерия знаний.
2. ГОСТ Р 58545-2019 — сбор/классификация/обработка информации.
3. ГОСТ Р 71484.1-.4-2024 — data quality.
4. ГОСТ Р 70889-2023 — data lifecycle.
5. ГОСТ Р 71539-2024 — AI lifecycle.
6. ГОСТ Р ИСО/МЭК 42001-2024 — AI management.
7. ГОСТ Р 59276-2020 — trust.
8. W3C PROV-O.
9. Hogan et al. — Knowledge Graphs.
10. Jurafsky & Martin — Speech and Language Processing.
11. Manning et al. — Introduction to Information Retrieval.
12. Batini & Scannapieco — Data and Information Quality.

## Вторая волна — при реализации P0/P1

- RDF/OWL/SPARQL/JSON-LD/SHACL;
- 12207 / SQuaRE / testing series;
- Koller/Friedman;
- Pearl;
- Designing Data-Intensive Applications;
- Designing Machine Learning Systems;
- OWASP GenAI / MITRE ATLAS;
- BPMN / IDEF0 / C4.

---

# 14. Правило использования источников

Каждый алгоритмический модуль Analyst Core должен иметь в своей карточке:

```text
MODULE
PURPOSE
ALGORITHM / METHOD
NORMATIVE BASIS
BOOK / SCIENTIFIC BASIS
INPUT CONTRACT
OUTPUT CONTRACT
QUALITY METRIC
SECURITY CONTROLS
KNOWN LIMITATIONS
VERSION
```

То есть мы не просто «читаем книги». Каждый существенный механизм должен быть связан с конкретным нормативным или методическим основанием и тестируемым показателем качества.
