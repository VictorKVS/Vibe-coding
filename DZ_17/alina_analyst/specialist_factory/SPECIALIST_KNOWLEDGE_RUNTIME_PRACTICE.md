# Specialist Knowledge Runtime Practice

Status: DRAFT v0.1

## Purpose

Общая обязательная практика для всех цифровых специалистов FATHER.

LLM не является источником профессиональной истины. Специалист решает задачи, постоянно обращаясь к версионируемой Knowledge Base, извлекает доказательный пакет для существенных решений, проверяет решение относительно применимых требований и уже принятых решений и сохраняет проверяемый Decision Ledger.

## Слои основания специалиста

1. Context / jurisdiction.
2. Laws and normative acts.
3. Applicable standards: ГОСТ / ISO / IEC / отраслевые стандарты.
4. Professional standards and professional functions.
5. International professional frameworks / Bodies of Knowledge / recognized practice.
6. Professional education and curricula.
7. Scientific and engineering knowledge.
8. Practice, tools and projects.
9. Experience bank: errors, incidents, difficult and unseen cases.
10. Independent examination and benchmark evidence.

Порядок слоёв не означает автоматическую юридическую иерархию. Применимость и обязательность каждого нормативного источника устанавливаются отдельно.

## Runtime loop

TASK
→ decomposition
→ retrieval plan
→ Knowledge Graph / RAG
→ Evidence Pack
→ decision step
→ consistency validation
→ next step
→ final validation
→ answer + provenance + limitations.

После каждого профессионально значимого шага проверяются:
- использованные Knowledge Units;
- применимые requirements;
- версии источников и currentness;
- противоречия;
- UNKNOWN;
- совместимость с предыдущими решениями.

## Evidence Pack

Должен содержать только релевантный контекст:
- applicable requirements;
- knowledge units;
- exact source fragments;
- previous decisions;
- contradictions;
- current versions;
- unknowns.

## Decision Ledger

Decision Ledger хранит не скрытые рассуждения модели, а проверяемые профессиональные решения: утверждение, использованные основания, ссылки на Knowledge Units/Evidence/Requirements, зависимости от предыдущих шагов, результаты consistency checks, ограничения и UNKNOWN.

## Learning and qualification loop

Knowledge node:
DISCOVERED → SOURCED → LEARNED → REPRODUCED → APPLIED → TRANSFERRED → VALIDATED.

Чтение материала не подтверждает компетенцию. Подтверждение требует применения, transfer на новой задаче и независимой оценки.

FAIL
→ классификация GAP
→ research / KB update
→ retraining
→ retest
→ regression check.

## Change impact

Изменение закона, стандарта, профстандарта, evidence или существенного Knowledge Unit запускает impact analysis:
source change → requirements → competencies → curriculum → knowledge units → exams → released specialists → retraining/re-examination decision.

## Mandatory rules

- No provenance → knowledge claim is not verified.
- No independent evaluation → competency is not validated.
- LLM memory is not evidence.
- FACT ≠ CLAIM ≠ INFERENCE ≠ HYPOTHESIS.
- UNKNOWN is a valid state.
- Historical versions are never overwritten.
- RAG/embeddings are access indexes, not canonical knowledge.
- Significant decisions must be traceable to their basis.
- New knowledge does not enter Resident KB without a promotion gate.
