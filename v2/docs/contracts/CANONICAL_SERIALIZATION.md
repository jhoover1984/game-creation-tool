# V2 Canonical Serialization

## Purpose
Ensure stable, deterministic serialization for fixtures, hashing, parity tests, and replay safety.

## Canonical JSON Rules
1. UTF-8 encoding.
2. LF (`\n`) line endings.
3. Object keys serialized in lexicographic order for canonical output paths.
4. No trailing commas.
5. No comments in persisted JSON.

## Numeric Rules
1. Preserve numeric precision required by gameplay.
2. Avoid locale-dependent formatting.
3. Reject NaN/Infinity in persisted JSON.
4. If float normalization is required for hashing, use a documented precision policy per domain.

## Time and IDs
1. Timestamps use RFC 3339 / ISO-8601 UTC.
2. IDs are case-sensitive and preserved exactly.
3. Random IDs in tests must be deterministic where fixture comparisons are required.

## Hashing Inputs
1. Hashes used for integrity/parity must be computed from canonical serialization output.
2. Do not hash pretty-print variants inconsistently between systems.
3. Migration pipelines must canonicalize before hash/compare.

## Rust and TypeScript Alignment
1. Rust serde output must align with schema field names (camelCase boundary).
2. TS serializer must not reorder arrays unless explicitly required by contract.
3. Any canonicalization utility must have parity tests across Rust and TS.

## Export/Build Artifacts
1. Authoring JSON may include editor metadata; runtime build artifacts should strip editor-only fields where defined.
2. Binary sidecars are allowed for large payloads, but JSON headers/manifests remain canonical and schema-validated.
