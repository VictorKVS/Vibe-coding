# ALINA / FATHER — Database Storage and Git Snapshot Policy

Status: `SELECTED / EVOLVING`  
Origin class: `HUMAN_DECISION + PROJECT_DECISION`

## 1. Решение

Рабочая база данных — PostgreSQL + pgvector. Существующую пользовательскую базу **не заменяем и не пересоздаём**. ALINA добавляет изолированные схемы `kf`, `audit`, `git_export`, поэтому внедрение можно выполнить без уничтожения уже существующих таблиц.

```text
EXISTING POSTGRESQL DATABASE
        │
        ├── existing user schemas     # не трогаем без отдельного migration plan
        │
        ├── kf                        # Source / Capture / spans / knowledge / graph
        ├── audit                     # append-only events + snapshot manifests
        └── git_export                # только безопасные PUBLIC projections
```

Git **не является резервной копией всей БД**. В публичный Git нельзя складывать полный `pg_dump`, connection strings, локальные пути, персональные/закрытые данные, OSINT-sensitive records, embeddings или raw source text без отдельного разрешения.

Git хранит:

```text
DDL / migrations
security policy
sanitized PUBLIC projections
nodes / edges / current weights, разрешённые к Git-export
schema snapshot
snapshot manifest + hashes + reason + actor
history через обычные Git commits
```

Полный dump хранится отдельно, локально/в защищённом backup storage, с SHA-256 в manifest.

## 2. Что куда складываем

### Source plane

`kf.source`
- один юридический/книжный/технический источник = один Source;
- полное название, реквизиты, issuer, legal status;
- `classification` + `git_export_allowed`;
- filename не является юридическим title.

`kf.capture`
- конкретный файл/редакция;
- SHA-256 — ключ дедупликации файла;
- `storage_ref` может содержать локальный путь и поэтому никогда не попадает в Git projection.

`kf.structure_node`, `kf.source_span`
- физическая структура документа и точные адресуемые фрагменты;
- raw text хранится в БД один раз;
- Git-export raw text по умолчанию запрещён.

### Knowledge plane

`kf.knowledge_object`
- Concept / Claim / Evidence / Principle / Method / Algorithm / Control / Metric / Requirement / Hypothesis / Contradiction / OpenQuestion;
- canonical ID, version, status, review, origin class, payload;
- supersedes вместо destructive overwrite.

`kf.object_source_link`
- трасса knowledge object → Source / SourceSpan / locator.

`kf.knowledge_relation`
- отношения между знаниями.

### Graph plane

`kf.graph_node`
- проекция canonical objects в граф;
- не создаёт вторую независимую истину.

`kf.graph_edge`
- связь узлов.

`kf.node_weight_version`, `kf.edge_weight_version`
- веса **никогда не перезаписываются**;
- каждая новая оценка = новая версия;
- сохраняются `method_id`, `factors`, `source_refs`, `reason`, `created_by`, `supersedes_version`.

Это обязательно, потому что при проходе по узлам и весам нам нужно видеть:

```text
почему вес был 0.52
кто/какой метод его поставил
из каких факторов он сложился
на какие evidence/source refs опирался
почему стал 0.67
какую версию он заменил
```

### Validation / audit

`kf.review_decision`
- независимые решения Reviewer / Security / Human.

`audit.event`
- append-only журнал мутаций;
- UPDATE/DELETE запрещены trigger-ом.

`audit.snapshot_manifest`
- запись о каждом backup/Git snapshot.

## 3. Классификация данных

Каждый объект, который потенциально может попасть в Git, обязан иметь:

```text
classification = public | internal | restricted | secret
git_export_allowed = true | false
```

Правило по умолчанию:

```text
classification = internal
git_export_allowed = false
```

В `git_export.*` попадает только:

```text
classification = public
AND git_export_allowed = true
```

Поэтому публичные нормативные документы можно версионировать через Git, а закрытые/служебные материалы автоматически туда не проходят.

## 4. Git snapshot после значимого изменения

Для значимых проходов по документам, узлам, связям и весам применяется цикл:

