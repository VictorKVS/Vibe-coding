-- FATHER / 152-FZ registry probe
-- READ ONLY. Does not modify osint_kb.
-- Goal: inspect the existing canonical normative.documents rows without
-- assuming column names, then identify the exact 152-FZ record safely.
--
-- Force UTF-8 for query results. Some existing document rows contain U+FEFF
-- (BOM / zero-width no-break space), which cannot be represented in WIN1251.

\encoding UTF8
\pset pager off
\x on

SELECT 'client_encoding' AS check_name, current_setting('client_encoding') AS value;

SELECT 'documents_total' AS check_name, count(*) AS rows
FROM normative.documents;

-- Full row shape as JSONB, so this script remains compatible with the
-- already-existing normative.documents schema.
SELECT to_jsonb(d) AS document_row
FROM normative.documents d
ORDER BY d.id;

-- Candidate search without assuming title/number column names.
-- We search the serialized row text only for discovery; no canonical identity
-- is assigned from this heuristic alone.
SELECT to_jsonb(d) AS candidate_152fz
FROM normative.documents d
WHERE to_jsonb(d)::text ILIKE ANY (ARRAY[
  '%152-ФЗ%',
  '%152 ФЗ%',
  '%персональн%данн%'
])
ORDER BY d.id;

\x off
