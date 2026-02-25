# V2 Schema Versioning

## Purpose
Define how schema and project format changes are versioned and migrated without breaking existing projects.

## Version Fields
1. Contract package version follows semver.
2. Persisted top-level project/map assets include explicit `schemaVersion`.
3. `schemaVersion` is the compatibility contract for persisted files.

## Change Categories
1. Additive change:
   - New optional field
   - New optional object
   - New enum value with backward-safe handling
2. Breaking change:
   - Field rename/removal
   - Required field added without migration path
   - Enum value removal/semantic redefinition
   - Payload shape change

## Required Actions by Change Type
### Additive
1. Bump minor version.
2. Update schema + TS types + Rust structs.
3. Add/adjust fixture coverage.
4. Document behavior in compatibility policy and PR.

### Breaking
1. Bump major version.
2. Add migration path (loader migration or explicit tool).
3. Add migration fixtures (old -> new).
4. Update roadmap/capability docs if user-visible behavior changes.

## Deprecation Policy
1. Mark deprecated fields for at least one milestone before removal.
2. During deprecation window:
   - accept old field via migration/alias,
   - emit warning in validation/migration report.
3. Removal must include migration note and fixture updates.

## Migration Requirements
1. Migrations are deterministic and idempotent.
2. Migration output must be canonicalized before hashing/comparison.
3. Migration test matrix must include:
   - current -> current no-op,
   - previous -> current,
   - malformed legacy fails with actionable error.

## Source-of-Truth
1. Schema files define persisted structure.
2. TS and Rust implementations must conform to schema.
3. Drift is blocked by fixture parity tests:
   - `docs/contracts/PARITY_FIXTURE_MATRIX.md`
