# FATHER Zero-Base Analyst Reconstruction — эталонный процесс обучения аналитика

Status: `PROJECT_DECISION / REQUIRED ANALYTICAL MODE / EVOLVING`

## 1. Назначение

Этот документ задаёт обязательный режим работы, в котором Аналитик/LLM должна уметь **самостоятельно восстановить предметную область с нуля**, не опираясь на готовый knowledge graph, существующие связи или ранее сформированные аналитические выводы как на первичный источник.

152-ФЗ используется как первый эталонный учебно-проверочный кейс.

Главный принцип:

```text
PRIMARY SOURCES FIRST
→ INDEPENDENT RECONSTRUCTION
→ CLAIMS / EVENTS / RELATIONS / CAUSES
→ OWN GRAPH CANDIDATE
→ ONLY THEN COMPARE WITH EXISTING KB
```

Готовая Knowledge Base используется после независимого анализа как:

```text
CONTROL / BENCHMARK / COUNTER-EVIDENCE / GAP DETECTOR
```

а не как подсказка, из которой Аналитик просто повторяет существующие узлы.

---

## 2. Что Аналитик должна уметь без готового графа

Для любого выбранного нормативного документа Аналитик обязана самостоятельно:

1. установить юридическую идентичность документа;
2. найти первичный официальный текст;
3. восстановить дату принятия, публикации и вступления в силу;
4. найти первоначальную редакцию;
5. найти все последующие изменяющие акты;
6. построить цепочку редакций;
7. определить, какие статьи/части/пункты менялись;
8. найти связанные нормативные акты;
9. определить тип каждой связи;
10. восстановить исторический контекст создания документа;
11. отделить подтверждённые причины изменений от аналитических гипотез;
12. выявить появление новых обязанностей, прав, ограничений и исключений;
13. определить, какие органы/роли/системы затронуты;
14. найти акты, конкретизирующие или реализующие требования закона;
15. найти отменённые, заменённые, конкурирующие и уточняющие нормы;
16. построить собственный граф кандидатов;
17. найти противоречия и пробелы;
18. сформировать вопросы, на которые источников пока недостаточно;
19. только после завершения независимой реконструкции сравнить результат с существующей KB;
20. объяснить расхождения и предложить ChangeSet.

---

## 3. Запрет на подсматривание в готовую KB

В режиме `ZERO_BASE_RECONSTRUCTION` до контрольной фазы запрещено использовать как evidence:

- готовые relations из Knowledge Graph;
- существующие выводы Analyst;
- вручную созданные связи между документами;
- готовые requirement mappings;
- существующие impact conclusions;
- ранее рассчитанные causal explanations;
- готовые summaries как замену первичному источнику.

Разрешено использовать только:

```text
source registry metadata
официальные/проверяемые первичные источники
сырой Capture
версии текста
библиографические идентификаторы
поисковые индексы, не содержащие готового ответа
```

Система должна уметь технически включать `blind_mode=true`, скрывая контрольные графовые связи до окончания реконструкции.

---

## 4. Эталонный кейс: 152-ФЗ

Аналитик получает стартовую задачу примерно такого вида:

```text
Объект: Федеральный закон №152-ФЗ «О персональных данных».
Цель: самостоятельно восстановить его происхождение, развитие, редакции,
изменяющие акты, связанные нормативные документы, требования и последствия.
Не использовать готовые связи FATHER до контрольной фазы.
```

Исходный seed минимален:

```text
document number = 152-ФЗ
document date = 27.07.2006
title = О персональных данных
jurisdiction = RU
```

Всё остальное должно быть найдено и доказано Аналитиком.

---

## 5. Полный Zero-Base Pipeline

```text
Z0 TASK SEED
↓
Z1 SOURCE DISCOVERY
↓
Z2 DOCUMENT IDENTITY
↓
Z3 ORIGINAL VERSION ACQUISITION
↓
Z4 CURRENT VERSION ACQUISITION
↓
Z5 VERSION / AMENDMENT DISCOVERY
↓
Z6 TIMELINE RECONSTRUCTION
↓
Z7 STRUCTURAL DIFF
↓
Z8 RELATED-DOCUMENT DISCOVERY
↓
Z9 RELATION CLASSIFICATION
↓
Z10 REQUIREMENT EXTRACTION
↓
Z11 HISTORICAL / POLICY CONTEXT
↓
Z12 CAUSE / MOTIVE ANALYSIS
↓
Z13 IMPACT ANALYSIS
↓
Z14 CONTRADICTIONS / GAPS
↓
Z15 INDEPENDENT GRAPH CANDIDATE
↓
Z16 CONTROL UNBLIND
↓
Z17 COMPARE WITH CANONICAL KB
↓
Z18 EXPLAIN DIFFERENCES
↓
Z19 REVIEW
↓
Z20 CANONICAL KB CHANGESET
```

