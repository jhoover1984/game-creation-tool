# Development Workflow

Last updated: 2026-02-15

## Purpose
- Keep changes clean, linked, and testable.
- Prevent drift between frontend, backend, and docs.

## Definition Of Done (for this repo)
- Feature works through the full command flow.
- Tests pass at relevant layers.
- Docs updated for behavior or contract changes.
- No silent fallback hiding real backend failures.

## Feature Delivery Checklist
1. Confirm scope against `Design Doc Final v1.1.txt` and current sprint.
2. Add or update command contract in `docs/commands/Command Surface.md`.
3. Implement backend command dispatch in `apps/desktop/src-tauri/src/invoke_api.rs`.
4. Implement service/runtime behavior in `apps/desktop/src-tauri/src/editor_service.rs` and `apps/desktop/src-tauri/src/editor_runtime.rs`.
5. Wire frontend API in `apps/desktop/src/project-api.js`.
6. Update state transitions in `apps/desktop/src/app-state.js`.
7. Bind UI behavior through shell/controller modules in `apps/desktop/src` (keep `ui-shell.js` as orchestration only).
8. Add tests:
  - Rust tests for behavior.
  - Node smoke tests for contract.
  - Playwright E2E for user flow when applicable.
9. Update docs:
  - `docs/CHANGELOG.md`
  - `docs/KNOWN_ISSUES.md` if needed
  - `docs/sprints/Sprint Plan.md` status/tasks
  - `docs/frontend/UI UX Execution Plan.md` when UI/UX delivery priorities or acceptance criteria change
  - test coverage docs when test scope changes

## Required Validation Commands
- `cargo test`
- `cd apps/desktop && npm test`
- `cd apps/desktop && npm run lint`
- `cd apps/desktop && npm run typecheck`
- `cd apps/desktop && npm run format:check`
- `cd apps/desktop && npm run test:e2e`
- `cd apps/desktop && npm run test:e2e:visual` (required for UI/CSS/visual workflow changes)

## Drift Control Cadence
1. Run a drift audit at every sprint checkpoint (minimum once per week) using `docs/reviews/Drift Audit Checklist (Running).md`.
2. Validate design-vs-shipped status explicitly:
  - mark features as `Shipped`, `In Progress`, or `Planned`.
  - avoid presenting planned items as delivered behavior.

## PR Review Focus
- Does this preserve preview/export intent?
- Are mutations command-driven and undoable?
- Are context boundaries preserved (Map vs other contexts)?
- Does it surface failures clearly instead of hiding them?
- Are docs and tests updated with the code?

## Common Mistakes To Avoid
- Adding UI-only state that should be runtime-authoritative.
- Changing payload shape without updating command docs and tests.
- Making fallback behavior swallow real backend errors.
- Shipping behavior changes without updating sprint/testing docs.
