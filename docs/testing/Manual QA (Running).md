# Manual QA (Running)

Last updated: 2026-02-15
Owner: You + Engineering
Scope: Sprint-by-sprint manual checks for `v1-core`

## Purpose
- Give you a clear, repeatable way to manually test the tool.
- Catch UX and workflow issues that automation may miss.
- Keep one running checklist that grows with the product.

## Before You Start
1. Open the app in your normal test path (browser shell for now).
2. Start from a fresh session if possible (close old tabs first).
3. Keep `docs/KNOWN_ISSUES.md` open so you can compare expected limitations.
4. For each check below, mark:
   - `PASS` if behavior matches expectation.
   - `FAIL` if it breaks, feels wrong, or is confusing.
   - `NOTE` for polish feedback (labeling, UX friction, visual clarity).

## Evidence Template (copy/paste per run)
- Date:
- Tester:
- Build/branch:
- Area tested:
- Result: PASS / FAIL / NOTE
- What happened:
- Expected behavior:
- Steps to reproduce (if FAIL):
- Screenshot/video path (optional):

## Core Smoke Walkthrough (10-15 minutes)

### 1. Open Project + Baseline State
1. Launch the tool.
2. Click `Open`.
3. Confirm you see a loaded project state (not an error screen).
4. Look at health/issues panel:
   - You may see fallback warnings in browser mode.
5. Expected:
   - App remains responsive.
   - No broken layout or frozen controls.

### 2. Entity Basics (Create/Move/Delete)
1. Click `Add Entity` once.
2. Confirm entity appears in entity list.
3. Click `Move Selected`.
4. Confirm coordinates in the entity list change.
5. Click `Delete Selected`.
6. Confirm entity disappears.
7. Expected:
   - Each action updates the list and map surface immediately.
   - No stale selection remains after delete.

### 3. Undo / Redo / Reselect
1. Add one entity.
2. Move it.
3. Click `Undo` and confirm position reverts.
4. Click `Redo` and confirm position re-applies.
5. Click empty canvas to clear selection.
6. Click `Reselect`.
7. Expected:
   - Undo/Redo works in order.
   - Reselect restores your previous selection even after clear.

### 4. Tile Editing (Paint/Erase/Drag Stroke)
1. Click `Paint Tile`.
2. Click one tile cell on canvas.
3. Click-drag across several cells to paint a short line.
4. Switch to `Erase Tile`.
5. Click-drag back across part of the painted area.
6. Expected:
   - Paint appears where you drag.
   - Erase removes only targeted cells.
   - No random gaps or skipped cells during normal drag speed.

### 5. Playtest Lifecycle
1. Press `F5` (or click `Playtest`).
2. Confirm mode shows Playtest.
3. Click `Pause`, then `Resume`.
4. Click `Pause`, then `Step` once.
5. Click each speed button (`1x`, `0.5x`, `0.25x`).
6. Click viewport zoom buttons (`Fit`, `2x View`, `3x View`, `4x View`).
7. Confirm the viewport becomes large enough to read comfortably without changing game logic scale.
8. Press `Esc` to exit playtest.
7. Expected:
   - Controls reflect current state correctly.
   - Frame/step metrics update.
   - Exit returns to edit mode cleanly.

### 6. Breakpoints + Trace
1. Enter playtest again.
2. Enable `Tick` breakpoint.
3. Resume simulation and wait for pause.
4. Confirm breakpoint hit status appears.
5. In trace panel, click filter chips (All/Breakpoints/etc.).
6. Click an event-kind chip in trace lines.
7. Expected:
   - Runtime pauses when breakpoint condition hits.
   - Trace list filters correctly and remains readable.

### 7. Watch Panel Filters
1. Select an entity.
2. In watch panel, switch filters:
   - `All` -> `Flags` -> `Vars` -> `Inventory`.
3. Confirm global and selected sections change as expected.
6. Expected:
   - Filter output matches selected tab.
   - No empty/broken rendering unless data is truly absent.

### 8. Keyboard UX
1. In edit mode press:
   - `V` for Select
   - `B` for Paint
   - `E` for Erase
2. Use undo/redo shortcuts.
3. Use `Delete` on selected entity.
4. Expected:
   - Tool HUD matches shortcut used.
   - Shortcuts do not trigger the wrong tool/action.

### 9. Multi-Tab Isolation Check
1. Open the app in tab A and tab B.
2. In tab A, add one entity.
3. In tab B, open project and check entity list.
4. Add one entity in tab B.
5. Expected:
   - Each tab keeps its own fallback/session state for now.
   - Actions in one tab do not unexpectedly mutate the other tab state.

### 10. Save/Open Confidence Pass
1. Make a few edits (entity + tiles).
2. Click `Save`.
3. Click `Open` again.
4. Expected:
   - App does not error.
   - State/metadata remains coherent after save/open cycle.

