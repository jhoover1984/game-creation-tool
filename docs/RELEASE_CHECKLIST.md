# Release Checklist (v1-core)

Last updated: 2026-02-20

Purpose: List release gate checks and shipping readiness criteria.

## Pre-Release Verification
1. `cargo fmt --all -- --check` passes.
2. `cargo test --workspace` passes.
3. `cargo check` passes.
4. `cd apps/desktop && node --test tests/*.test.mjs` passes.
5. `cd apps/desktop && npm run test:e2e` passes.
6. Frontend syntax checks pass:
   - `node --check apps/desktop/src/app-state.js`
   - `node --check apps/desktop/src/project-api.js`
   - `node --check apps/desktop/src/ui-shell.js`
7. Frontend typecheck and E2E gates pass:
   - `cd apps/desktop && npm run typecheck`
   - `cd apps/desktop && npm run test:e2e:smoke`
   - `cd apps/desktop && npm run test:e2e:visual`

## Functional Validation
1. Map workflow: create, move, delete, undo, redo.
2. Tile workflow: paint + erase.
3. Playtest workflow: enter, pause/resume, step, speed changes, exit.
4. Breakpoint workflow: configure event breakpoints and verify pause on hit.
5. Watch workflow: verify global and selected-entity buckets render correctly.
6. Trace workflow: verify filter chips + event-kind filtering behavior.
7. Movement workflow: entity with MovementComponent moves via input in all three modes (GridSnap, FreeMove, TurnBased).
8. Input mapping workflow: key events dispatch through `playtest_key_down`/`playtest_key_up`, map to semantic actions, fire script events for action keys.
9. Physics workflow: entity with VelocityComponent responds to gravity/friction; collision response stops movement on solid tiles.
10. Scene workflow: add/remove/switch scenes, spawn points resolve correctly during playtest.
11. Animation workflow: clips can be added/set, transitions evaluate (`flag_set`, `flag_set_for_ticks`, integer threshold kinds, `clip_finished`), sprite frame syncs during playtest.
12. Animation params workflow: bool/int/trigger parameter commands mutate runtime state and drive transitions deterministically.
13. Web parity workflow: fallback/WASM playtest path preserves animation tick behavior and does not regress breakpoint handling.

## UX And Accessibility Validation
1. Dashboard-first flow is clear and usable:
   - primary action (`Create Project`) remains dominant and above fold.
   - secondary actions (`Open`, `Continue Recent`, `Recover`) are discoverable and lower emphasis.
2. Beginner mode still enforces progressive disclosure (advanced controls are not default-visible).
3. Keyboard focus is visible on primary controls and top-level navigation.
4. No critical text-contrast regressions in topbar, rails, inspector, and issues surfaces.
5. Visual/interaction updates align with `docs/frontend/Visual Design System.md` and `docs/frontend/UI UX Execution Plan.md`.
6. Dashboard template catalog and recents list follow the shared data paths (see Manual QA steps 17-18 for sanity and scaling checks).

## Documentation Sync
1. Update `docs/CHANGELOG.md` with user-visible changes.
2. Update `docs/KNOWN_ISSUES.md` with new limitations/regressions.
3. Update `docs/sprints/Sprint Plan.md` progress + immediate tasks.
4. Update `docs/testing/Frontend Smoke Coverage.md` when coverage changes.
5. Update `docs/commands/Command Surface.md` for command/payload changes.
6. Update `docs/contracts/payload-contracts.md` for command shape/race-policy changes.
7. Update UX planning docs when visual or workflow behavior changes:
   - `docs/frontend/Visual Design System.md`
   - `docs/frontend/UI UX Execution Plan.md`

## Go/No-Go Gates
1. No unresolved P0 defects.
2. No unresolved P1 defects without approved waiver.
3. CI workflow green on main branch.
4. Release notes reviewed and approved.
