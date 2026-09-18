# Evidence and Source Policy

## 1. Принцип

Каждое существенное знание должно иметь происхождение. Отсутствие provenance не запрещает хранение, но переводит объект в CANDIDATE/UNVERIFIED.

## 2. Evidence Card

```yaml
claim_id:
statement:
statement_type: SOURCE_FACT | ANALYTICAL_INFERENCE | HYPOTHESIS | FATHER_DESIGN_DECISION | UNKNOWN | CONTESTED
source_id:
source_version_id:
source_type:
authority:
publisher:
publication_date:
effective_from:
effective_to:
locator:
fragment_hash:
captured_at:
supports:
contradicts:
independence_group:
confidence:
review_status:
reviewer:
notes:
```

## 3. Source identity

Один логический источник может иметь PDF, HTML, ODT, scan и mirror representations. Representation не создаёт новое независимое доказательство.

```text
SOURCE_IDENTITY
  ├─ representation PDF
  ├─ representation HTML
  └─ representation ODT
```

## 4. Независимость

Три статьи, пересказывающие один первичный источник, не считаются тремя независимыми основаниями. Система должна по возможности строить lineage:
```text
PRIMARY → DERIVED → SUMMARY → REPOST
```

## 5. Версии

Исторические версии не перезаписываются. Для временно-зависимого знания сохраняются valid/effective dates и дата получения.

## 6. Юридические утверждения

Обязательное требование должно быть отделено от:
- рекомендации;
- best practice;
- позиции автора;
- проекта документа;
- будущей редакции;
- утратившей силу редакции.

Для legal/regulatory claims обязательно: jurisdiction, document status, version, effective dates, exact locator.

## 7. Конфликты

Противоречие не устраняется усреднением. Создаётся CONTESTED object с competing claims и evidence.

## 8. Аналитические выводы

ANALYTICAL_INFERENCE обязан содержать:
- premises;
- evidence links;
- reasoning summary;
- uncertainty;
- alternative explanations, если существенны.

## 9. Критерий достаточности

Confidence не может определяться только количеством источников. Учитываются:
- authority;
- relevance;
- directness;
- independence;
- recency/currentness;
- reproducibility/empirical support;
- contradiction state.

Числовой score допустим только после документированной модели оценки и её валидации.

## 10. Audit

Любое изменение статуса UNVERIFIED→VERIFIED, изменение source identity, merge/dedup или пересмотр claim должно оставлять audit event.
