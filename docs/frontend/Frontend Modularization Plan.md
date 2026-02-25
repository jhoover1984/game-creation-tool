# Frontend Modularization Plan

Last updated: 2026-02-20

## Purpose
- Define a safe, staged reorganization of `apps/desktop/src` to reduce sprawl and future drift.
- Improve modularity and ownership by domain while keeping imports stable during migration.

## Scope
- Target: `apps/desktop/src` and `apps/desktop/tests`.
- Strategy: domain-first folderization with temporary root compatibility shims.
- Non-goals: behavior changes mixed with move-only refactors.

## Guardrails
1. One domain move per PR.
2. Keep root compatibility shims until all imports are migrated.
3. No behavior edits in move-only PRs.
4. Required gate per PR:
- `node --test tests/*.test.mjs`
- `npm run test:e2e:smoke`
- `npm run typecheck`

## Phase Plan

## Phase 1 (Shipped): Animation Domain
Status: `Shipped`

New folder:
- `apps/desktop/src/ui/animation/`

Moved files:
- `apps/desktop/src/ui/animation/ui-flipbook-studio.js`
- `apps/desktop/src/ui/animation/ui-animation-transitions.js`
- `apps/desktop/src/ui/animation/ui-animation-transition-builder.js`
- `apps/desktop/src/ui/animation/animation-transition-schema.js`

Compatibility shims retained:
- `apps/desktop/src/ui-flipbook-studio.js`
- `apps/desktop/src/ui-animation-transitions.js`
- `apps/desktop/src/ui-animation-transition-builder.js`
- `apps/desktop/src/animation-transition-schema.js`

## Phase 2: Shell Domain
Status: `Planned`

Target folder:
- `apps/desktop/src/ui/shell/`

Candidates:
- `ui-shell.js`
- `ui-shell-entry.js`
- `ui-shell-events.js`
- `ui-shell-lifecycle.js`
- `ui-shell-log.js`
- `ui-shell-module-bundle.js`
- `ui-shell-render.js`
- `ui-shell-runtime.js`
- `ui-shell-status.js`
- `ui-shell-elements.js`
- `ui-shell-bootstrap-elements.js`

## Phase 3: Playtest Domain
Status: `Planned`

Target folder:
- `apps/desktop/src/ui/playtest/`

Candidates:
- `ui-playtest.js`
- `ui-breakpoints.js`
- `ui-map-viewport.js`
- `viewport-signature.js`

## Phase 4: Workspace Domain
Status: `Planned`

Target folder:
- `apps/desktop/src/ui/workspace/`

Candidates:
- `ui-workspace-bootstrap.js`
- `ui-workspace-bindings.js`
- `ui-layout-panels.js`
- `ui-command-bar.js`
- `ui-editor-input.js`
- `ui-canvas-renderer.js`
- `ui-map-interaction.js`
- `ui-entity-list.js`

## Phase 5: Assist/Onboarding Domain
Status: `Planned`

Target folder:
- `apps/desktop/src/ui/assist/`

Candidates:
- `ui-help-tour.js`
- `ui-walkthrough.js`
- `ui-onboarding.js`
- `ui-assisted-guardrail.js`
- `ui-draw-assist-controls.js`
- `ui-draw-seed.js`

## Phase 6: Core/State Domain
Status: `Planned`

Target folders:
- `apps/desktop/src/core/state/`
- `apps/desktop/src/core/api/`
- `apps/desktop/src/core/events/`

Candidates:
- `app-state.js`
- `project-api.js`
- `event-bus.js`
- `types.js`
- `wasm-runtime.js`

## Completion Criteria
1. All UI modules live under domain folders.
2. Root shims removed after import migration is complete.
3. `DOCUMENTATION_INDEX` and architecture docs updated.
4. All tests and smoke e2e remain green.
