-- FATHER / 152-FZ encoding recovery probe
-- READ ONLY against persistent schemas. Uses only pg_temp helper function.
-- Goal: determine whether legacy normative.documents.full_text can be recovered
-- by a reversible encoding transform before using any external/local capture.

\encoding UTF8
\pset pager off
\x on

CREATE OR REPLACE FUNCTION pg_temp.try_recode(p_text text, p_encoding text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN convert_from(convert_to(p_text, p_encoding), 'UTF8');
EXCEPTION WHEN OTHERS THEN
  RETURN '[ERROR ' || p_encoding || ': ' || SQLERRM || ']';
END;
$$;

WITH src AS (
  SELECT id, doc_code, title, full_text
  FROM normative.documents
  WHERE id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
)
SELECT
  id,
  doc_code,
  title,
  length(full_text) AS chars,
  octet_length(full_text) AS utf8_bytes,
  encode(digest(coalesce(full_text,''), 'sha256'), 'hex') AS legacy_sha256,
  left(full_text, 260) AS legacy_prefix,
  left(pg_temp.try_recode(full_text, 'WIN1251'), 260) AS win1251_to_utf8,
  left(pg_temp.try_recode(full_text, 'WIN866'), 260) AS win866_to_utf8,
  left(pg_temp.try_recode(full_text, 'LATIN1'), 260) AS latin1_to_utf8
FROM src;

WITH src AS (
  SELECT full_text
  FROM normative.documents
  WHERE id = 'e6adee9c-5e22-47b9-ba33-269b7e67414a'::uuid
), candidates AS (
  SELECT 'legacy' AS candidate, full_text AS txt FROM src
  UNION ALL
  SELECT 'WIN1251->UTF8', pg_temp.try_recode(full_text, 'WIN1251') FROM src
  UNION ALL
  SELECT 'WIN866->UTF8', pg_temp.try_recode(full_text, 'WIN866') FROM src
  UNION ALL
  SELECT 'LATIN1->UTF8', pg_temp.try_recode(full_text, 'LATIN1') FROM src
)
SELECT
  candidate,
  txt IS NOT NULL AS produced,
  position('Федеральный закон' in coalesce(txt,'')) > 0 AS has_expected_header,
  position('О персональных данных' in coalesce(txt,'')) > 0 AS has_expected_title,
  position('Статья 1' in coalesce(txt,'')) > 0 AS has_article_1,
  left(txt, 120) AS prefix
FROM candidates;

\x off
