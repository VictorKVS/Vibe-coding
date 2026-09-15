-- FATHER Normative Workbench data model
-- Version: 1.0
-- Target: existing osint_kb database
-- Strategy: ADDITIVE ONLY. Reuse normative.documents as the canonical document registry.
--
-- IMPORTANT SAFETY RULES
-- 1. Run only after backup + db:inventory + review of inventory-osint_kb.
-- 2. This migration does not DROP, RENAME, TRUNCATE or rewrite existing tables.
-- 3. It does NOT create a second document registry.
-- 4. Full legal text remains versioned; older versions are never overwritten.
-- 5. User notes/links live in workbench schema and do not alter canonical legal text.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS workbench;

DO $$
BEGIN
  IF to_regclass('normative.documents') IS NULL THEN
    RAISE EXCEPTION 'Required canonical table normative.documents does not exist. Abort.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION workbench.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION workbench.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'append-only relation: UPDATE/DELETE is prohibited';
END;
$$;

-- One document -> many immutable legal/technical versions.
CREATE TABLE IF NOT EXISTS normative.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES normative.documents(id) ON DELETE CASCADE,
  version_no integer NOT NULL CHECK (version_no >= 1),
  edition_label text,
  legal_status varchar(32) NOT NULL DEFAULT 'UNKNOWN_NEEDS_VERIFICATION'
    CHECK (legal_status IN (
      'DRAFT','ADOPTED_NOT_EFFECTIVE','EFFECTIVE','PARTIALLY_EFFECTIVE',
      'AMENDED','SUSPENDED','REPEALED','SUPERSEDED','EXPIRED',
      'UNKNOWN_NEEDS_VERIFICATION'
    )),
  verification_status varchar(24) NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED','VERIFIED','STALE','REJECTED')),
  source_authority_level varchar(16),
  source_url text,
  source_capture_ref text,
  source_sha256 char(64) CHECK (source_sha256 IS NULL OR source_sha256 ~ '^[0-9a-fA-F]{64}$'),
  canonical_text text NOT NULL DEFAULT '',
  published_at date,
  adopted_at date,
  effective_from date,
  effective_to date,
  repealed_at date,
  verified_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (document_id, version_no),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from),
  CHECK (retired_at IS NULL OR retired_at >= recorded_at)
);

CREATE INDEX IF NOT EXISTS document_versions_document_idx
  ON normative.document_versions(document_id, version_no DESC);
CREATE INDEX IF NOT EXISTS document_versions_effective_idx
  ON normative.document_versions(document_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS document_versions_verified_idx
  ON normative.document_versions(verification_status, verified_at DESC);

-- Structural fragments used by the central full-text reader and exact links.
CREATE TABLE IF NOT EXISTS normative.document_fragments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES normative.document_versions(id) ON DELETE CASCADE,
  parent_fragment_id uuid REFERENCES normative.document_fragments(id) ON DELETE RESTRICT,
  fragment_type varchar(24) NOT NULL
    CHECK (fragment_type IN (
      'document','chapter','section','article','part','clause','subclause',
      'paragraph','item','definition','annex','table','other'
    )),
  ordinal integer NOT NULL DEFAULT 0,
  canonical_key text NOT NULL,
  locator text,
  heading text,
  text_content text NOT NULL DEFAULT '',
  text_sha256 char(64) CHECK (text_sha256 IS NULL OR text_sha256 ~ '^[0-9a-fA-F]{64}$'),
  char_from integer,
  char_to integer,
  page_from integer,
  page_to integer,
  source_section text,
  source_clause text,
  is_atomic boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (version_id, canonical_key),
  CHECK (char_to IS NULL OR char_from IS NULL OR char_to >= char_from),
  CHECK (page_to IS NULL OR page_from IS NULL OR page_to >= page_from)
);

CREATE INDEX IF NOT EXISTS document_fragments_version_idx
  ON normative.document_fragments(version_id, ordinal);
CREATE INDEX IF NOT EXISTS document_fragments_parent_idx
  ON normative.document_fragments(parent_fragment_id, ordinal);
CREATE INDEX IF NOT EXISTS document_fragments_locator_idx
  ON normative.document_fragments(version_id, locator);

