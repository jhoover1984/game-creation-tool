# V2 Compatibility Policy

## Purpose
Define how contracts evolve without breaking projects, fixtures, and adapters.

## Companion Standards
- `docs/contracts/SCHEMA_GUIDELINES.md`
- `docs/contracts/SCHEMA_VERSIONING.md`
- `docs/contracts/SEMANTIC_VALIDATION_RULES.md`
- `docs/contracts/CANONICAL_SERIALIZATION.md`
- `docs/contracts/PARITY_FIXTURE_MATRIX.md`

## Versioning
1. Contract package uses semver.
2. Additive non-breaking changes: minor bump.
3. Breaking changes: major bump and migration note required.

## Change Types
- Additive: new optional field, new event type with backward-safe default handling.
- Breaking: rename/remove field, enum value changes, command payload shape changes.

## Required for Contract Changes
1. Update `packages/contracts` type definitions.
2. Update Rust serde structs and aliases as needed.
3. Update docs (`docs/contracts/*` or policy references).
4. Update tests (Rust and/or TS fixture tests).
5. Note compatibility impact in PR summary.

## Serialization Policy
1. Public cross-boundary JSON uses camelCase.
2. Rust structs use serde rename strategy and aliases when needed for backward compatibility.
3. Enums crossing boundary must have explicit serialization names.

## Deprecation
1. Deprecated fields require one full milestone before removal.
2. Removal PR must link deprecation notice and migration path.