---

## 6. Z1 — Source Discovery

Аналитик сама формирует карту источников.

Приоритет:

```text
A0 официальный первичный источник
A1 официальный реестр / регулятор / орган власти
A2 авторитетная правовая система / рабочая копия
B  научная/профессиональная вторичная литература
C  пересказ / медиа / блог
```

Для каждого найденного источника:

```text
source_id
source_type
authority_level
canonical_uri
acquired_at
published_at
hash if captured
coverage
reliability notes
```

---

## 7. Z2 — Document Identity

Аналитик должна независимо подтвердить:

```text
title
number
date
issuer / adopted_by
jurisdiction
document_type
official publication identity
initial effective date
current status
```

Совпадение имени файла или старого registry row не является достаточным доказательством.

---

## 8. Z3–Z6 — История и редакции

Для 152-ФЗ Аналитик должна построить не просто «текущую версию», а временную цепочку:

```text
ORIGINAL 2006
→ AMENDING ACT A
→ VERSION N
→ AMENDING ACT B
→ VERSION N+1
→ ...
→ CURRENT AS-OF DATE
→ FUTURE ADOPTED CHANGES
```

Для каждого перехода:

```text
from_version
to_version
amending_act
adopted_at
published_at
effective_from
changed_fragments
source evidence
verification status
```

Важно разделять:

```text
ADOPTED
PUBLISHED
EFFECTIVE
FUTURE_EFFECTIVE
REPEALED
SUPERSEDED
```

---

## 9. Z7 — Structural Diff

Аналитик сама вычисляет:

```text
ADDED
CHANGED
REPEALED
MOVED
RENUMBERED
UNCHANGED
```

с привязкой к exact fragment.

Выход:

```text
old fragment
new fragment
change kind
amending act
legal effective date
semantic delta
```

`semantic delta` является аналитическим выводом и хранится отдельно от буквального diff.

---

## 10. Z8 — Поиск связанных документов

Связи не берутся из готового графа. Аналитик ищет их самостоятельно из:

- прямых ссылок внутри закона;
- актов о внесении изменений;
- подзаконных актов;
- актов регуляторов;
- актов, устанавливающих ответственность;
- судебных/официальных разъяснений при применимости;
- официальных перечней требований;
- документов, использующих терминологию/определения закона;
- актов, реализующих технические или организационные требования.

Каждая связь должна иметь evidence.

---

## 11. Z9 — Типы отношений

Минимальный словарь:

```text
AMENDS
SUPERSEDES
REPEALS
IMPLEMENTS
DETAILS
CLARIFIES
REFERENCES
DEPENDS_ON
DEFINES
APPLIES_TO
REQUIRES
EXEMPTS
ESTABLISHES_LIABILITY_FOR
EVIDENCES
CONTRADICTS
RELATED_TO
```

Запрещено создавать `RELATED_TO`, если может быть доказан более точный тип связи.

---

## 12. Z10 — Требования

Из текста извлекаются не только chunks, а обязательства и условия:

```text
SUBJECT
ACTION / DUTY
OBJECT
CONDITION
EXCEPTION
DEADLINE
EVIDENCE
LEGAL BASIS
```

Пример логической структуры:

```text
ROLE / SUBJECT
→ MUST / MAY / MUST NOT
→ ACTION
→ OBJECT
→ CONDITION
→ DEADLINE
→ EXCEPTION
→ EXACT FRAGMENT
```

---

## 13. Z11 — Предыстория создания закона

История возникновения нормы строится отдельным аналитическим слоем.

Нужно искать:

```text
предшествовавшее регулирование
международные обязательства / модели, если доказуемо
проблему, которую закон должен был решить
проект закона и пояснительные материалы, если доступны
позиции органов власти
исходную терминологию
первые обязанности и ограничения
```

Все выводы делятся на:

```text
CONFIRMED FACT
OFFICIAL STATED RATIONALE
INFERENCE
HYPOTHESIS
UNKNOWN
```

Запрещено выдавать реконструированный мотив законодателя за факт без источника.

---

## 14. Z12 — Почему закон менялся

Для каждого существенного изменения Аналитик должна попытаться установить:

```text
WHAT CHANGED
WHEN
BY WHICH ACT
OFFICIAL REASON, if available
PROBLEM ADDRESSED
NEW OBLIGATION / RIGHT / EXCEPTION
WHO IS AFFECTED
WHAT OTHER DOCUMENTS BECAME RELEVANT
```

Если официальная причина не найдена:

```text
cause_status = NOT_ESTABLISHED
```

Допускается аналитическая версия:

