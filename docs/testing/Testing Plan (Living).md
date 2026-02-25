# Testing Plan (Living)

Last updated: 2026-02-15
Owner: Engineering
Scope: `v1-core`

## Purpose
- Keep one continuously updated testing plan across sprints.
- Track what is covered, what is risky, and what must be added next.
- Provide release-readiness visibility without searching multiple docs.

## Inputs
- Strategy: `docs/testing/Test Strategy.md`
- Frontend coverage matrix: `docs/testing/Frontend Smoke Coverage.md`
- Sprint execution: `docs/sprints/Sprint Plan.md`
- Design baseline: `Design Doc Final v1.1.txt`

## Current Test Baseline
1. Rust unit/integration suite (`cargo test`)
2. Rust compile integrity (`cargo check`)
3. Frontend smoke suite (`cd apps/desktop && npm test`)
4. Frontend syntax checks (`node --check ...`)
5. Browser E2E suite executable and CI-enforced (`cd apps/desktop && npm run test:e2e`)

## Release-Critical Flows (must stay green)
1. Launch dashboard lifecycle: fresh open/new/reopen/recover.
2. Map edit lifecycle: create/move/delete/undo/redo
3. Tile edit lifecycle: paint/erase + undo compatibility
4. Playtest lifecycle: enter/pause/step/tick/exit
5. Breakpoint behavior: pause on configured events
6. Runtime watch payloads: flags/variables/inventory consistency
7. Project safety path: open/save/migrate/health

## Risk Register (Testing)
| Risk | Impact | Current Mitigation | Next Action |
| --- | --- | --- | --- |
| Browser E2E instability can block merges when promoted in CI | Medium | Playwright retries in CI + flaky log template | Run 2-week stability window and record pass/fail trend |
| Canvas render regressions may pass logic tests | Medium | Payload and state assertions | Add viewport snapshot/parity assertions |
| Test-state leakage in frontend fallback | Low | Reset hooks added in tests | Keep reset helper mandatory in new suites |
| Script graph validation regressions (cycles/duplicates/empty IDs) | Medium | `script-core` unit coverage now includes cycle and duplicate-edge cases | Add golden invalid-graph fixture pack for cross-layer contract tests |
| Frontend async/parse/listener error containment drift | Medium | explicit tests for `app-state`, `project-api`, and `event-bus` error paths | Add targeted E2E recovery-action assertions from Issues Drawer |
| Runtime state-machine regressions in `editor_runtime.rs` | Medium | direct unit tests for lifecycle/tick/trace/breakpoint/watch flows | Expand paused/unpaused edge-timing scenarios with deterministic fixtures |
| Launch dashboard route regressions | Medium | enforced E2E flow coverage for dashboard new/open/recover/continue actions | Keep selectors stable and add visual regression snapshots for dashboard card states |

## Playwright Stability Window (CI Gate Hardening)
1. Window length: 2 weeks of mainline CI runs.
2. Track metrics per day:
   - total Playwright runs
   - failures
   - rerun-only passes (flake signals)
3. Success threshold to lock as permanent hard gate:
   - >= 98% first-pass success rate
   - no unresolved recurring flaky test
4. Logging location:
   - `docs/testing/Flaky Test Log.md`
   - CI Playwright artifacts (`test-results/playwright-report.json`) from workflow uploads
5. If threshold is missed:
   - quarantine unstable spec with explicit issue link
   - land deterministic fix before re-enabling gate strictness

## Playwright Metrics Collection Workflow
1. CI runs `npm run test:e2e:ci` to emit JSON results at:
   - `apps/desktop/test-results/playwright-report.json`
2. CI uploads Playwright artifacts for every run (pass/fail) for trend analysis.
3. During the 2-week window, record daily summary in `docs/testing/Flaky Test Log.md`:
   - run count
   - failures
   - rerun-only passes
   - perf budget summary (dashboard paint/editor init/workspace enter)
4. Automation support:
   - `cd apps/desktop && npm run test:e2e:metrics`
   - parses `test-results/playwright-report.json`
   - updates `docs/testing/Flaky Test Log.md` daily summary row for current date
5. Perf budget handling mode:
   - strict by default in CI (`GCS_PERF_BUDGET_STRICT=1`) with calibrated thresholds
   - tune threshold env values when trend data shows legitimate variance, rather than disabling strict mode
   - playtest responsiveness is now budgeted alongside launch/workspace (`playtest_first_frame`, `playtest_update`)
6. Metrics automation also computes trend deltas versus the previous perf-enabled daily row:
   - dashboard first paint delta
   - editor init delta
   - workspace-enter delta
   - warn thresholds configurable via:
     - `GCS_PERF_DELTA_WARN_DASHBOARD_MS`
     - `GCS_PERF_DELTA_WARN_EDITOR_INIT_MS`
     - `GCS_PERF_DELTA_WARN_WORKSPACE_ENTER_MS`
7. Escalate if recurring failures affect the same test case twice in one week.

## Sprint Update Checklist (repeat every sprint)
1. Record all new user-facing behaviors added this sprint.
2. Mark each behavior as Covered / Partial / Missing.
3. Add at least one automated regression test per new feature.
4. Re-run required test commands from strategy doc.
5. Log flaky tests, root causes, and remediation.
6. Run documentation sync pass after major changes:
   - update `docs/sprints/Sprint Plan.md` progress + immediate tasks
   - update `docs/testing/Frontend Smoke Coverage.md` coverage mapping
   - update `docs/CHANGELOG.md` and `docs/KNOWN_ISSUES.md` if relevant
7. For reliability hardening items, include at least one failure-path test, not only happy-path.

## Test Case Template (for quick additions)
- Feature:
- User flow:
- Expected behavior:
- Failure behavior:
- Test layer (`Rust`, `Frontend smoke`, `Browser E2E`):
- Test file:
- Added in sprint:

## Exit Criteria for v1.0 Testing
1. All release-critical flows covered by automation.
2. No known P0/P1 defects open.
3. Required commands green on clean machine.
4. Browser-level smoke suite remains green in CI with tracked flake/perf trend data.
