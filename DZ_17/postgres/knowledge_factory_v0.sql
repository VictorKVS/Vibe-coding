-- ALINA / FATHER Knowledge Factory PostgreSQL baseline
-- Version: 0.1
-- Origin: PROJECT_DECISION
--
-- IMPORTANT
-- 1. This migration is intentionally non-destructive: it creates isolated schemas
--    kf, audit and git_export and does not rename/drop existing user tables.
-- 2. Existing production data must be inventoried before any import/cutover.
-- 3. Secrets and local paths are never exported through git_export views.
-- 4. Git receives only explicitly PUBLIC + git_export_allowed records.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pgvector must be installed on the PostgreSQL server. This statement is safe
-- when the extension already exists; it may require a database administrator.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS kf;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS git_export;

CREATE OR REPLACE FUNCTION kf.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'append-only relation: UPDATE/DELETE is prohibited';
END;
$$;

CREATE TABLE IF NOT EXISTS kf.source (
  source_id text PRIMARY KEY,
  source_type text NOT NULL,
  full_title text NOT NULL,
  issuer text,
  document_number text,
  document_date date,
  canonical_uri text,
  acquisition_uri text,
  language text,
  legal_status text NOT NULL DEFAULT 'not_applicable',
  status text NOT NULL DEFAULT 'registered',
  security_status text NOT NULL DEFAULT 'SECURITY_UNREVIEWED',
  classification text NOT NULL DEFAULT 'internal'
    CHECK (classification IN ('public','internal','restricted','secret')),
  git_export_allowed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kf.capture (
  capture_id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES kf.source(source_id) ON DELETE RESTRICT,
  sha256 text NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-fA-F]{64}$'),
  mime_type text,
  size_bytes bigint,
  -- storage_ref may contain a private/local path and is NEVER in git_export.
  storage_ref text,
  parser_status text,
  security_status text NOT NULL DEFAULT 'SECURITY_UNREVIEWED',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS capture_source_idx ON kf.capture(source_id);

CREATE TABLE IF NOT EXISTS kf.structure_node (
  structure_node_id text PRIMARY KEY,
  capture_id text NOT NULL REFERENCES kf.capture(capture_id) ON DELETE CASCADE,
  parent_id text REFERENCES kf.structure_node(structure_node_id) ON DELETE RESTRICT,
  node_type text NOT NULL,
  ordinal integer NOT NULL DEFAULT 0,
  label text,
  page_from integer,
  page_to integer,
  status text NOT NULL DEFAULT 'proposed',
  origin_class text NOT NULL DEFAULT 'INFERENCE',
  confidence numeric(6,5),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS structure_capture_idx ON kf.structure_node(capture_id, ordinal);

CREATE TABLE IF NOT EXISTS kf.source_span (
  span_id text PRIMARY KEY,
  capture_id text NOT NULL REFERENCES kf.capture(capture_id) ON DELETE CASCADE,
  structure_node_id text REFERENCES kf.structure_node(structure_node_id) ON DELETE SET NULL,
  page_from integer,
  page_to integer,
  char_from integer,
  char_to integer,
  text_hash text,
  text_content text,
  classification text NOT NULL DEFAULT 'internal'
    CHECK (classification IN ('public','internal','restricted','secret')),
  git_export_allowed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS span_capture_idx ON kf.source_span(capture_id, page_from);

CREATE TABLE IF NOT EXISTS kf.knowledge_object (
  object_id text PRIMARY KEY,
  object_type text NOT NULL,
  canonical_key text UNIQUE,
  title text,
  status text NOT NULL DEFAULT 'candidate',
  review_status text NOT NULL DEFAULT 'pending',
  security_status text NOT NULL DEFAULT 'SECURITY_UNREVIEWED',
  origin_class text NOT NULL,
  classification text NOT NULL DEFAULT 'internal'
    CHECK (classification IN ('public','internal','restricted','secret')),
  git_export_allowed boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  supersedes_id text REFERENCES kf.knowledge_object(object_id) ON DELETE RESTRICT,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_type_status_idx ON kf.knowledge_object(object_type, status, review_status);
CREATE INDEX IF NOT EXISTS knowledge_payload_gin ON kf.knowledge_object USING gin(payload);

CREATE TABLE IF NOT EXISTS kf.object_source_link (
  object_id text NOT NULL REFERENCES kf.knowledge_object(object_id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES kf.source(source_id) ON DELETE RESTRICT,
  span_id text REFERENCES kf.source_span(span_id) ON DELETE RESTRICT,
  relation_type text NOT NULL DEFAULT 'derived_from',
  locator jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (object_id, source_id, relation_type, span_id)
);
CREATE INDEX IF NOT EXISTS object_source_source_idx ON kf.object_source_link(source_id, object_id);

CREATE TABLE IF NOT EXISTS kf.knowledge_relation (
  relation_id text PRIMARY KEY,
  from_object_id text NOT NULL REFERENCES kf.knowledge_object(object_id) ON DELETE CASCADE,
  to_object_id text NOT NULL REFERENCES kf.knowledge_object(object_id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  status text NOT NULL DEFAULT 'candidate',
  origin_class text NOT NULL,
  classification text NOT NULL DEFAULT 'internal'
    CHECK (classification IN ('public','internal','restricted','secret')),
  git_export_allowed boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS relation_from_idx ON kf.knowledge_relation(from_object_id, relation_type);
CREATE INDEX IF NOT EXISTS relation_to_idx ON kf.knowledge_relation(to_object_id, relation_type);

-- Graph projection. The graph is a projection of canonical knowledge, not a second
-- independent truth store. object_id may be NULL for technical/runtime nodes.
CREATE TABLE IF NOT EXISTS kf.graph_node (
  node_id text PRIMARY KEY,
  object_id text REFERENCES kf.knowledge_object(object_id) ON DELETE SET NULL,
  node_type text NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'candidate',
  classification text NOT NULL DEFAULT 'internal'
    CHECK (classification IN ('public','internal','restricted','secret')),
  git_export_allowed boolean NOT NULL DEFAULT false,
  attrs jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graph_node_object_idx ON kf.graph_node(object_id);

CREATE TABLE IF NOT EXISTS kf.graph_edge (
  edge_id text PRIMARY KEY,
  from_node_id text NOT NULL REFERENCES kf.graph_node(node_id) ON DELETE CASCADE,
  to_node_id text NOT NULL REFERENCES kf.graph_node(node_id) ON DELETE CASCADE,
  edge_type text NOT NULL,
  status text NOT NULL DEFAULT 'candidate',
  classification text NOT NULL DEFAULT 'internal'
    CHECK (classification IN ('public','internal','restricted','secret')),
  git_export_allowed boolean NOT NULL DEFAULT false,
  attrs jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS graph_edge_from_idx ON kf.graph_edge(from_node_id, edge_type);
CREATE INDEX IF NOT EXISTS graph_edge_to_idx ON kf.graph_edge(to_node_id, edge_type);

-- Weights are append-only/versioned. Never overwrite an old weight: insert a new
-- version with method/factors/source_refs and supersedes_version.
CREATE TABLE IF NOT EXISTS kf.node_weight_version (
  node_id text NOT NULL REFERENCES kf.graph_node(node_id) ON DELETE CASCADE,
  weight_version integer NOT NULL CHECK (weight_version >= 1),
  weight numeric(18,9) NOT NULL,
  method_id text,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'experimental',
  supersedes_version integer,
  created_by text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, weight_version)
);

CREATE TABLE IF NOT EXISTS kf.edge_weight_version (
  edge_id text NOT NULL REFERENCES kf.graph_edge(edge_id) ON DELETE CASCADE,
  weight_version integer NOT NULL CHECK (weight_version >= 1),
  weight numeric(18,9) NOT NULL,
  method_id text,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'experimental',
  supersedes_version integer,
  created_by text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (edge_id, weight_version)
);

CREATE TABLE IF NOT EXISTS kf.embedding (
  embedding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id text REFERENCES kf.knowledge_object(object_id) ON DELETE CASCADE,
  span_id text REFERENCES kf.source_span(span_id) ON DELETE CASCADE,
  model_id text NOT NULL,
  dimension integer NOT NULL,
  embedding vector,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((object_id IS NOT NULL) <> (span_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS embedding_object_idx ON kf.embedding(object_id);
CREATE INDEX IF NOT EXISTS embedding_span_idx ON kf.embedding(span_id);

CREATE TABLE IF NOT EXISTS kf.review_decision (
  review_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type text NOT NULL,
  object_id text NOT NULL,
  decision text NOT NULL,
  reviewer text NOT NULL,
  reason text NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_object_idx ON kf.review_decision(object_type, object_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit.event (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  actor_role text,
  action text NOT NULL,
  object_type text,
  object_id text,
  reason text NOT NULL,
  trace_id text,
  before_hash text,
  after_hash text,
  git_commit_sha text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS audit_event_object_idx ON audit.event(object_type, object_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_event_trace_idx ON audit.event(trace_id, at DESC);

CREATE TABLE IF NOT EXISTS audit.snapshot_manifest (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  reason text NOT NULL,
  schema_hash text,
  object_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  export_hashes jsonb NOT NULL DEFAULT '{}'::jsonb,
  local_backup_hash text,
  git_commit_sha text,
  status text NOT NULL DEFAULT 'created',
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

DROP TRIGGER IF EXISTS audit_event_no_update ON audit.event;
CREATE TRIGGER audit_event_no_update
BEFORE UPDATE OR DELETE ON audit.event
FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

DROP TRIGGER IF EXISTS node_weight_no_update ON kf.node_weight_version;
CREATE TRIGGER node_weight_no_update
BEFORE UPDATE OR DELETE ON kf.node_weight_version
FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

DROP TRIGGER IF EXISTS edge_weight_no_update ON kf.edge_weight_version;
CREATE TRIGGER edge_weight_no_update
BEFORE UPDATE OR DELETE ON kf.edge_weight_version
FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

DROP TRIGGER IF EXISTS source_touch ON kf.source;
CREATE TRIGGER source_touch BEFORE UPDATE ON kf.source
FOR EACH ROW EXECUTE FUNCTION kf.touch_updated_at();
DROP TRIGGER IF EXISTS knowledge_touch ON kf.knowledge_object;
CREATE TRIGGER knowledge_touch BEFORE UPDATE ON kf.knowledge_object
FOR EACH ROW EXECUTE FUNCTION kf.touch_updated_at();
DROP TRIGGER IF EXISTS relation_touch ON kf.knowledge_relation;
CREATE TRIGGER relation_touch BEFORE UPDATE ON kf.knowledge_relation
FOR EACH ROW EXECUTE FUNCTION kf.touch_updated_at();
DROP TRIGGER IF EXISTS graph_node_touch ON kf.graph_node;
CREATE TRIGGER graph_node_touch BEFORE UPDATE ON kf.graph_node
FOR EACH ROW EXECUTE FUNCTION kf.touch_updated_at();
DROP TRIGGER IF EXISTS graph_edge_touch ON kf.graph_edge;
CREATE TRIGGER graph_edge_touch BEFORE UPDATE ON kf.graph_edge
FOR EACH ROW EXECUTE FUNCTION kf.touch_updated_at();

-- Current weight projections are read-only views selected from append-only history.
CREATE OR REPLACE VIEW kf.current_node_weight AS
SELECT DISTINCT ON (node_id)
  node_id, weight_version, weight, method_id, factors, source_refs, status,
  supersedes_version, created_by, reason, created_at
FROM kf.node_weight_version
ORDER BY node_id, weight_version DESC;

CREATE OR REPLACE VIEW kf.current_edge_weight AS
SELECT DISTINCT ON (edge_id)
  edge_id, weight_version, weight, method_id, factors, source_refs, status,
  supersedes_version, created_by, reason, created_at
FROM kf.edge_weight_version
ORDER BY edge_id, weight_version DESC;

-- Git-safe projections. These intentionally omit local paths, raw source text,
-- secrets, embeddings and any non-public/non-approved-to-export object.
CREATE OR REPLACE VIEW git_export.sources AS
SELECT
  source_id, source_type, full_title, issuer, document_number, document_date,
  canonical_uri, language, legal_status, status, security_status, metadata,
  created_at, updated_at
FROM kf.source
WHERE classification='public' AND git_export_allowed=true;

CREATE OR REPLACE VIEW git_export.knowledge_objects AS
SELECT
  object_id, object_type, canonical_key, title, status, review_status,
  security_status, origin_class, payload, version, supersedes_id,
  created_by, created_at, updated_at
FROM kf.knowledge_object
WHERE classification='public' AND git_export_allowed=true;

CREATE OR REPLACE VIEW git_export.knowledge_relations AS
SELECT
  relation_id, from_object_id, to_object_id, relation_type, status,
  origin_class, payload, version, created_at, updated_at
FROM kf.knowledge_relation
WHERE classification='public' AND git_export_allowed=true;

CREATE OR REPLACE VIEW git_export.graph_nodes AS
SELECT node_id, object_id, node_type, label, status, attrs, version, created_at, updated_at
FROM kf.graph_node
WHERE classification='public' AND git_export_allowed=true;

CREATE OR REPLACE VIEW git_export.graph_edges AS
SELECT edge_id, from_node_id, to_node_id, edge_type, status, attrs, version, created_at, updated_at
FROM kf.graph_edge
WHERE classification='public' AND git_export_allowed=true;

CREATE OR REPLACE VIEW git_export.node_weights AS
SELECT w.node_id, w.weight_version, w.weight, w.method_id, w.factors,
       w.source_refs, w.status, w.supersedes_version, w.created_by,
       w.reason, w.created_at
FROM kf.current_node_weight w
JOIN kf.graph_node n ON n.node_id=w.node_id
WHERE n.classification='public' AND n.git_export_allowed=true;

CREATE OR REPLACE VIEW git_export.edge_weights AS
SELECT w.edge_id, w.weight_version, w.weight, w.method_id, w.factors,
       w.source_refs, w.status, w.supersedes_version, w.created_by,
       w.reason, w.created_at
FROM kf.current_edge_weight w
JOIN kf.graph_edge e ON e.edge_id=w.edge_id
WHERE e.classification='public' AND e.git_export_allowed=true;

CREATE OR REPLACE VIEW git_export.reviews AS
SELECT review_id, object_type, object_id, decision, reviewer, reason,
       evidence_refs, created_at
FROM kf.review_decision;

COMMIT;
