-- FATHER Normative Workbench v1 acceptance checks
-- Read-only. Safe to run after father_normative_workbench_v1.sql.

\pset pager off

-- Count the eight required primary tables by exact schema + table name.
-- This intentionally avoids double-counting pre-existing tables with the same
-- name in another schema (for example normative.tags + workbench.tags).
WITH required(schema_name, table_name) AS (
  VALUES
    ('normative','document_versions'),
    ('normative','document_fragments'),
    ('normative','document_change_events'),
    ('normative','fragment_changes'),
    ('workbench','annotations'),
    ('workbench','tags'),
    ('workbench','annotation_tags'),
    ('workbench','fragment_links')
), found AS (
  SELECT r.schema_name, r.table_name,
         EXISTS (
           SELECT 1
           FROM information_schema.tables t
           WHERE t.table_schema=r.schema_name
             AND t.table_name=r.table_name
         ) AS ok
  FROM required r
)
SELECT 'required_tables' AS check_name,
       count(*) FILTER (WHERE ok) AS found,
       count(*) AS expected
FROM found;

SELECT 'workbench_events' AS check_name,
       to_regclass('workbench.events') IS NOT NULL AS ok;

SELECT 'current_version_view' AS check_name,
       to_regclass('normative.v_current_document_versions') IS NOT NULL AS ok;

SELECT 'workspace_view' AS check_name,
       to_regclass('workbench.v_fragment_workspace') IS NOT NULL AS ok;

SELECT 'time_machine_function' AS check_name,
       to_regprocedure('normative.get_document_version_as_of(uuid,date)') IS NOT NULL AS ok;

SELECT 'seed_tags' AS check_name,
       array_agg(code ORDER BY code) AS codes
FROM workbench.tags
WHERE code IN ('IMPORTANT','REVIEW','ACTION','QUESTION');

SELECT 'existing_document_registry_preserved' AS check_name,
       count(*) AS document_rows
FROM normative.documents;

SELECT 'existing_requirements_preserved' AS check_name,
       count(*) AS requirement_rows
FROM normative.requirements;

SELECT 'version_rows' AS check_name, count(*) FROM normative.document_versions;
SELECT 'fragment_rows' AS check_name, count(*) FROM normative.document_fragments;
SELECT 'change_event_rows' AS check_name, count(*) FROM normative.document_change_events;
SELECT 'fragment_change_rows' AS check_name, count(*) FROM normative.fragment_changes;
SELECT 'annotation_rows' AS check_name, count(*) FROM workbench.annotations;
SELECT 'fragment_link_rows' AS check_name, count(*) FROM workbench.fragment_links;

-- Referential-integrity smoke checks: all should return zero rows.
SELECT 'orphan_versions' AS check_name, count(*) AS bad_rows
FROM normative.document_versions v
LEFT JOIN normative.documents d ON d.id=v.document_id
WHERE d.id IS NULL;

SELECT 'orphan_fragments' AS check_name, count(*) AS bad_rows
FROM normative.document_fragments f
LEFT JOIN normative.document_versions v ON v.id=f.version_id
WHERE v.id IS NULL;

SELECT 'orphan_annotations' AS check_name, count(*) AS bad_rows
FROM workbench.annotations a
LEFT JOIN normative.documents d ON d.id=a.document_id
LEFT JOIN normative.document_fragments f ON f.id=a.fragment_id
WHERE d.id IS NULL OR (a.fragment_id IS NOT NULL AND f.id IS NULL);

SELECT 'orphan_links' AS check_name, count(*) AS bad_rows
FROM workbench.fragment_links l
LEFT JOIN normative.document_fragments src ON src.id=l.from_fragment_id
LEFT JOIN normative.document_fragments dst ON dst.id=l.to_fragment_id
LEFT JOIN normative.documents dd ON dd.id=l.to_document_id
WHERE src.id IS NULL
   OR (l.to_fragment_id IS NOT NULL AND dst.id IS NULL)
   OR (l.to_document_id IS NOT NULL AND dd.id IS NULL);

-- Current-version sanity: there must be no duplicate document_id in the view.
SELECT 'duplicate_current_versions' AS check_name, count(*) AS bad_rows
FROM (
  SELECT document_id
  FROM normative.v_current_document_versions
  GROUP BY document_id
  HAVING count(*) > 1
) q;

-- Show schema footprint for operator review.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('normative','workbench')
ORDER BY table_schema, table_name;
