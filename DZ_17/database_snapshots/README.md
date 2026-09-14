# ALINA Database Snapshots

Этот каталог хранит только **Git-safe projection** рабочей PostgreSQL базы.

Полные dumps, connection strings, локальные пути, raw private source text, embeddings и internal/restricted/secret данные сюда не попадают.

Структура:

```text
current/
  schema.sql
  sources.jsonl
  knowledge_objects.jsonl
  knowledge_relations.jsonl
  graph_nodes.jsonl
  graph_edges.jsonl
  node_weights.jsonl
  edge_weights.jsonl
  reviews.jsonl
  manifest.json

SNAPSHOT_HISTORY.jsonl
```

`current/*` перезаписывается очередным snapshot, но вся история остаётся в Git commits. `SNAPSHOT_HISTORY.jsonl` добавляет одну compact manifest-запись на каждый snapshot.

Экспорт строится только из views `git_export.*`, которые фильтруют записи по правилу:

```text
classification = public
AND git_export_allowed = true
```

Полный локальный backup создаётся отдельно в ignored path:

```text
DZ_17/app/runtime/database-backups/
```

Команда из `DZ_17/app`:

```powershell
npm run db:snapshot -- -Reason "описание законченного изменения"
```

После проверки diff можно выполнить commit автоматически:

```powershell
npm run db:snapshot -- -Reason "recalculate graph weights WEIGHT-v2" -Commit
```

Для каждого snapshot обязательны `actor`, `reason`, counts, SHA-256 schema/exports и запись в `audit.snapshot_manifest`.
