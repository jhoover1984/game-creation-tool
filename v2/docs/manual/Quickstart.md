# V2 Quickstart (10 Minutes)

Status: In Progress  
Scope: Current launch slice only (implemented + testable today)

## Goal
Get from empty state to a playable loop quickly:
1. Create project
2. Paint tiles
3. Place entity
4. Enter playtest
5. Save and load project

## Steps
1. Create project via runtime/editor bootstrap.
2. Paint at least one tile on `layer-0`.
3. Create at least one entity and move it.
4. Run playtest tick and verify state updates.
5. Save to JSON, reload JSON, verify roundtrip.

## Behavior IDs
- `QS-001` Create project initializes manifest/layers/entities.
- `QS-002` Tile paint persists in layer data.
- `QS-003` Entity create/move/delete works through command bus.
- `QS-004` Playtest lifecycle transitions correctly.
- `QS-005` Save/load roundtrip preserves authored data.

## Current Evidence
- Runtime tests: `packages/runtime-web/src/project-store.test.ts`
- Runtime tests: `packages/runtime-web/src/playtest-runner.test.ts`
- Capability reference: `docs/architecture/V2 Capability Matrix.md`
