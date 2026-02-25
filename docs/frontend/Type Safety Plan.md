# Frontend Type Safety Plan

Last updated: 2026-02-17
Purpose: Plan frontend type-safety hardening using JSDoc + TypeScript compiler checking.

Status: In Progress (Phase 1 baseline complete; contract-depth hardening continues)

## Goal
- Improve frontend correctness and maintainability without blocking active sprint delivery.

## Decision
- **Keep JavaScript (ES2022 modules) as the frontend language.**
- Use JSDoc type annotations + TypeScript compiler (`tsc --noEmit`) for static type checking.
- No build step required — JS files serve directly to Tauri webview.
- This gives ~80% of TypeScript's safety benefits with zero compilation overhead.
- Full TypeScript migration is **not planned for v1**. Reconsider only if a build step is added for another reason (bundling, tree-shaking).

## Why Not Full TypeScript
- Would require adding a TS build step (tsc or esbuild) to the pipeline.
- Every .js → .ts rename breaks imports, E2E test references, and Tauri config.
- Migration effort delivers zero new user-facing value.
- Current JSDoc approach already catches type errors at CI time via `npm run typecheck`.

## Scope Priorities
1. `apps/desktop/src/app-state.js`
2. `apps/desktop/src/project-api.js`
3. `apps/desktop/src/ui-shell.js`

## Phase 1 (Now)
1. Add ESLint and Prettier tooling.
2. Add key JSDoc typedefs for editor snapshot payloads and commands.
3. Enforce no-undef and basic unsafe-pattern guards in lint.

### Phase 1 Progress
- Completed:
  - ESLint + Prettier baseline in CI.
  - Shared JSDoc contract surface added in `apps/desktop/src/types.js`.
  - `app-state.js` now imports/uses snapshot and editor-response typedefs.
  - `project-api.js` now imports/uses command payload typedefs and response contracts for key invoke paths.
  - Playtest telemetry contract normalized to backend snake_case in fallback/UI surfaces (`last_tick_delta_ms`, `last_tick_steps`) to remove dual-shape drift.
  - `ui-entity-list.js` now declares explicit JSDoc rendering contracts for entity rows.
  - `ui-health-issues.js` now declares explicit JSDoc health/issue model contracts.
  - `ui-launch-dashboard.js` now declares explicit JSDoc controller/dependency contracts.
  - `ui-breakpoints.js` now declares explicit JSDoc breakpoint-toggle contracts.
  - `ui-assisted-guardrail.js` now declares explicit JSDoc assisted-guardrail contracts.
  - `ui-shell-entry.js` now declares explicit JSDoc entry/preload orchestration contracts.
  - `ui-workspace-bootstrap.js` now declares explicit JSDoc workspace bootstrap orchestration contracts.
  - `ui-shell-bootstrap-elements.js` now declares explicit JSDoc contracts for help-tour step generation and workspace bootstrap element-map shaping.
  - `ui-shell-elements.js` now provides a centralized shell DOM element-query contract with grouped command/tool mappings.
  - `ui-shell-module-bundle.js` now declares explicit JSDoc contracts for lazy editor module loading and preload telemetry hooks.
  - `ui-shell-runtime.js` now declares explicit JSDoc contracts for playtest toggle, breakpoint delegation, and controller disposal behavior.
  - `ui-shell-render.js` now declares explicit JSDoc contracts for editor-workspace render orchestration and status-context propagation.
  - `ui-shell-log.js` now declares explicit JSDoc shell-log formatting contracts.
  - `ui-workspace-bindings.js` now declares explicit JSDoc workspace listener + selection/name-input contracts.
  - `ui-shell-events.js` now declares explicit JSDoc event wiring contracts.
  - `ui-shell-lifecycle.js` now declares explicit JSDoc lifecycle boundary contracts.
  - `ui-shell-status.js` now declares explicit JSDoc status/HUD rendering contracts.
  - scoped `checkJs` gate now covers the full frontend source tree via `apps/desktop/jsconfig.json` `include: ["src/**/*.js"]`.
  - `ui-canvas-renderer.js` now declares explicit JSDoc controller/dependency contracts and uses keyed entity-node reuse to reduce drag/playtest DOM churn.
  - `ui-playtest.js` now declares explicit JSDoc controller/dependency contracts for runtime state adapter and playtest element wiring.
  - `ui-draw-seed.js` now declares explicit JSDoc contracts for preset/warning model shapes and draw-seed controller dependencies.
  - Added `apps/desktop/jsconfig.json` and `npm run typecheck` (`tsc --noEmit`) and expanded from curated modules to full-source coverage (`src/**/*.js`).
  - Full-source gate hardening included:
    - global window extension contracts for `__gcsPerfMetrics`, `__gcsGlobalErrorBoundaryInstalled`, and `__exportPreview`
    - assisted-guardrail callback contract alignment across shell/bootstrap/render flows
    - explicit composition-time select/button casts in `ui-shell.js` for strict controller interfaces
  - CI now enforces frontend typecheck in `.github/workflows/ci.yml`.
- Remaining:
  - Continue adding/normalizing explicit JSDoc on lower-level UI modules as they are touched (`ui-shell.js` is now typechecked under full-source coverage, but still benefits from richer typedef extraction).
  - Keep full-source `checkJs` coverage stable as new files are added.

## Phase 2 (Ongoing)
1. Tighten `jsconfig.json`: set `"strict": true` when remaining type gaps are closed (currently `"strict": false`).
2. Continue deepening JSDoc typedef coverage in lower-level UI modules as they are touched.
3. Keep full-source `checkJs` coverage stable as new files are added.
4. If a build step is ever introduced for another reason, reconsider selective .ts conversion for highest-churn modules.

## Exit Criteria
1. Core state/API modules have explicit type contracts.
2. Frontend command payload shape mismatches are caught pre-runtime.
3. Lint + format + typecheck + tests pass in CI consistently.
4. `jsconfig.json` runs with `"strict": true` across full source tree.

