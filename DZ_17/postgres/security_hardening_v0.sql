-- ALINA / FATHER PostgreSQL security hardening baseline
-- Apply AFTER knowledge_factory_v0.sql using a database owner/admin role.
-- No passwords/login credentials are created here. Bind real LOGIN users to these
-- NOLOGIN group roles outside Git through your secret-management/admin process.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='alina_app_rw') THEN
    CREATE ROLE alina_app_rw NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='alina_analyst_ro') THEN
    CREATE ROLE alina_analyst_ro NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='alina_security_review') THEN
    CREATE ROLE alina_security_review NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='alina_backup_ro') THEN
    CREATE ROLE alina_backup_ro NOLOGIN;
  END IF;
END
$$;

REVOKE ALL ON SCHEMA kf FROM PUBLIC;
REVOKE ALL ON SCHEMA audit FROM PUBLIC;
REVOKE ALL ON SCHEMA git_export FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA kf FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA audit FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA git_export FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA kf FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA audit FROM PUBLIC;

-- Application runtime: operational writes to canonical working schemas, but no
-- direct UPDATE/DELETE bypass of append-only triggers.
GRANT USAGE ON SCHEMA kf TO alina_app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kf TO alina_app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA kf TO alina_app_rw;
GRANT SELECT, INSERT ON audit.event, audit.snapshot_manifest TO alina_app_rw;
GRANT USAGE ON SCHEMA audit TO alina_app_rw;

-- Analyst: read canonical knowledge and audit evidence, no mutations.
GRANT USAGE ON SCHEMA kf, audit TO alina_analyst_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA kf TO alina_analyst_ro;
GRANT SELECT ON audit.event, audit.snapshot_manifest TO alina_analyst_ro;

-- Security reviewer: read everything needed for review. Security decisions should
-- be written via controlled API/stored procedures rather than unrestricted table
-- writes. P0 therefore remains read-only at SQL table level.
GRANT USAGE ON SCHEMA kf, audit TO alina_security_review;
GRANT SELECT ON ALL TABLES IN SCHEMA kf TO alina_security_review;
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO alina_security_review;

-- Git snapshot/backup role gets ONLY sanitized git_export views + snapshot
-- metadata. It cannot read raw source text, storage_ref, embeddings, secrets or
-- internal/restricted/secret objects.
GRANT USAGE ON SCHEMA git_export, audit TO alina_backup_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA git_export TO alina_backup_ro;
GRANT SELECT, INSERT, UPDATE ON audit.snapshot_manifest TO alina_backup_ro;

-- Default privileges for future tables created by the current owner.
ALTER DEFAULT PRIVILEGES IN SCHEMA kf REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA git_export REVOKE ALL ON TABLES FROM PUBLIC;

-- Application objects should never inherit CREATE on public schema from PUBLIC.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

COMMIT;

-- Operational notes (not executable secrets):
-- 1. Create LOGIN roles/users outside Git and GRANT exactly one or more group roles.
-- 2. Require TLS for remote PostgreSQL connections in pg_hba.conf/server config.
-- 3. Keep DATABASE_URL/POSTGRES_URL/AUDIT_DATABASE_URL only in .env.local or a
--    secret manager; never in Git, logs or snapshot manifests.
-- 4. Use a separate backup LOGIN mapped only to alina_backup_ro for Git-safe export.
-- 5. Full pg_dump backups are NOT Git-safe; keep them encrypted/protected outside
--    the public repository. Git stores sanitized projections, migrations and hashes.
