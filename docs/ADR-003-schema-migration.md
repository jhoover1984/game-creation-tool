# ADR-003: Schema and Migration Policy

Status: Accepted
Last updated: 2026-02-15
Purpose: Record schema versioning and migration policy for project compatibility guarantees.

- `project_schema_version` is required in `project.json`.
- Migrations run in ascending order and are idempotent.
- Dry-run required for CI/preflight.
- Failed migration never overwrites last known-good state.
- Migration reports include changed files and rollback snapshot path.