### 11. Script Lab Validation
1. Click `Open`.
2. In `Script Lab`, paste this JSON:
```json
{
  "nodes": [{ "id": "event_start", "kind": "event" }],
  "edges": [{ "from": "event_start", "to": "action_missing" }]
}
```
3. Click `Validate Graph`.
4. Expected:
   - Script summary shows `1 issue(s) found.`
   - Issues Drawer includes `Script missing_target_node`.
   - App remains responsive and no mode/tool state is lost.

### 12. Script Lab Template Flow
1. In `Script Lab`, choose `Quest Trigger` template.
2. Click `Use`.
3. Confirm summary says the graph is valid.
4. In `Save As`, enter `Quest Fast Start`.
5. Click `Save`.
6. Confirm template dropdown now includes `Quest Fast Start (Custom)`.
7. Expected:
   - Applying a template fills the JSON editor with valid graph content.
   - Saving creates a reusable custom template option in the same session and future reloads.

### 13. Script Lab One-Click Auto-Fix
1. In `Script Lab`, paste:
```json
{
  "nodes": [{ "id": "event_start", "kind": "event" }],
  "edges": [{ "from": "event_start", "to": "action_missing" }]
}
```
2. Click `Validate Graph`.
3. In Issues Drawer, click `Auto-fix` next to the `missing_target_node` issue.
4. Expected:
   - Script summary changes to `Script graph is valid.`
   - Missing-target issue disappears.
   - Graph editor now includes the missing node.

### 14. Draw Seed Starter Presets (Recognizable Shapes)
1. Open `Draw` tab.
2. Click quick silhouette buttons: `Tree`, `Bush`, `Rock`.
3. Confirm each quick button updates the 8x8 seed canvas + preview list immediately.
4. In preset dropdown, pick each built-in preset: `tree`, `bush`, `rock`, `crate`, `chest`.
5. Click `Apply` and inspect the 8x8 seed canvas + preview list.
4. Expected:
   - Presets look like intentional gameplay props, not random noise.
   - Preview updates consistently and stays within bounds.
   - `Apply Draft To Map` creates matching entity/tile placement without errors.

### 15. Export Lane Clarity (UI Copy)
1. Open workspace and go to `Quick Start` panel.
2. Confirm export-lane hint text is visible near walkthrough controls.
3. Complete a walkthrough and trigger `Export Preview (Authored)`.
4. Check log console.
5. Expected:
   - Hint text clearly states editor export is authored lane and CLI/CI parity lane is canonical.
   - Log line includes lane label (`desktop authored lane` or `web fallback lane`).

### 16. Puzzle Starter Script Scaffold (Sokoban Baseline)
1. Set `Starter Template` to `Puzzle Starter`.
2. Click `New`.
3. Switch right panel to `Script`.
4. Verify script graph JSON includes:
   - `event_move_input`
   - `action_push_crate`
5. Expected:
   - Puzzle starter loads with player and puzzle tiles.
   - Script Lab starts from puzzle-relevant logic instead of generic starter event graph.

### 17. Template Catalog Sanity
1. Review the launch dashboard template gallery.
2. Confirm every card renders a title, ETA, difficulty/em label, and summary from the shared catalog.
3. Click each card, ensure the `Starter Template` select updates, then click `New`.
4. Expected:
   - Dropdown and cards remain in sync with the catalog metadata.
   - Selecting via either surface keeps template state consistent.

### 18. Recent Projects Scaling
1. Seed `gcs.dashboard.recent_projects.v1` with 50+ entries via the browser console (or run the heavy-case script from the smoke test).
2. Reload the dashboard.
3. Confirm only 8 entries appear, sorted newest-first.
4. Click the first entry and verify the log contains `Dashboard: opened recent project (...)`.
5. Expected:
   - Invalid rows (blank/whitespace dirs) are filtered.
   - List enforces the 8-entry cap and keeps the newest entry at the top.

## UX Quality Checks (quick, subjective but important)
Run these after the core smoke:
1. Is any button label unclear for a beginner?
2. Is any workflow taking more clicks than expected?
3. Does anything feel visually misaligned or jumpy?
4. Is there any action where you are unsure what happened?
5. Are errors/warnings understandable and actionable?

If you answer “yes” to any, record a `NOTE` entry with exact area and suggestion.

## Priority Failure Severity
- `P0`: Data loss, crash, unusable app.
- `P1`: Core flow broken (create/edit/playtest/save).
- `P2`: Feature works but with serious friction/confusion.
- `P3`: Minor polish issues (spacing, wording, small visual defects).

## What To Do When You Find A Problem
1. Write a short repro with numbered steps.
2. Include expected vs actual behavior.
3. Mark severity (`P0`..`P3`).
4. Add to `docs/KNOWN_ISSUES.md` (or send to me and I'll patch + document).

## Running Log
Use this section as a lightweight running journal.

### Run 2026-02-13 (Template)
- Tester:
- Scope: Core smoke walkthrough
- Result summary:
  - PASS:
  - FAIL:
  - NOTE:
- Follow-ups:
