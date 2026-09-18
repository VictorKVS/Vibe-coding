# Specialist Factory Codex Register

**Version:** 0.1-DRAFT
**Parent:** 00_SPECIALIST_FACTORY_CONSTITUTION.md

Конституция определяет, что такое FATHER Specialist. Кодексы определяют, что Factory обязана делать для выполнения Конституции.

> Нет обязательного артефакта — этап не выполнен. Нет provenance — утверждение не верифицировано. Нет независимой оценки — компетенция не подтверждена. Нет regression — улучшение не выпускается.

Каждый подробный кодекс обязан содержать: PURPOSE, INPUT, MUST, MUST NOT, ALGORITHM, DECISION RULES, OUTPUT, EVIDENCE, QUALITY GATE, FAIL PATH, AUDIT.

| ID | Кодекс | Что делает | Обязательный результат |
|---|---|---|---|
| C01 | Profession Discovery | Устанавливает профессию, границы, outcomes, tasks, уровни и карту источников до построения KB | PROFESSION_DOSSIER |
| C02 | Evidence | Проверяет identity/version/authority/currentness/applicability/independence источников и claims | SOURCE_REGISTER; EVIDENCE_REGISTER; CONTRADICTION_REGISTER |
| C03 | Professional Template | Нормализует evidence и строит аудируемое лекало профессии | PROFESSIONAL_TEMPLATE_vN; EVIDENCE_GRAPH |
| C04 | Competency Engineering | Outcome → Task → Competency → Skill/Method → Knowledge/Tool → Assessment | COMPETENCY_MAP |
| C05 | Curriculum | Определяет prerequisites, Resident/On-Demand knowledge и порядок обучения | CURRICULUM; LEARNING_GRAPH |
| C06 | Knowledge Build | Превращает проверенные источники в типизированные Knowledge Units | KNOWLEDGE_PACKAGE |
| C07 | Research & OSINT | Превращает gap в ограниченный Research Order; принимает Raw Evidence, не готовую истину | RESEARCH_ORDER; RAW_EVIDENCE_INTAKE |
| C08 | Legal & Ethics | Разделяет MUST/SHOULD/MAY/PRACTICE/OPINION; ведёт jurisdiction/version/applicability | REGULATORY_LAYER; ETHICAL_LAYER |
| C09 | Specialist Assembly | Собирает versioned specialist только после upstream gates | DIGITAL_SPECIALIST_PACKAGE |
| C10 | Examination | Независимо проверяет применение, анализ, ошибки, синтез, defence и unseen transfer | EVALUATION_REPORT |
| C11 | Gap & Improvement | Ищет root cause, исправляет нужный слой, делает retest/regression | GAP_REGISTER; IMPROVEMENT_PLAN; REGRESSION_REPORT |
| C12 | Governance | Разделяет proposal, approval, build, examination и release | APPROVAL_RECORD; RELEASE_RECORD; AUDIT_TRAIL |

## Порядок

C01 → C02 → C03 → C04 → C05 → C06 → C07 → C08 → C09 → C10 → C11 → C12.

C07/C08 могут вызываться итерационно, но их результаты проходят соответствующие evidence gates.

Подробные кодексы пишутся и утверждаются **по одному**, начиная с C01. Наличие записи здесь не означает, что кодекс уже реализован или утверждён.
