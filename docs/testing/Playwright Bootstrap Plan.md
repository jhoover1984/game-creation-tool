# Playwright Bootstrap Plan

Last updated: 2026-02-16
Purpose: Document phased Playwright rollout and stabilization plan for browser-level testing.

Status: In Progress (core coverage shipped; stability/perf hardening active)

## Goal
- Add stable browser-level smoke tests for core UI interactions.
- Keep suite lean, deterministic, and maintainable.

## Entry Gate (must pass first)
1. Playwright gate in `docs/testing/Test Strategy.md` is satisfied.
2. Existing smoke tests (`npm test`) remain green for 2 sprint checkpoints.
3. UI selectors for critical controls are finalized.

## Phase 1 Scope (Initial E2E)
1. Open -> add entity -> drag move -> undo/redo.
2. Paint and erase tile stroke path.
3. Enter playtest -> hit breakpoint -> verify paused state.
4. Watch and trace filters: validate chip interactions and visible updates.
5. Viewport signature assertions + zoom preset scaling.
6. Multi-tab session isolation.
7. Export preview artifact pixel parity on golden scenes.

## Proposed Setup
1. Add Playwright dev dependency in `apps/desktop`. (Done)
2. Add `playwright.config` with a local static web runner. (Done)
3. Create `apps/desktop/tests-e2e` folder for browser tests. (Done)
4. Add scripts: (Done)
   - `npm run test:e2e`
   - `npm run test:e2e:smoke`
   - `npm run test:e2e:smoke:quickstart`
   - `npm run test:e2e:headed`
5. Add initial browser smoke specs for:
   - shell load + entity create flow (Done)
   - playtest breakpoint pause flow (Done)

## Stability Rules
1. Use explicit `data-testid` or stable `id` selectors only.
2. Avoid fixed sleeps; wait on deterministic state markers.
3. Keep E2E suite limited to critical paths.
4. Quarantine flaky tests immediately and log in `docs/testing/Flaky Test Log.md`.

## Runtime Expectations
1. `npm run test:e2e` always runs `build:export:preview` first, so local runs include Rust export build/startup time before browser tests.
2. First run after codegen/build cache changes is usually slower than reruns due artifact generation and browser/session startup.
3. If a run is interrupted externally (terminal timeout/forced stop), Playwright can emit `EPIPE` from a broken reporter stream; this is not the same as a product regression.
4. For faster local loops, use `npm run test:e2e:smoke` (or `npm run test:e2e:smoke:quickstart`) after artifact generation is already up to date.

## CI Rollout
1. Browser E2E is already part of required CI checks.
2. Current focus is stability monitoring (first-pass success rate and flaky tracking).
3. CI now runs `npm run test:e2e:ci` and uploads Playwright result artifacts for each run.
4. CI now runs `npm run test:e2e:metrics` to emit daily summary markdown from JSON artifacts.

## Current Output
- `apps/desktop/playwright.config.mjs`
- `apps/desktop/playwright.ci.config.mjs`
- `apps/desktop/scripts/static-server.mjs`
- `apps/desktop/scripts/build-export-artifacts.mjs`
- `apps/desktop/scripts/playwright-metrics.mjs`
- `apps/desktop/tests-e2e/smoke.spec.mjs`
- `apps/desktop/tests-e2e/desktop-runtime.spec.mjs`
- `apps/desktop/tests-e2e/export-parity.spec.mjs`
- `apps/desktop/tests-e2e/authored-export.spec.mjs`
- `apps/desktop/package.json` Playwright scripts/dependency
- `docs/testing/Flaky Test Log.md` tracking path

## Desktop Runtime Variant Status
- Added contract-level desktop runtime coverage in Node tests (`project-api` with `window.__TAURI__` invoke stubs).
- Added browser-driven desktop runtime variant E2E with injected `window.__TAURI__` bridge to exercise real UI flow through `invoke_command`.
- Added CI runtime-feature smoke gate on Windows (`cargo check --features tauri-runtime` + invoke command smoke).
- Remaining scope: full native Tauri shell UI automation in CI (windowed interaction path).

## Export Pipeline Status
- Native Rust export-core packaging path is now active in CI parity checks (`npm run build:export:preview` -> `gcs-desktop export-preview`).
- JS packaging path remains available as fallback tooling (`build-export-artifacts.mjs`).
- Browser parity now discovers scenes from packaged `scenes.json`, so coverage scales with native export bundle scene updates.
- Export artifacts now include metadata contract checks (`metadata.json`: `profile`, `mode`, `scene_count`) in browser E2E.
- CI now runs profile-specific parity assertions for NES and SNES export outputs.
- Authored export lane coverage is active (`test:e2e:authored`) and validates packaged assets/audio/runtime behavior.
- Remaining scope: native Tauri shell E2E run in CI and production export profile expansion.