-- Document-level legal change event.
CREATE TABLE IF NOT EXISTS normative.document_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES normative.documents(id) ON DELETE CASCADE,
  from_version_id uuid REFERENCES normative.document_versions(id) ON DELETE RESTRICT,
  to_version_id uuid REFERENCES normative.document_versions(id) ON DELETE RESTRICT,
  amending_document_id uuid REFERENCES normative.documents(id) ON DELETE RESTRICT,
  change_type varchar(32) NOT NULL
    CHECK (change_type IN (
      'AMENDMENT','NEW_VERSION','REPEAL','SUSPENSION',
      'EFFECTIVE_DATE_CHANGE','TECHNICAL_CORRECTION'
    )),
  status varchar(20) NOT NULL DEFAULT 'CANDIDATE'
    CHECK (status IN ('CANDIDATE','VERIFIED','REJECTED')),
  impact_status varchar(24) NOT NULL DEFAULT 'NOT_ASSESSED'
    CHECK (impact_status IN ('NOT_ASSESSED','REVIEW_REQUIRED','ASSESSED')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  effective_from date,
  source_url text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (from_version_id IS NOT NULL OR to_version_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS document_change_events_document_idx
  ON normative.document_change_events(document_id, effective_from DESC, detected_at DESC);
CREATE INDEX IF NOT EXISTS document_change_events_status_idx
  ON normative.document_change_events(status, impact_status, detected_at DESC);

-- Exact "was -> became" mapping for inline footnotes in the full text.
CREATE TABLE IF NOT EXISTS normative.fragment_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_event_id uuid NOT NULL REFERENCES normative.document_change_events(id) ON DELETE CASCADE,
  old_fragment_id uuid REFERENCES normative.document_fragments(id) ON DELETE RESTRICT,
  new_fragment_id uuid REFERENCES normative.document_fragments(id) ON DELETE RESTRICT,
  change_kind varchar(20) NOT NULL
    CHECK (change_kind IN ('ADDED','CHANGED','REPEALED','MOVED','RENUMBERED')),
  summary text,
  impact_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (old_fragment_id IS NOT NULL OR new_fragment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS fragment_changes_event_idx
  ON normative.fragment_changes(change_event_id);
CREATE INDEX IF NOT EXISTS fragment_changes_old_idx
  ON normative.fragment_changes(old_fragment_id);
CREATE INDEX IF NOT EXISTS fragment_changes_new_idx
  ON normative.fragment_changes(new_fragment_id);

-- User working layer. It never changes the canonical legal text.
CREATE TABLE IF NOT EXISTS workbench.annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES normative.documents(id) ON DELETE CASCADE,
  version_id uuid REFERENCES normative.document_versions(id) ON DELETE CASCADE,
  fragment_id uuid REFERENCES normative.document_fragments(id) ON DELETE CASCADE,
  annotation_type varchar(20) NOT NULL DEFAULT 'NOTE'
    CHECK (annotation_type IN ('NOTE','QUESTION','WARNING','DECISION','TASK_HINT')),
  visibility varchar(16) NOT NULL DEFAULT 'PRIVATE'
    CHECK (visibility IN ('PRIVATE','TEAM','ORGANIZATION','KB_CANDIDATE')),
  content text NOT NULL,
  author_ref text NOT NULL,
  author_role text,
  status varchar(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','RESOLVED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS annotations_fragment_idx
  ON workbench.annotations(fragment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS annotations_document_idx
  ON workbench.annotations(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS annotations_visibility_idx
  ON workbench.annotations(visibility, status, created_at DESC);

CREATE TABLE IF NOT EXISTS workbench.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO workbench.tags(code, label, description)
VALUES
  ('IMPORTANT','Важно','Требует повышенного внимания'),
  ('REVIEW','Проверить','Нужна дополнительная проверка'),
  ('ACTION','Выполнить','Необходимо действие'),
  ('QUESTION','Вопрос','Нужен ответ или уточнение')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS workbench.annotation_tags (
  annotation_id uuid NOT NULL REFERENCES workbench.annotations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES workbench.tags(id) ON DELETE RESTRICT,
  PRIMARY KEY (annotation_id, tag_id)
);

-- Safe typed links between a fragment and another document or exact fragment.
CREATE TABLE IF NOT EXISTS workbench.fragment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_fragment_id uuid NOT NULL REFERENCES normative.document_fragments(id) ON DELETE CASCADE,
  to_document_id uuid REFERENCES normative.documents(id) ON DELETE CASCADE,
  to_fragment_id uuid REFERENCES normative.document_fragments(id) ON DELETE CASCADE,
  relation_type varchar(24) NOT NULL
    CHECK (relation_type IN (
      'RELATED_TO','CLARIFIES','IMPLEMENTS','BASED_ON','CONTRADICTS',
      'EVIDENCES','APPLIES_TO','REQUIRES','SUPERSEDES'
    )),
  reason text,
  status varchar(16) NOT NULL DEFAULT 'PROPOSED'
    CHECK (status IN ('PROPOSED','APPROVED','REJECTED')),
  created_by text NOT NULL,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK ((to_document_id IS NOT NULL)::int + (to_fragment_id IS NOT NULL)::int = 1),
  CHECK (to_fragment_id IS NULL OR to_fragment_id <> from_fragment_id)
);

CREATE INDEX IF NOT EXISTS fragment_links_from_idx
  ON workbench.fragment_links(from_fragment_id, relation_type, status);
CREATE INDEX IF NOT EXISTS fragment_links_to_document_idx
  ON workbench.fragment_links(to_document_id, relation_type, status);
CREATE INDEX IF NOT EXISTS fragment_links_to_fragment_idx
  ON workbench.fragment_links(to_fragment_id, relation_type, status);

-- Append-only user/action audit for workbench interactions.
CREATE TABLE IF NOT EXISTS workbench.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_ref text NOT NULL,
  actor_role text,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  reason text,
  trace_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workbench_events_entity_idx
  ON workbench.events(entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS workbench_events_trace_idx
  ON workbench.events(trace_id, occurred_at DESC);

DROP TRIGGER IF EXISTS workbench_events_no_mutation ON workbench.events;
CREATE TRIGGER workbench_events_no_mutation
BEFORE UPDATE OR DELETE ON workbench.events
FOR EACH ROW EXECUTE FUNCTION workbench.reject_mutation();

DROP TRIGGER IF EXISTS annotations_touch ON workbench.annotations;
CREATE TRIGGER annotations_touch
BEFORE UPDATE ON workbench.annotations
FOR EACH ROW EXECUTE FUNCTION workbench.touch_updated_at();

-- Current verified legal version used by default document reader.
CREATE OR REPLACE VIEW normative.v_current_document_versions AS
SELECT DISTINCT ON (document_id)
  id, document_id, version_no, edition_label, legal_status, verification_status,
  source_authority_level, source_url, source_capture_ref, source_sha256,
  canonical_text, published_at, adopted_at, effective_from, effective_to,
  repealed_at, verified_at, recorded_at, retired_at, metadata
FROM normative.document_versions
WHERE verification_status = 'VERIFIED'
  AND effective_from IS NOT NULL
  AND effective_from <= CURRENT_DATE
  AND (effective_to IS NULL OR effective_to > CURRENT_DATE)
  AND legal_status IN ('EFFECTIVE','PARTIALLY_EFFECTIVE','AMENDED','SUSPENDED')
ORDER BY document_id, effective_from DESC, version_no DESC;

-- "What was valid on date X?" for the time-machine UI.
CREATE OR REPLACE FUNCTION normative.get_document_version_as_of(
  p_document_id uuid,
  p_as_of date
)
RETURNS SETOF normative.document_versions
LANGUAGE sql
STABLE
AS $$
  SELECT v.*
  FROM normative.document_versions v
  WHERE v.document_id = p_document_id
    AND v.verification_status = 'VERIFIED'
    AND (v.effective_from IS NULL OR v.effective_from <= p_as_of)
    AND (v.effective_to IS NULL OR v.effective_to > p_as_of)
    AND (v.repealed_at IS NULL OR v.repealed_at > p_as_of)
  ORDER BY v.effective_from DESC NULLS LAST, v.version_no DESC
  LIMIT 1;
$$;

-- Convenience projection for the right-side work panel.
CREATE OR REPLACE VIEW workbench.v_fragment_workspace AS
SELECT
  f.id AS fragment_id,
  f.version_id,
  v.document_id,
  f.parent_fragment_id,
  f.fragment_type,
  f.ordinal,
  f.canonical_key,
  f.locator,
  f.heading,
  f.text_content,
  f.text_sha256,
  v.version_no,
  v.effective_from,
  v.effective_to,
  v.verification_status,
  (SELECT count(*) FROM workbench.annotations a WHERE a.fragment_id=f.id AND a.status='ACTIVE') AS annotation_count,
  (SELECT count(*) FROM workbench.fragment_links l WHERE l.from_fragment_id=f.id AND l.status <> 'REJECTED') AS link_count
FROM normative.document_fragments f
JOIN normative.document_versions v ON v.id=f.version_id;

COMMIT;
