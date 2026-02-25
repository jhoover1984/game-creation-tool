# Test Strategy (v1-core)

Last updated: 2026-02-15

Purpose: Define required test layers, merge gates, and coverage priorities for v1-core.

## Goals
- Catch functional regressions quickly.
- Keep local feedback loop fast for daily development.
- Add heavier browser automation only when the runtime shell is stable enough to avoid flaky suites.

## Test Layers
1. Rust unit/integration (`cargo test`)
- Covers command bus, runtime/editor behavior, invoke dispatch, project safety/migration.
- This is the primary functional safety net.

2. Frontend state/API smoke (`cd apps/desktop && npm test`)
- Node built-in test runner (`node --test`).
- Validates app-state workflows and project-api contract behavior.
- Includes UI helper logic smoke for trace/watch filter behavior.
- No external test framework dependency.

3. Static checks
- `cargo check` for compile integrity.
- `node --check` for frontend syntax integrity.

4. Visual shell regression lane (non-blocking during Sprint 2)
- `cd apps/desktop && npm run test:e2e:visual`
- Uses Playwright screenshots on key shell surfaces (topbar/canvas/issues drawer severity rows).
- Purpose: catch unintended UI drift while interaction tests stay behavior-focused.
- Tagged as `@visual` and excluded from default `test:e2e` / `test:e2e:ci` runs.

## Required Commands Before Merge
1. `cargo fmt`
2. `cargo test`
3. `cargo check`
4. `cd apps/desktop && npm run lint`
5. `cd apps/desktop && npm run format:check`
6. `cd apps/desktop && npm test`
7. `cd apps/desktop && npm run test:e2e`
8. `node --check apps/desktop/src/app-state.js`
9. `node --check apps/desktop/src/project-api.js`
10. `node --check apps/desktop/src/ui-shell.js`
11. `cd apps/desktop && npm run test:e2e:visual` (recommended local pre-merge for UI/CSS changes)

## Coverage Priorities
- P0: launch dashboard first-run flow (new/open/recent/recover).
- P0: map editing core (create/move/delete/undo/redo).
- P0: playtest lifecycle (enter/pause/step/tick/exit).
- P0: breakpoint behavior (pause on configured event kinds).
- P0: script graph validation correctness (including cycle detection).
- P0: frontend error containment (async action failures, parse failures, listener isolation).
- P1: watch panel payload contracts (flags/variables/inventory).
- P1: tile painting/erasing.
- P1: `editor_runtime` direct state-machine test coverage.
- P1: launch/workspace perf metrics probe contract (`window.__gcsPerfMetrics`) stays available and non-negative in smoke E2E.

## Error-Path Minimums
1. `project-api` malformed/invalid payload parse handling must be tested.
2. `app-state` async command failure path must not leave stale partial state.
3. `event-bus` must isolate failing listeners so sibling handlers still run.
4. Browser UI must surface actionable error messages for failed operations.

## Playwright Upgrade Gate
Adopt Playwright browser-level interaction tests when all are true:
1. Stable local web runner exists for the UI shell.
2. Core selectors/data attributes are finalized for major controls.
3. Current smoke suite remains green for at least 2 consecutive sprint checkpoints.
4. Sprint budget includes maintenance capacity for flaky-test triage.

Gate status note (2026-02-13):
- Local runner and initial E2E scaffold are in place.
- Browser E2E suite is now configured in CI as an enforced verification step.

Initial Playwright scope (when enabled):
0. Dashboard entry: fresh launch -> create project -> editor ready.
1. Open -> add entity -> drag move -> undo/redo.
2. Paint/erase stroke path on canvas.
3. Playtest enter -> breakpoint hit -> pause indicator.
4. Watch filter chip behavior and trace dock rendering.
5. Recent/recover cards route correctly from launch dashboard.
6. Perf metrics probe contract + budget summary emission (`test:e2e:metrics`) remains healthy.

## Perf Budget Mode (CI)
1. Metrics source: `window.__gcsPerfMetrics` attached by smoke E2E probe.
2. Aggregation: `cd apps/desktop && npm run test:e2e:metrics` parses Playwright JSON report and emits budget summary.
3. CI calibrated defaults (strict gate):
   - `GCS_PERF_BUDGET_DASHBOARD_MS=300`
   - `GCS_PERF_BUDGET_EDITOR_INIT_MS=700`
   - `GCS_PERF_BUDGET_WORKSPACE_ENTER_MS=1200`
   - `GCS_PERF_BUDGET_PLAYTEST_FIRST_FRAME_MS=700`
   - `GCS_PERF_BUDGET_PLAYTEST_UPDATE_DELAY_MS=900`
   - `GCS_PERF_BUDGET_STRICT=1`
4. Promotion path:
   - keep strict budgets calibrated with CI trend data from `docs/testing/Flaky Test Log.md`.
   - if false positives appear, tune thresholds rather than disabling strict mode.

## Maintenance Rules
- New user-facing feature must include at least one automated test in its nearest layer.
- Bug fixes require a regression test before/with the fix.
- Keep test names behavior-focused and deterministic.
- Avoid hidden global state in tests (use explicit reset hooks).

