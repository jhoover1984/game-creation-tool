# V2 Schema Guidelines

## Purpose
Define strict, consistent rules for authoring JSON Schemas in v2 so TS, Rust, and fixtures do not drift.

## Baseline Standard
1. Use JSON Schema Draft 2020-12.
2. Every schema must define:
   - `$schema`
   - `$id`
   - `title`
   - `type`
3. Use `additionalProperties: false` by default for all object contracts.

## Shared Types
1. Shared types belong in a common schema under `$defs`.
2. Reference shared types with explicit `$ref` paths:
   - `common.v2.json#/$defs/Id`
   - `common.v2.json#/$defs/Vec2`
3. Avoid duplicating primitive contracts across files.

## IDs and References
1. IDs are strings with stable prefixes (`proj_`, `map_`, `ent_`, `asset_`, etc.).
2. Cross-file links use explicit references (`ResourceRef`-style).
3. IDs must be stable across save/load and migrations.

## Naming and Field Conventions
1. Cross-boundary JSON is camelCase.
2. Rust uses serde rename/alias for compatibility; schema stays strict.
3. Avoid ambiguous fields. Prefer explicit names (`tileSize`, not `size`).

## Optional vs Required
1. Keep required fields minimal and intentional.
2. Optional fields must be documented with default behavior.
3. Do not use schema defaults as runtime behavior unless runtime explicitly applies them.

## Strictness and Compatibility
1. Keep schema strict; do not loosen schema for legacy files.
2. Handle legacy compatibility in migration code and serde aliases.
3. Backward compatibility requirements are defined in:
   - `docs/contracts/SCHEMA_VERSIONING.md`
   - `docs/contracts/V2 Compatibility Policy.md`

## Authoring and Runtime Data Separation
1. Keep editor-only metadata separate from runtime-critical data.
2. If editor metadata must coexist, place it in documented editor-only sections and strip for runtime export.

## Validation Layers
1. Schema validation checks structural shape.
2. Semantic validation checks domain invariants.
3. Semantic rules are defined in:
   - `docs/contracts/SEMANTIC_VALIDATION_RULES.md`

## Required Updates When Editing a Schema
1. Update schema file(s).
2. Update corresponding TS contract types.
3. Update Rust serde structs and aliases where needed.
4. Update fixtures and parity tests.
5. Update relevant docs and capability status if behavior changes.
