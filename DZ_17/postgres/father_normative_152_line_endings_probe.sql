-- FATHER / 152-FZ line-ending diagnostic
-- READ ONLY. Proves whether the imported hash mismatch is only CRLF -> LF conversion.

\encoding UTF8
\pset pager off

WITH v AS (
  SELECT *
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  'canonical_line_endings' AS check_name,
  encode(digest(canonical_text, 'sha256'), 'hex') AS raw_sha256,
  encode(digest(replace(canonical_text, E'\r\n', E'\n'), 'sha256'), 'hex') AS lf_normalized_sha256,
  metadata->>'canonical_sha256' AS expected_sha256,
  encode(digest(replace(canonical_text, E'\r\n', E'\n'), 'sha256'), 'hex') = metadata->>'canonical_sha256' AS normalized_matches_expected,
  length(canonical_text) - length(replace(canonical_text, E'\r', '')) AS cr_count
FROM v;

WITH v AS (
  SELECT id
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  'article_line_endings' AS check_name,
  count(*) AS articles,
  count(*) FILTER (
    WHERE encode(digest(text_content, 'sha256'), 'hex') IS DISTINCT FROM text_sha256
  ) AS raw_mismatches,
  count(*) FILTER (
    WHERE encode(digest(replace(text_content, E'\r\n', E'\n'), 'sha256'), 'hex') IS DISTINCT FROM text_sha256
  ) AS normalized_mismatches,
  sum(length(text_content) - length(replace(text_content, E'\r', ''))) AS total_cr_count
FROM normative.document_fragments f
JOIN v ON v.id = f.version_id
WHERE f.fragment_type = 'article';

WITH v AS (
  SELECT id
  FROM normative.document_versions
  WHERE document_id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
    AND version_no = 1
)
SELECT
  canonical_key,
  encode(digest(text_content, 'sha256'), 'hex') AS raw_sha256,
  encode(digest(replace(text_content, E'\r\n', E'\n'), 'sha256'), 'hex') AS normalized_sha256,
  text_sha256 AS expected_sha256,
  encode(digest(replace(text_content, E'\r\n', E'\n'), 'sha256'), 'hex') = text_sha256 AS normalized_ok
FROM normative.document_fragments f
JOIN v ON v.id = f.version_id
WHERE f.fragment_type='article'
ORDER BY f.ordinal;
