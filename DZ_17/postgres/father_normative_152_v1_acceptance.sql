-- FATHER / 152-FZ candidate version acceptance
-- READ ONLY. Safe after applying generated 152-fz.import.sql.

\encoding UTF8
\pset pager off

WITH v AS (
  SELECT *
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT 'version_exists' AS check_name, count(*) AS found, 1 AS expected FROM v;

WITH v AS (
  SELECT *
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  'version_state' AS check_name,
  legal_status,
  verification_status,
  source_authority_level,
  effective_from,
  metadata->>'verification_gate' AS verification_gate
FROM v;

WITH v AS (
  SELECT *
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  'version_hashes' AS check_name,
  source_sha256,
  encode(digest(canonical_text, 'sha256'), 'hex') AS canonical_sha256,
  metadata->>'canonical_sha256' AS metadata_canonical_sha256
FROM v;

WITH v AS (
  SELECT id
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  'fragment_counts' AS check_name,
  count(*) FILTER (WHERE fragment_type='document') AS root_fragments,
  count(*) FILTER (WHERE fragment_type='article') AS article_fragments,
  count(*) AS total_fragments
FROM normative.document_fragments f
JOIN v ON v.id=f.version_id;

WITH v AS (
  SELECT id
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  'expected_articles' AS check_name,
  count(*) FILTER (WHERE canonical_key='article.1') = 1 AS has_article_1,
  count(*) FILTER (WHERE canonical_key='article.10.1') = 1 AS has_article_10_1,
  count(*) FILTER (WHERE canonical_key='article.13.1') = 1 AS has_article_13_1,
  count(*) FILTER (WHERE canonical_key='article.18.1') = 1 AS has_article_18_1,
  count(*) FILTER (WHERE canonical_key='article.22.1') = 1 AS has_article_22_1,
  count(*) FILTER (WHERE canonical_key='article.23.1') = 1 AS has_article_23_1,
  count(*) FILTER (WHERE canonical_key='article.25') = 1 AS has_article_25
FROM normative.document_fragments f
JOIN v ON v.id=f.version_id;

WITH v AS (
  SELECT id
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  'fragment_hash_mismatches' AS check_name,
  count(*) AS bad_rows
FROM normative.document_fragments f
JOIN v ON v.id=f.version_id
WHERE f.fragment_type='article'
  AND f.text_sha256 IS DISTINCT FROM encode(digest(f.text_content, 'sha256'), 'hex');

WITH v AS (
  SELECT id
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  'orphan_article_parents' AS check_name,
  count(*) AS bad_rows
FROM normative.document_fragments a
JOIN v ON v.id=a.version_id
LEFT JOIN normative.document_fragments p ON p.id=a.parent_fragment_id
WHERE a.fragment_type='article'
  AND (p.id IS NULL OR p.fragment_type <> 'document' OR p.version_id <> a.version_id);

SELECT
  'import_audit_event' AS check_name,
  count(*) AS found,
  1 AS expected
FROM workbench.events
WHERE event_type='NORMATIVE_VERSION_IMPORTED'
  AND trace_id='FZ152-V1-IMPORT';

-- Important governance gate: candidate must NOT appear in the verified-current view yet.
SELECT
  'not_published_as_verified_current' AS check_name,
  count(*) = 0 AS ok
FROM normative.v_current_document_versions
WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid;
