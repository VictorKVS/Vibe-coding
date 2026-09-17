# ALINA Knowledge Factory — Design Decision Record Template

Использовать для решений, которые меняют baseline или выбирают один из вариантов.

```text
DDR-ID: DDR-YYYY-NNN
Title:
Status: PROPOSED | UNDER_REVIEW | SELECTED | VALIDATED | SUPERSEDED | REJECTED
Date:
Origin class: PROJECT_DECISION | ASSISTANT_PROPOSAL | BENCHMARK_MEASURED | HUMAN_DECISION | ...

1. Problem
   Что нужно решить и почему сейчас.

2. Context
   Текущая архитектура, ограничения, связанные документы.

3. Requirements / hard constraints
   Что нельзя нарушить.

4. Options
   A. ...
   B. ...
   C. ...

5. Evidence
   Научные/нормативные источники, benchmark, measured facts, project constraints.

6. Evaluation criteria
   Критерии, веса/приоритеты и происхождение весов.

7. Decision
   Выбранный вариант.

8. Why selected
   Краткое проверяемое объяснение.

9. Why others not selected
   Причины по каждому варианту.

10. Security impact
    Trust boundary, authority, attack surface, required review.

11. Data / API / Process impact
    IDEF0 / BPMN / data model / C4 / API / schemas / UI.

12. Validation plan
    Prototype / benchmark / polygon / regression / security tests.

13. Rollback / supersession
    Как вернуться назад или заменить решение.

14. Related objects
    DV-...
    ALG-...
    METHOD-...
    SOURCE-...

15. Approval
    Analyst:
    Security:
    Human/Owner:
```

## Правило

DDR хранит **обоснование и историю решения**, но не скрытую chain-of-thought модели. Все аргументы должны быть представлены как проверяемые критерии, evidence, ограничения, результаты тестов и явные выводы.
