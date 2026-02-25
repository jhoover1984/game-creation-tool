# QA Checklist (Sprint/Release)

Last updated: 2026-02-16
Purpose: Provide repeatable manual QA checklist for pre-release verification.

Use: quick pass before merging major changes or closing sprint goals.

## Core Verification
1. `cargo fmt` completed.
2. `cargo test` green.
3. `cargo check` green.
4. `cd apps/desktop && npm run lint` green.
5. `cd apps/desktop && npm run typecheck` green.
6. `cd apps/desktop && npm test` green.
7. `cd apps/desktop && npm run test:e2e:smoke` green.

## Functional Smoke (Manual, 5-10 min)
1. Open project, add entity, move, undo, redo.
2. Paint and erase tiles.
3. Enter playtest, pause/resume, single-step, exit.
4. Enable trace and confirm events appear in log dock.
5. Enable breakpoint and confirm playtest pauses on hit.
6. Confirm watch panel updates (flags/variables/inventory).

## Regression Questions
1. Did any user-facing behavior change without a new automated test?
2. Did any API response shape change without docs/tests updates?
3. Did any command/hotkey change without UI hint text update?
4. Were sprint/testing/changelog docs updated after major changes?

## Release Readiness Notes
- Record known limitations here before demo/release:
  - Native desktop-shell E2E automation in CI is still limited (browser/runtime path is covered).
  - Theme/density visual-regression breadth is still expanding.