```text
DB TRANSACTION
→ audit.event
→ validation/review if required
→ local protected full backup
→ sanitized git_export snapshot
→ SHA-256 all exported files
→ snapshot manifest
→ Git commit with reason
```

Причина (`reason`) обязательна. Примеры commit messages:

```text
db-snapshot: ingest 152-FZ and build legal structure
db-snapshot: add KII relations and source links
db-snapshot: recalculate graph weights method WEIGHT-v2
db-snapshot: review legal IB nodes batch 004
```

Не делать `git commit` на каждую SQL-строку. Commit boundary = одна законченная, объяснимая операция/пакет: документ, batch узлов, пересчёт weights, review, migration.

## 5. Физические Git paths

```text
DZ_17/postgres/
├── knowledge_factory_v0.sql
└── security_hardening_v0.sql

DZ_17/database_snapshots/
├── README.md
├── current/
│   ├── schema.sql
│   ├── sources.jsonl
│   ├── knowledge_objects.jsonl
│   ├── knowledge_relations.jsonl
│   ├── graph_nodes.jsonl
│   ├── graph_edges.jsonl
│   ├── node_weights.jsonl
│   ├── edge_weights.jsonl
│   ├── reviews.jsonl
│   └── manifest.json
└── SNAPSHOT_HISTORY.jsonl
```

История `current/*` хранится самим Git. Не надо создавать тысячи timestamp-каталогов в репозитории.

## 6. Полные backups — отдельно от Git

Локальный full dump:

```text
DZ_17/app/runtime/database-backups/
```

Этот каталог должен быть ignored Git-ом.

Минимум для каждого full dump:

```text
created_at
actor
reason
pg_dump format
SHA-256
DB schema version
Git snapshot manifest ID
```

Сам dump не коммитится в публичный Git. Для настоящего disaster recovery нужна отдельная защищённая копия на другом носителе/backup storage. Git защищает историю схемы и безопасного knowledge projection, но не заменяет DB backup.

## 7. Доступ

Групповые PostgreSQL-роли:

```text
alina_app_rw
alina_analyst_ro
alina_security_review
alina_backup_ro
```

`alina_backup_ro` видит только `git_export` + snapshot metadata.

Login/password/сертификаты создаются вне Git. `.env.local` остаётся локальным. Repo хранит только пустые переменные в `.env.example`.

## 8. Existing database cutover

До подключения существующей БД:

```text
1. schema-only inventory existing DB
2. список extension/version
3. список schemas/tables/constraints/indexes
4. объёмы таблиц
5. поиск уже существующих Source/Node/Edge/Weight сущностей
6. mapping existing → kf.*
7. migration dry-run
8. backup
9. apply isolated schemas
10. reconciliation counts + hashes
11. acceptance
```

Запрещено автоматически переносить/удалять существующие таблицы до inventory.

После cutover source of truth:

```text
PostgreSQL = operational canonical state
Git        = DDL + policy + reviewed/sanitized projection + audit manifests
```

До cutover существующие JSON registries в репозитории продолжают считаться каноническими для своих текущих областей. После migration они становятся Git projections/exports, чтобы не было двух независимо редактируемых truth stores.

## 9. Узлы и веса — обязательная бюрократия

Любое изменение веса должно отвечать на вопросы:

```text
NODE/EDGE ID?
old version?
new version?
old weight?
new weight?
method/version?
factors?
source/evidence refs?
reason?
actor/model?
review status?
trace id?
Git snapshot/commit?
```

Без этих данных новый вес остаётся `experimental` и не может считаться approved production knowledge.

## 10. Следующая проверка существующей БД

Репозиторий сейчас подтверждает только наличие server-side переменных `DATABASE_URL / POSTGRES_URL / AUDIT_DATABASE_URL` и UI-флага подключения. Саму пользовательскую PostgreSQL базу из Git проверить нельзя, потому что её connection string и schema dump правильно не хранятся в репозитории.

Следующий безопасный шаг — выполнить **schema-only inventory** существующей базы и сохранить результат без данных/секретов. После этого делаем точный mapping таблица-в-таблицу, не предполагая структуру БД наугад.
