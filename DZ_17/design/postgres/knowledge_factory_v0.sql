-- ALINA Knowledge Factory — PostgreSQL P0 projection
-- Status: SELECTED / EVOLVING
-- Purpose: strict identity/provenance/security columns + flexible JSONB payloads.
-- NOTE: this is a design DDL, not yet a production migration.

create extension if not exists pgcrypto;

create table if not exists kf_source (
  source_id text primary key,
  source_type text not null,
  canonical_uri text,
  acquisition_uri text,
  title text,
  language text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'registered',
  created_at timestamptz not null default now()
);

create table if not exists kf_capture (
  capture_id text primary key,
  source_id text not null references kf_source(source_id),
  captured_at timestamptz not null default now(),
  sha256 text not null,
  mime_type text,
  size_bytes bigint,
  storage_ref text,
  parser_status text not null default 'pending',
  security_status text not null default 'SECURITY_UNREVIEWED',
  metadata jsonb not null default '{}'::jsonb,
  unique (source_id, sha256)
);

create index if not exists idx_kf_capture_sha256 on kf_capture(sha256);

create table if not exists kf_structure_node (
  structure_node_id text primary key,
  capture_id text not null references kf_capture(capture_id),
  parent_id text references kf_structure_node(structure_node_id),
  node_type text not null,
  ordinal integer,
  label text,
  page_from integer,
  page_to integer,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_kf_structure_capture_parent on kf_structure_node(capture_id,parent_id,ordinal);

create table if not exists kf_source_span (
  span_id text primary key,
  capture_id text not null references kf_capture(capture_id),
  structure_node_id text references kf_structure_node(structure_node_id),
  page_from integer,
  page_to integer,
  char_from bigint,
  char_to bigint,
  text_hash text,
  text_content text,
  storage_ref text,
  metadata jsonb not null default '{}'::jsonb,
  check (text_content is not null or storage_ref is not null)
);

create index if not exists idx_kf_span_capture_page on kf_source_span(capture_id,page_from,page_to);

create table if not exists kf_knowledge_object (
  object_id text primary key,
  object_type text not null,
  canonical_key text not null,
  version integer not null default 1,
  status text not null default 'draft',
  origin_class text not null,
  security_status text not null default 'SECURITY_UNREVIEWED',
  title text,
  payload jsonb not null default '{}'::jsonb,
  supersedes_id text references kf_knowledge_object(object_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_key, version)
);

create index if not exists idx_kf_object_type_status on kf_knowledge_object(object_type,status);
create index if not exists idx_kf_object_security on kf_knowledge_object(security_status);
create index if not exists idx_kf_object_payload_gin on kf_knowledge_object using gin(payload);

create table if not exists kf_knowledge_edge (
  edge_id text primary key,
  from_object_id text not null references kf_knowledge_object(object_id),
  relation_type text not null,
  to_object_id text not null references kf_knowledge_object(object_id),
  origin_class text not null,
  status text not null default 'candidate',
  confidence numeric(6,5),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (from_object_id <> to_object_id or relation_type in ('related_to','refines'))
);

create index if not exists idx_kf_edge_from on kf_knowledge_edge(from_object_id,relation_type);
create index if not exists idx_kf_edge_to on kf_knowledge_edge(to_object_id,relation_type);

create table if not exists kf_object_source_ref (
  ref_id text primary key,
  object_id text not null references kf_knowledge_object(object_id),
  span_id text not null references kf_source_span(span_id),
  ref_role text not null,
  locator_status text not null default 'verified',
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (object_id, span_id, ref_role)
);

create index if not exists idx_kf_source_ref_object on kf_object_source_ref(object_id,ref_role);

create table if not exists kf_localized_text (
  localized_text_id text primary key,
  object_id text not null references kf_knowledge_object(object_id),
  field_name text not null,
  language text not null,
  text_value text not null,
  source_language text,
  translation_status text not null default 'native_or_pending',
  producer_trace jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (object_id, field_name, language)
);

create table if not exists kf_review_decision (
  review_id text primary key,
  object_id text not null references kf_knowledge_object(object_id),
  decision text not null,
  reviewer_ref text not null,
  reason text,
  artifacts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists kf_security_decision (
  security_decision_id text primary key,
  object_id text references kf_knowledge_object(object_id),
  decision text not null,
  severity text,
  policy_version text,
  findings jsonb not null default '[]'::jsonb,
  reviewer_ref text,
  created_at timestamptz not null default now()
);

create index if not exists idx_kf_security_object on kf_security_decision(object_id,created_at desc);

create table if not exists kf_benchmark_run (
  benchmark_run_id text primary key,
  object_id text references kf_knowledge_object(object_id),
  benchmark_id text not null,
  dataset_ref text,
  metrics jsonb not null default '{}'::jsonb,
  result text,
  status text not null default 'completed',
  run_trace jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists kf_scenario_run (
  scenario_run_id text primary key,
  object_id text references kf_knowledge_object(object_id),
  algorithm_version integer,
  scenario_id text not null,
  scenario_class text,
  input_set jsonb not null default '{}'::jsonb,
  expected_invariants jsonb not null default '[]'::jsonb,
  actual_result jsonb not null default '{}'::jsonb,
  pass boolean,
  failure_classification text,
  security_findings jsonb not null default '[]'::jsonb,
  reproducibility_seed text,
  created_at timestamptz not null default now()
);

create index if not exists idx_kf_scenario_object on kf_scenario_run(object_id,pass);

create table if not exists kf_algorithm_runtime_config (
  runtime_config_id text primary key,
  algorithm_id text not null references kf_knowledge_object(object_id),
  algorithm_version integer not null,
  config_version integer not null,
  config_json jsonb not null,
  config_hash text not null,
  status text not null default 'draft',
  approved_by text,
  security_decision_id text references kf_security_decision(security_decision_id),
  valid_from timestamptz,
  created_at timestamptz not null default now(),
  unique (algorithm_id, algorithm_version, config_version)
);

-- Optional derived synthesis. The underlying Evidence objects/edges remain canonical.
create table if not exists kf_evidence_synthesis (
  synthesis_id text primary key,
  claim_id text not null references kf_knowledge_object(object_id),
  synthesis_version integer not null,
  summary jsonb not null,
  top_support_refs jsonb not null default '[]'::jsonb,
  top_counter_refs jsonb not null default '[]'::jsonb,
  top_limit_refs jsonb not null default '[]'::jsonb,
  generated_by jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (claim_id, synthesis_version)
);

-- A production query must filter out objects on security hold/reject.
create or replace view kf_deliverable_knowledge as
select *
from kf_knowledge_object
where status in ('verified','approved','production')
  and security_status not in ('SECURITY_HOLD','SECURITY_REJECTED');

-- DESIGN NOTE:
-- Runtime RAG should SELECT through views/services. It should never have UPDATE/DELETE
-- grants on kf_algorithm_runtime_config or verified knowledge tables.
