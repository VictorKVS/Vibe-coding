# ALINA / FATHER PostgreSQL

Порядок безопасного подключения существующей рабочей БД:

```text
0. BACKUP EXISTING DB
1. npm run db:inventory
2. review database_snapshots/inventory/*
3. map existing tables to ALINA objects
4. apply knowledge_factory_v0.sql
5. apply security_hardening_v0.sql
6. reconcile counts / hashes
7. migrate current Git registries only through reviewed migration
8. run first db:snapshot
9. acceptance
10. operational cutover
```

`knowledge_factory_v0.sql` не удаляет и не переименовывает существующие пользовательские таблицы. Он создаёт отдельные schemas:

```text
kf
audit
git_export
```

`security_hardening_v0.sql` создаёт только NOLOGIN group roles и grants/revokes; пароли, LOGIN roles и connection strings в Git не хранятся.

Ключевой принцип для графа:

```text
node/edge = canonical object projection
weight = append-only version history
```

Старый вес не перезаписывается. Новая версия обязана иметь reason, method/factors/source_refs и supersedes_version.

Git snapshot не является полным backup. В Git попадает только `git_export.*`, то есть `public + git_export_allowed`. Full dump остаётся local/protected outside Git.
