# Dogfood Game Build Scenarios

Last updated: 2026-02-15
Purpose: define internal "we built a real game with our own tool" proof flows.

## Scenario 1: Mini Puzzle Game (Sokoban-style)
Goal: prove the current tool can create and export-preview a playable puzzle loop.

Steps:
1. Open editor workspace.
2. Select walkthrough `Sokoban-style Puzzle Room`.
3. Run walkthrough steps to completion.
4. Confirm:
- project title is `Puzzle Starter`
- entities exist
- tiles exist
5. Trigger walkthrough completion action `Export Preview`.
6. Confirm log reports export preview generated.
7. Open Script Lab and verify puzzle starter script scaffold is present:
- `event_move_input`
- `action_push_crate`

Pass criteria:
1. Entire flow runs without manual code edits.
2. No runtime crash or blocked state transitions.
3. Export preview completes successfully.
4. Script graph is puzzle-specific, not generic starter graph.

Automation:
- Covered by Playwright smoke test:
  - `apps/desktop/tests-e2e/smoke.spec.mjs`
  - test name: `dogfood flow builds and export-previews a mini puzzle game`

## Scripted Artifact Build (Sample Game 01)
Command:
- `cd apps/desktop && npm run build:sample:game01`

Outputs:
- `samples/Sample Game 01/project-snapshot.json`
- `samples/Sample Game 01/script-graph.json`
- `samples/Sample Game 01/build-report.json`
- `samples/Sample Game 01/export-preview/*`
- `apps/desktop/export-artifacts/sample-game-01/*` (served copy for local preview)

Notes:
1. This path dogfoods creation logic through `app-state` (template + edits + playtest/breakpoint).
2. Native export output is generated via `gcs-desktop invoke export_preview_html5 ...` with authored snapshot payload.
3. Open preview via static server route:
- `http://127.0.0.1:4173/export-artifacts/sample-game-01/index.html`
