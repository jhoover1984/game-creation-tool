# V2 Parity Fixture Matrix

## Purpose
Define the minimum fixture coverage required to prove Rust <-> TS contract parity.

## Core Fixture Sets
1. Project:
   - minimal valid project
   - project with optional fields populated
   - legacy-compatible input migrated to current
2. Map:
   - minimal map + one layer
   - map with multiple layers and chunks
3. Animation:
   - loop clip
   - once clip
   - clip with anchors and events
4. Story:
   - minimal quest graph
   - branching graph
   - dialogue truth + style pack

## Current Baseline Implemented
1. `packages/contracts/fixtures/project_min.v2.json`
2. `packages/contracts/fixtures/map_min.v2.json`
3. `packages/contracts/fixtures/animation_clip_walk.v2.json`
4. `packages/contracts/fixtures/entity_min.v2.json`
5. `packages/contracts/fixtures/story_quest_branch.v2.json`
6. `packages/contracts/src/schema-validation.test.ts` validates project/map/animation/entity/story fixtures and invalid-case regressions.

## Required Parity Assertions
1. TS parse -> TS serialize matches canonical JSON policy.
2. Rust parse -> Rust serialize matches canonical JSON policy.
3. Cross-path:
   - Rust serialize -> TS parse/serialize -> canonical compare.
   - TS serialize -> Rust parse/serialize -> canonical compare.
4. Hash parity:
   - canonical hash identical across Rust and TS for same fixture.

## Failure Diagnostics
Every parity failure must report:
1. Field path mismatch.
2. Type/value mismatch.
3. Missing/extra fields.
4. Serializer naming mismatch (snake_case/camelCase).

## CI Gate
1. Parity fixtures are blocking for contract changes.
2. Any schema or cross-boundary type change must update fixture set.
3. CI should fail if fixture matrix docs are not reflected in test updates.
