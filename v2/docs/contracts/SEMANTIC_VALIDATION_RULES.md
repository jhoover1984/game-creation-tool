# V2 Semantic Validation Rules

## Purpose
Define invariant checks that JSON Schema alone cannot enforce.

## Validation Stages
1. Structural validation:
   - JSON Schema shape/type checks.
2. Semantic validation:
   - Cross-reference and domain invariants.
3. Runtime validation:
   - Constraints tied to current runtime capabilities/performance budgets.

## Required Semantic Rules

### Identity and Uniqueness
1. IDs must be globally unique within their scope.
2. Duplicate IDs are hard errors.
3. Referenced IDs must exist (no dangling references).

### Graph Integrity
1. Edge endpoints must reference existing nodes.
2. Required graph roots must exist (e.g., quest start node).
3. Disallowed cycles must be rejected where the graph type requires DAG behavior.
4. Unreachable nodes should produce warnings.

### Asset and Resource Integrity
1. Every `ResourceRef.assetId` must resolve to a manifest entry.
2. Manifest path must exist at load/build time (or produce actionable warning/error by phase).
3. Asset kind must match usage context (e.g., clip ref cannot resolve to sound asset).

### Animation Integrity
1. Frame indices in events/anchors must be in bounds.
2. Clip playback mode and timing data must be internally consistent.
3. Transition references must resolve to existing states/clips.
4. Duplicate transition keys (same from+condition) should warn or error by policy.

### Map and Chunk Integrity
1. Chunk coord + chunkId combinations must be unique.
2. Layer payload dimensions must match declared grid/chunk size.
3. Layer references in chunk payloads must resolve to map layer definitions.

### Determinism Integrity
1. Generator/recipe executions require explicit seed (or deterministic inherited seed).
2. Replay logs must match initial snapshot hash before playback.
3. Nondeterministic runtime-only fields must not affect persisted semantic checks.

## Severity Policy
1. Error: cannot continue load/build.
2. Warning: load/build can continue; must be surfaced in UI/task report.
3. Info: diagnostic-only.

## Test Requirements
1. Every semantic rule must have:
   - one passing fixture,
   - one failing fixture with expected diagnostic.
2. Rules must be covered in both TS and Rust validation paths where applicable.

## Current Baseline Implemented
1. TypeScript semantic validator for quest graph:
   - duplicate node ID detection (`QUEST_DUPLICATE_NODE_ID`)
   - edge endpoint existence checks (`QUEST_EDGE_FROM_MISSING`, `QUEST_EDGE_TO_MISSING`)
   - root/start-node cardinality (`QUEST_START_NODE_MISSING`, `QUEST_START_NODE_MULTIPLE`)
   - unreachable node detection as warning (`QUEST_NODE_UNREACHABLE`)
2. Tests:
   - `packages/contracts/src/semantic-validation.test.ts`
   - uses `packages/contracts/fixtures/story_quest_branch.v2.json`
3. Runtime enforcement:
   - `packages/runtime-web/src/project-validation.ts` applies quest semantic checks during project load when `story.questGraph` is present.
   - warnings do not block load; errors block load.
