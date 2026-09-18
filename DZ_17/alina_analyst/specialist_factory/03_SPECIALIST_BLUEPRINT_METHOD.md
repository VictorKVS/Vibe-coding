# Specialist Blueprint Method

## 1. Назначение

Blueprint описывает, каким должен быть специалист, но не содержит предположения, что специалист уже обладает этими качествами.

## 2. Каноническая структура

```yaml
specialist:
  id:
  title:
  specialization:
  target_level:
  domain:
  jurisdiction:
  version:
  scope: []
  out_of_scope: []

outcomes: []
tasks: []
responsibilities: []

competencies: []
knowledge_domains: []
skills: []
methods: []
tools: []

education_model:
  foundation: []
  general_professional: []
  professional_core: []
  specialization: []

knowledge_policy:
  resident: []
  on_demand: []
  historical_context: []

learning_graph:
  prerequisites: []

regulatory_layer: []
experience_requirements: []
assessment_requirements: []
evidence_refs: []
known_unknowns: []
```

## 3. Компетенция

Каждая competency должна отвечать на вопросы:
- какой outcome она обеспечивает;
- какие tasks требует;
- какие knowledge units необходимы;
- какие skills/methods применяются;
- в каком контексте проверяется;
- какая ответственность ожидается;
- какими источниками обоснована;
- каким экзаменом проверяется.

## 4. Уровни

Уровень нельзя задавать только словами Junior/Middle/Senior. Для каждого уровня описываются наблюдаемые различия:
- сложность задач;
- автономность;
- широта контекста;
- глубина знаний;
- качество решений;
- ответственность;
- способность работать с неопределённостью;
- способность обнаруживать собственные пробелы;
- устойчивость результата.

SFIA 9 используется как один из внешних ориентиров для progressive responsibility levels, но не переносится механически на все профессии.

## 5. Resident Knowledge

Знание относится к resident, если без него специалист регулярно не способен:
- понимать типовые задачи;
- принимать безопасные/качественные решения;
- замечать типовые ошибки;
- формировать корректный research order;
- оценивать найденную информацию.

## 6. On-Demand Knowledge

Знание может быть on-demand, если специалист:
1. способен определить момент, когда оно требуется;
2. знает класс авторитетных источников;
3. умеет сформировать research question;
4. умеет проверить найденное;
5. способен применить знание;
6. маркирует временно полученное знание и его provenance.

## 7. Historical Context

История включается в resident только когда она необходима для понимания современных понятий, ограничений или решений. Иначе создаётся historical_context map для on-demand research.

## 8. Learning Graph

Knowledge Graph и Learning Graph различаются.

Knowledge Graph отвечает: "как понятия связаны?"  
Learning Graph отвечает: "что необходимо освоить прежде, чем переходить к следующей способности?"

Циклические prerequisites требуют review.

## 9. Evidence coverage

Каждая критическая competency должна иметь evidence_refs. Blueprint без evidence является PROPOSED, а не VERIFIED.

## 10. Выходные статусы

- DRAFT;
- RESEARCHING;
- EVIDENCE_PARTIAL;
- REVIEW_READY;
- VERIFIED_BLUEPRINT;
- DEPRECATED.

VERIFIED_BLUEPRINT означает проверенность лекала, но не компетентность собранного специалиста.