```text
cause_status = HYPOTHESIS
```

но она не смешивается с юридическим фактом.

---

## 15. Z13 — Impact Analysis

Для каждого изменения:

```text
LEGAL REQUIREMENT
→ ORGANIZATION
→ ROLE
→ PROCESS
→ INFORMATION SYSTEM
→ CONTROL
→ DOCUMENT / POLICY
→ EVIDENCE
→ RISK
```

Связь считается подтверждённой только при наличии legal/internal/technical evidence.

---

## 16. Z14 — Противоречия и пробелы

Аналитик обязана искать не только подтверждение, но и:

```text
несогласованные определения
пересекающиеся обязанности
коллизии
различающиеся сроки
неочевидные исключения
ссылки на утратившие силу документы
неполные цепочки реализации
неподтверждённые причинные объяснения
missing source
```

Противоречие не разрешается автоматически.

---

## 17. Z15 — Независимый граф-кандидат

До открытия эталонной KB создаётся отдельный `reconstruction_run_id` и граф-кандидат:

```text
nodes_candidate
edges_candidate
claims_candidate
timeline_candidate
requirements_candidate
contradictions_candidate
open_questions
```

Он не должен автоматически становиться canonical graph.

---

## 18. Z16–Z18 — Контрольное раскрытие эталона

Только после фиксации собственного результата:

```text
freeze reconstruction result
↓
unblind canonical KB
↓
compare
```

Сравнение классифицируется:

```text
MATCH
ANALYST_FOUND_EXTRA
CANONICAL_FOUND_EXTRA
CONFLICT
DIFFERENT_RELATION_TYPE
DIFFERENT_VERSION_BOUNDARY
MISSING_EVIDENCE
STALE_CANONICAL_RECORD
ANALYST_ERROR
```

Главная задача — не добиться 100% совпадения любой ценой, а понять, **почему результаты различаются**.

---

## 19. Метрики способности Аналитика

На эталонном кейсе 152-ФЗ измеряются:

```text
source discovery recall
source authority precision
version-chain completeness
amending-act recall
fragment-diff precision
related-document recall
relation-type precision
requirement extraction precision/recall
provenance completeness
unsupported-claim rate
contradiction discovery rate
open-question quality
canonical-gap discovery
false-link rate
```

До накопления benchmark эти метрики не превращаются в выдуманный overall score.

---

## 20. Учебный цикл

152-ФЗ становится первым benchmark corpus:

```text
RUN 1: BLIND ZERO-BASE
→ REVIEW
→ ERROR TAXONOMY
→ CORRECTION
→ UPDATE METHOD / PROMPT / RETRIEVAL
→ RUN 2 FROM CLEAN STATE
→ COMPARE METRICS
```

Важно: второй запуск не должен просто получать правильные ответы из первого запуска. Улучшается **метод анализа**, а не список заученных связей.

---

## 21. Что сохраняется как опыт

Experience Store хранит:

```text
run_id
seed
allowed sources
retrieval trace
source candidates
accepted/rejected sources
version reconstruction
claims
relations
open questions
review findings
errors
corrections
method_version
prompt_version
model_route
metric results
```

Не хранится и не требуется скрытая chain-of-thought модели. Хранится внешне проверяемый trace.

---

## 22. Масштабирование после 152-ФЗ

После успешного эталона тот же процесс применяется отдельно к:

```text
187-ФЗ
149-ФЗ
63-ФЗ
ПП РФ №1119
ПП РФ №127
ФСТЭК №17
ФСТЭК №21
ФСТЭК №235
ФСТЭК №239
ФСБ №378
```

Для каждого документа сначала выполняется blind reconstruction, потом сравнение с canonical KB.

Со временем документы начинают образовывать единый самостоятельно реконструированный нормативный граф.

---

## 23. Definition of Done Zero-Base Analyst

Аналитик считается способной работать с нормативным документом самостоятельно, когда она без чтения готовых relations может:

1. найти документ;
2. подтвердить его identity;
3. найти оригинальную и актуальную редакции;
4. найти изменяющие акты;
5. построить временную цепочку;
6. вычислить fragment diff;
7. найти связанные документы;
8. доказать типы связей;
9. извлечь требования;
10. восстановить подтверждаемую предысторию;
11. отделить мотив/причину от гипотезы;
12. построить impact chain;
13. обнаружить противоречия и gaps;
14. построить собственный graph candidate;
15. показать provenance каждого существенного вывода;
16. пройти независимый review;
17. сравнить себя с canonical KB только после freeze;
18. объяснить расхождения;
19. исправить метод анализа;
20. повторить процесс на новом документе без ручной подсказки.

Это является обязательным эталонным путём обучения FATHER Analyst/LLM.
