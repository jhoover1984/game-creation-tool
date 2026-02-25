# Manual QA Checklist

Last updated: 2026-02-25
Purpose: Authoritative, repeatable browser QA runbook for V2 UI/UX changes.
Owner: Repository owner (UI Editor package).

## When This Is Required

Run this checklist before merging any PR that touches:
- Shell layout or navigation
- Canvas framing or viewport behavior
- Inspector rendering or panel visibility
- Playtest controls or HUD presentation
- Onboarding UX or dashboard overlays

Corresponds to the `Full QA` PR level in `docs/runbooks/GitHub Workflow (Solo).md`.

## Pass/Fail Policy

- **Pass**: All test cases pass at all required resolutions.
- **Pass with follow-ups**: All cases pass; non-blocking defects logged in the Defect Log below.
- **Fail**: Any blocker or high-severity defect. PR must not merge until resolved.

---

## Launch and Access (Required)

1. Open PowerShell in repo root:
   - `cd "C:\Users\cresc\Desktop\Projects\Game Creation Tool\v2"`
2. Install deps (first run or after lockfile changes):
   - `npm install`
3. Start dev server:
   - `npm run dev`
4. Open editor in browser:
   - `http://localhost:4173/ui-editor/src/app.html`
5. Do **not** use:
   - `file://.../app.html` (unsupported for QA)
6. If port 4173 is busy:
   - `Get-NetTCPConnection -LocalPort 4173`
   - `Stop-Process -Id <PID> -Force`
   - restart `npm run dev`

---

## Prerequisites

1. Branch CI is green (`npm run ci` passes in `v2/`).
2. App is running via dev server at `http://localhost:4173/ui-editor/src/app.html` (see Launch and Access above).
3. Browser: Chrome or Edge required. Chrome preferred.
4. OS: Windows primary. Linux/macOS informational only.
5. Browser zoom: 100%. Do not use browser zoom during testing.

---

## Test Environments

Required resolutions for layout/framing tests (marked **[ALL RES]** in each case):

| Resolution  | How to set                                     |
|-------------|------------------------------------------------|
| 1366x768    | DevTools > Device emulation, or OS window drag |
| 1920x1080   | Default for functional tests                   |
| 2560x1440   | DevTools > Device emulation, or second monitor |

Functional tests (not marked **[ALL RES]**) run once at 1920x1080.

---

## Preflight

Complete before running any test case.

1. Record the git commit SHA under test: `git rev-parse --short HEAD`. Include in Signoff notes.
2. Open a clean browser profile or clear `localStorage` for the app origin (`http://localhost:4173`).
3. Set browser window to 1920x1080, zoom 100%.
4. Navigate to `http://localhost:4173/ui-editor/src/app.html`.
5. Wait for the shell to fully render: canvas grid visible, header controls responsive.
6. Confirm CI status: `cd v2 && npm run ci` passed on this branch.
7. Note any console errors on load in the browser DevTools console. Log under TC-02 if unexpected.

---

## Run Artifact Storage

Store QA artifacts under `v2/docs/qa/`:
- Checklist run copies: `v2/docs/qa/runs/`
- Screenshots/evidence: `v2/docs/qa/evidence/`

Create one run folder per QA execution:
- `v2/docs/qa/evidence/YYYY-MM-DD-<topic>-<sha>/`

Create one checklist copy per run:
- `v2/docs/qa/runs/qa-run-YYYY-MM-DD-<topic>-<sha>.md`

PowerShell example (run from repo root):

```powershell
$date = Get-Date -Format "yyyy-MM-dd"
$topic = "ui-shell-polish"
$sha = git rev-parse --short HEAD
$runFile = "v2/docs/qa/runs/qa-run-$date-$topic-$sha.md"
$evidenceDir = "v2/docs/qa/evidence/$date-$topic-$sha"
Copy-Item "v2/docs/runbooks/Manual QA Checklist.md" $runFile
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
```

Use these screenshot filenames inside the run evidence folder:
- `qa-shell-1366x768.png`
- `qa-shell-1920x1080.png`
- `qa-shell-2560x1440.png`
- `qa-starter-scene.png`
- `qa-playtest-hud.png`

---

## Test Cases

---

### SH-01 -- Top bar visibility [ALL RES]

**Area:** Shell layout

**Setup:** Fresh load at each required resolution.

**Steps:**
1. Set browser to 1366x768. Open app.html. Wait for shell to render.
2. Scan the full header bar from left to right without scrolling.
3. Repeat at 1920x1080.
4. Repeat at 2560x1440.

**Expected:**
All of the following controls are visible and not clipped at every resolution:
New, Save, Load, Undo (disabled on fresh load), Redo (disabled), Add Starter Scene (filled/primary style button), Add Player (outline/secondary style button), Play, Pause, Step, Interact, Fit, Playtest HUD area.
No button text is truncated. No control requires scrolling to reach.

**Evidence:** Screenshot at each resolution -- save as `qa-shell-1366x768.png`, `qa-shell-1920x1080.png`, `qa-shell-2560x1440.png`.

**Result:**
- 1366x768: Pass / Fail
- 1920x1080: Pass / Fail
- 2560x1440: Pass / Fail

---

### SH-02 -- Left rail tabs

**Area:** Shell layout

**Setup:** Fresh load at 1920x1080. Continue from SH-01 if possible.

**Steps:**
1. Open app.html.
2. Locate the left rail column.
3. Count and read all visible tab buttons in the tab bar.

**Expected:**
Left rail is visible. Tab bar contains exactly 9 tabs: Tasks, Console, Story, Getting Started, Behavior, Sprite, Effects, Export, Animation.
All tabs visible without scrolling or wrapping in a way that hides any tab.
Active tab has a visible accent indicator (underline or color change).

**Evidence:** Screenshot (can share `qa-shell-1920x1080.png` from SH-01).

**Result:** Pass / Fail

---

### SH-03 -- Inspector empty state

**Area:** Inspector panel

**Setup:** Fresh load. No entity selected.

**Steps:**
1. Open app.html.
2. Click on a blank area of the canvas that contains no entity.
3. Observe the right inspector panel.

**Expected:**
Inspector panel is visible on the right side of the shell.
Panel contains readable empty-state copy (not a blank white box).
No entity fields are shown.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### SH-04 -- Footer project info

**Area:** Footer

**Setup:** Fresh load.

**Steps:**
1. Open app.html.
2. Scroll to the bottom of the shell and locate the footer bar.

**Expected:**
Footer shows the project name (e.g. "untitled") and map dimensions (e.g. "64 x 36").

**Evidence:** Visual.

**Result:** Pass / Fail

---

### SH-05 -- Quick action button hierarchy

**Area:** Header button order and style

**Setup:** Fresh load.

**Steps:**
1. Open app.html.
2. Locate the two quick-action buttons in the header area.
3. Check visual style and left-to-right order.

**Expected:**
"Add Starter Scene" is the leftmost of the pair and uses a filled/solid background (primary button style).
"Add Player" is immediately to its right and uses an outline/border-only style (secondary button style).

**Evidence:** Visual. Zoom into header area of `qa-shell-1920x1080.png` if needed.

**Result:** Pass / Fail

---

### CV-01 -- No right-edge clipping [ALL RES]

**Area:** Canvas framing

**Setup:** Fresh load at each required resolution. DevTools open to verify resolution.

**Steps:**
1. Set browser to 1366x768. Open app.html. Wait for layout to stabilize (~2s).
2. Examine the right edge of the canvas: the narrow gap between the canvas and the inspector panel.
   The canvas has a 2px inset box-shadow acting as a border. Confirm this shadow is fully visible on all four sides of the canvas.
3. Look specifically for the right-side shadow: it must not be hidden behind the inspector panel.
4. Repeat steps 1-3 at 1920x1080.
5. Repeat steps 1-3 at 2560x1440.

**Expected:**
At every required resolution, the 2px inset box-shadow border on the canvas right edge is fully visible.
The canvas does not extend past the boundary of the canvas-stage area.
No pixel of the canvas edge is obscured by the inspector or clipped by the window.

**Evidence:** Screenshot at each resolution focused on the canvas-inspector boundary.
Save as `qa-shell-1366x768.png` (right-edge visible), `qa-shell-1920x1080.png`, `qa-shell-2560x1440.png`.

**Result:**
- 1366x768: Pass / Fail
- 1920x1080: Pass / Fail
- 2560x1440: Pass / Fail

---

### CV-02 -- Startup fit and centering [ALL RES]

**Area:** Canvas framing, viewport

**Setup:** Clear localStorage (or use fresh incognito window). Set to each required resolution.

**Steps:**
1. Clear localStorage for the app (or open in incognito). Set browser to 1920x1080.
2. Open app.html. Wait approximately 2 seconds for the deferred fit to run.
3. Observe the canvas position within the canvas-stage area.
4. Repeat at 1366x768.
5. Repeat at 2560x1440.

**Expected:**
At 1920x1080 and 2560x1440 (wide): canvas is upscaled (zoom > 1) to fill most of the canvas-stage. No unusually large empty margins on any side.
At 1366x768 (compact): canvas may scale down if window is narrow; canvas is centered in the stage.
In all cases: no clipping, no misalignment, canvas visually centered.

**Evidence:** Screenshot. Use `qa-shell-1920x1080.png`.

**Result:**
- 1366x768: Pass / Fail
- 1920x1080: Pass / Fail
- 2560x1440: Pass / Fail

---

### CV-03 -- Fit after load

**Area:** Canvas framing, viewport

**Setup:** 1920x1080. A saved project file available (any `.json` previously exported via Save).

**Steps:**
1. Click Load in the header.
2. Select a project file when prompted.
3. Wait for project to fully load (canvas redraws, status bar updates).
4. Click the Fit button in the header.

**Expected:**
Canvas rescales and centers to show the full loaded map within the canvas-stage.
No clipping at any edge after the fit operation.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### CV-04 -- Fit after Apply Map

**Area:** Canvas framing, viewport

**Setup:** 1920x1080. Fresh or loaded project.

**Steps:**
1. In the toolbar, change Map W to 32 and Map H to 18.
2. Click Apply Map.
3. Wait for canvas to re-render.
4. Observe canvas position.

**Expected:**
Viewport re-fits to the new 32x18 map dimensions.
Canvas rescales and centers within canvas-stage.
No clipping on any edge.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### CV-05 -- Resize no-clip

**Area:** Canvas framing, viewport

**Setup:** 1920x1080 with app.html fully loaded.

**Steps:**
1. Open app.html at 1920x1080. Confirm map is visible.
2. Slowly drag the right browser window edge inward, reducing width to approximately 1200px.
3. Pause and check the canvas right edge (CV-01 check).
4. Continue dragging to approximately 900px width.
5. Pause and check the canvas right edge again.
6. Restore window to 1920x1080.

**Expected:**
At no window width does the canvas right edge clip against the inspector panel or browser edge.
The 2px inset shadow remains visible on all four canvas sides throughout the resize.
The inspector panel does not overlap the canvas at any width.

**Evidence:** Visual. Screenshot at ~900px width optional.

**Result:** Pass / Fail

---

### SF-01 -- Add Starter Scene

**Area:** Starter flow

**Setup:** 1920x1080. Blank project (fresh load or click New and dismiss any dialog).

**Steps:**
1. Confirm canvas is blank (no tiles, no entities).
2. Click "Add Starter Scene" in the header.
3. Wait for canvas to update (~0.5s).
4. Observe canvas content, inspector, and console.

**Expected:**
- A horizontal strip of ground tiles is painted near the bottom of the map (approximately second-to-last row from the bottom).
- One entity (named "Player") is spawned approximately one tile above the ground strip, near the horizontal center of the map.
- The Player entity is automatically selected: visible selection highlight on canvas; inspector on right shows entity fields.
- Console tab shows a log entry confirming the action.

**Evidence:** Screenshot saved as `qa-starter-scene.png`.

**Result:** Pass / Fail

---

### SF-02 -- Player visible after starter

**Area:** Starter flow, canvas rendering

**Setup:** Continue from SF-01 (starter scene just created).

**Steps:**
1. After "Add Starter Scene" completes, observe the canvas.
2. Look for the Player entity tile with a selection highlight.
3. Glance at the right inspector panel.

**Expected:**
Player entity tile visible on canvas with a clear selection indicator (e.g. colored outline or highlight).
Inspector on the right shows entity fields for the selected Player entity (not empty state).

**Evidence:** Use `qa-starter-scene.png` from SF-01.

**Result:** Pass / Fail

---

### SF-03 -- Add Player alone

**Area:** Starter flow

**Setup:** 1920x1080. Click New in header to start a blank project. Dismiss dirty-state dialog if shown.

**Steps:**
1. Confirm canvas is blank.
2. Click "Add Player" in the header.
3. Observe canvas and inspector.

**Expected:**
- A single entity named "Player" is created at the horizontal and vertical center of the map.
- No ground tiles are painted (this action spawns only the entity).
- Player entity is auto-selected (selection highlight on canvas; inspector shows entity fields).
- Inspector shows `player` in the Tags field and the entity is marked as solid.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### IN-01 -- Inspector empty state

**Area:** Inspector

**Setup:** Fresh load or click blank canvas area to deselect any entity.

**Steps:**
1. Click on a blank canvas area that has no entity (empty tile).
2. Observe the right inspector panel.

**Expected:**
Inspector shows a non-blank descriptive empty-state message (e.g. "Select an entity to inspect its properties" or similar copy).
No entity fields, section foldouts, or input controls are shown.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### IN-02 -- Entity fields on selection

**Area:** Inspector

**Setup:** At least one entity on the canvas (use SF-01 or add one with Place Entity tool).

**Steps:**
1. Click an entity on the canvas.
2. Observe the right inspector panel.
3. Click through any collapsed section foldouts to open them.

**Expected:**
Inspector renders at minimum three collapsible sections: Transform (position x/y fields), Visual (sprite/animation fields), Metadata (id read-only, name editable, tags field).
Each section is a collapsible foldout that opens and closes when clicked.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### IN-03 -- Player Config section visible for player entity

**Area:** Inspector, player config

**Setup:** Starter scene created (SF-01) or "Add Player" used (SF-03). Player entity on canvas.

**Steps:**
1. Click the Player entity on the canvas to select it.
2. Scroll through all inspector sections.
3. Look for a section labeled "Player Config".

**Expected:**
A "Player Config" section is visible in the inspector.
Section contains a numeric input labeled "Speed (px/s)".

**Evidence:** Visual.

**Result:** Pass / Fail

---

### IN-04 -- No Player Config for non-player entity

**Area:** Inspector, player config

**Setup:** At least one entity without a `player` tag. Use Place Entity tool to add a new entity, or rename the player entity's tag.

**Steps:**
1. Select the Place Entity tool from the toolbar dropdown.
2. Click on the canvas to place a new entity.
3. Click the new entity to select it.
4. Scan all inspector sections.

**Expected:**
Inspector shows standard sections (Transform, Visual, Metadata).
"Player Config" section is NOT present.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### PT-01 -- Play starts playtest

**Area:** Playtest controls, HUD

**Setup:** Starter scene created (SF-01). Player entity on canvas.

**Steps:**
1. Click "Play" in the header.
2. Observe the Playtest HUD area in the header.
3. Observe the Play/Pause button states.

**Expected:**
HUD becomes visible (or updates) showing: playtest state (running), current tick number, player position (x/y coordinates or tile position).
Play button reflects active playtest state. Pause/Resume becomes the next logical action.
Canvas may show player animation or position change if speed is set.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### PT-02 -- Pause stops playtest

**Area:** Playtest controls, HUD

**Setup:** Playtest running (from PT-01).

**Steps:**
1. Note the current tick number shown in HUD.
2. Click "Pause" in the header.
3. Wait 1 second.
4. Check the tick number again.

**Expected:**
HUD shows paused state.
Tick number stops incrementing (same value after waiting 1 second).
Pause button reflects paused state; a Resume/Play action is available.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### PT-03 -- Step increments tick by one

**Area:** Playtest controls, HUD

**Setup:** Playtest paused (from PT-02).

**Steps:**
1. Note the exact tick number shown in HUD (e.g. tick 45).
2. Click "Step" once.
3. Read the new tick number in HUD.

**Expected:**
Tick number increments by exactly 1 (e.g. 45 -> 46).
If the player entity has a non-zero speed and is receiving move input, player position also updates.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### PT-04 -- HUD layout does not overlap controls [ALL RES]

**Area:** Playtest HUD layout

**Setup:** Playtest active (play or paused). Check at each required resolution.

**Steps:**
1. Ensure playtest is running or paused so HUD is visible.
2. Check HUD position at 1366x768.
3. Check HUD position at 1920x1080.
4. Check HUD position at 2560x1440.

**Expected:**
At all three resolutions: HUD text is readable in the header area.
HUD does not overlap or obscure other header controls (New, Save, Load, Undo, Redo, quick actions, Fit button).
All header controls remain clickable and not visually hidden.

**Evidence:** Screenshot saved as `qa-playtest-hud.png`.

**Result:**
- 1366x768: Pass / Fail
- 1920x1080: Pass / Fail
- 2560x1440: Pass / Fail

---

### PT-05 -- Interact button fires without error

**Area:** Playtest controls

**Setup:** Playtest running (from PT-01).

**Steps:**
1. With playtest running, click "Interact" in the header.
2. Click the "Console" tab in the left rail.
3. Read the most recent log entries.

**Expected:**
No uncaught errors thrown (check browser DevTools console as well).
Console tab shows a log entry related to the interact action.
Note: without a nearby interactable entity, the interaction may be a no-op -- this is acceptable as long as no error fires.

**Evidence:** Visual (Console tab).

**Result:** Pass / Fail

---

### OB-01 -- Onboarding checklist visible

**Area:** Onboarding

**Setup:** 1920x1080. Fresh load.

**Steps:**
1. Open app.html.
2. Click "Getting Started" tab in the left rail.
3. Read the panel content.

**Expected:**
Checklist panel is visible with a numbered list of onboarding steps.
"Add Starter Scene" CTA button is visible below or within the step list.
Steps not yet completed are shown in an incomplete state.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### OB-02 -- Checklist CTA creates starter scene and marks step

**Area:** Onboarding

**Setup:** Blank project. Getting Started tab open (OB-01 complete). No prior starter scene.

**Steps:**
1. Click "Add Starter Scene" button inside the Getting Started panel (not the header button).
2. Observe the canvas.
3. Observe the checklist step list.

**Expected:**
Same canvas result as SF-01: ground strip + player entity spawned and selected.
The checklist step for playable scene setup ("Set up a playable scene" or equivalent) is marked complete (checkmark or strike-through style).

**Evidence:** Visual.

**Result:** Pass / Fail

---

### OB-03 -- Flow hint appears after starter scene

**Area:** Onboarding

**Setup:** Getting Started tab open. Starter scene just created (OB-02 or SF-01).

**Steps:**
1. After starter scene creation, stay on the Getting Started tab (or re-click it).
2. Look for a hint/tip box below the checklist steps.

**Expected:**
A flow hint message is visible with copy guiding toward playtesting (e.g. "Ready to play? Press Play to start..." or similar).

**Evidence:** Visual.

**Result:** Pass / Fail

---

### OB-04 -- Flow hint dismisses and preference persists

**Area:** Onboarding, preference persistence

**Setup:** Flow hint visible (OB-03 complete).

**Steps:**
1. Click the dismiss or close control on the flow hint.
2. Observe: hint should disappear immediately.
3. Close the browser tab entirely.
4. Reopen `v2/packages/ui-editor/src/app.html` in a new tab.
5. Click the Getting Started tab.
6. Check if the flow hint is still dismissed or has reappeared.

**Expected:**
Step 2: hint disappears immediately after click.
Step 6: hint remains dismissed after page reload. Preference was saved to localStorage.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### TC-01 -- Tasks tab accessible in one click

**Area:** Tasks panel discoverability

**Setup:** 1920x1080. Fresh load.

**Steps:**
1. Open app.html.
2. Click "Tasks" tab button in the left rail.
3. Observe panel.

**Expected:**
Tasks panel becomes visible immediately in one click.
Panel shows either a diagnostic list (each item has severity, message) or an empty-state message ("No diagnostics..." or equivalent).
No secondary navigation required to reach the panel.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### TC-02 -- Console tab accessible in one click

**Area:** Console panel discoverability

**Setup:** 1920x1080. Fresh load.

**Steps:**
1. Open app.html.
2. Click "Console" tab button in the left rail.
3. Observe panel.

**Expected:**
Console panel becomes visible in one click.
Panel shows timestamped log lines from shell initialization (at minimum, one startup message).

**Evidence:** Visual.

**Result:** Pass / Fail

---

### TC-03 -- Diagnostic severity border accents

**Area:** Tasks panel, diagnostics

**Setup:** 1920x1080. A diagnostic must be triggered. Use one of these methods:
  - Option A: Use Place Entity tool and add entities until duplicate-name diagnostics appear in Tasks.
  - Option B: Use an invalid asset reference in the inspector visual fields (sprite/animation) to trigger asset-reference diagnostics.
  - Option C: Paint or move an entity beyond map bounds if exposed in current build.

**Steps:**
1. Trigger at least one diagnostic using the setup method above.
2. Click "Tasks" tab in the left rail.
3. Observe the diagnostic list items.

**Expected:**
Each diagnostic list item shows:
- Error or fatal severity: left border is colored with the error/red token color.
- Warning severity: left border is colored with the warning/amber token color.
The border color is distinct from the default item background.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### RG-01 -- Undo and redo for tile paint

**Area:** Undo/redo regression

**Setup:** 1920x1080. Fresh load or blank project.

**Steps:**
1. Select "Paint Tile" from the tool dropdown in the toolbar.
2. Click a canvas cell to paint a tile. Confirm the tile appears.
3. Press Ctrl+Z. Confirm the tile disappears.
4. Press Ctrl+Y. Confirm the tile reappears.
5. Check the Undo and Redo buttons in the header throughout.

**Expected:**
Step 2: tile appears on canvas.
Step 3: tile removed (undo). Redo button becomes enabled.
Step 4: tile restored (redo). Undo button still enabled.
Undo/Redo buttons reflect correct enabled/disabled state at each stage.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### RG-02 -- Keyboard hotkeys

**Area:** Hotkey regression

**Setup:** 1920x1080. Fresh load. Click on the canvas once to ensure keyboard focus is on the shell (not a text input).

**Steps:**
1. Press S. Check the tool dropdown value and canvas cursor.
2. Press P. Check the tool dropdown and cursor.
3. Press E. Check the tool dropdown and cursor.
4. With tool P active, click canvas to paint a tile.
5. Press Ctrl+Z (Undo). Confirm tile removed.
6. Press Ctrl+Y (Redo). Confirm tile restored.

**Expected:**
S: tool dropdown shows "select"; canvas cursor is a default pointer.
P: tool dropdown shows "paint"; canvas cursor is a crosshair.
E: tool dropdown shows "erase"; canvas cursor changes.
Steps 5-6: undo/redo behave as in RG-01.

**Evidence:** Visual.

**Result:** Pass / Fail

---

### RG-03 -- Visual token regression scan

**Area:** CSS token compliance, visual regression

**Setup:** Use screenshots from SH-01 (or take fresh at 1920x1080).

**Steps:**
1. Open app.html.
2. Visually scan the following areas for obvious color regressions:
   - Header buttons (primary filled, secondary outlined)
   - Toolbar inputs and dropdowns
   - Left rail tab buttons (active vs. inactive)
   - Left rail panel backgrounds
   - Right inspector panel and fields
   - Footer bar
3. Note any element that appears unstyled, wrong color, or using obviously raw values (e.g. bright blue links, black/white backgrounds where a themed color is expected).

**Expected:**
All controls use a consistent visual theme throughout.
No raw-color regressions visible (no bright-red backgrounds, no white-on-white text, no missing borders).
Primary buttons have solid fill; secondary buttons have outline style.

**Evidence:** Visual. Use `qa-shell-1920x1080.png` from SH-01.

**Result:** Pass / Fail

---

## Screenshot Evidence

Attach the following screenshots to the PR under a "Manual QA Evidence" section.

| Filename                   | Captured in | Content                                    |
|----------------------------|-------------|--------------------------------------------|
| `qa-shell-1366x768.png`    | SH-01/CV-01 | Full shell at 1366x768                     |
| `qa-shell-1920x1080.png`   | SH-01/CV-02 | Full shell at 1920x1080                    |
| `qa-shell-2560x1440.png`   | SH-01/CV-01 | Full shell at 2560x1440                    |
| `qa-starter-scene.png`     | SF-01       | Starter scene created (ground + player)    |
| `qa-playtest-hud.png`      | PT-04       | Playtest HUD active showing tick/position  |

---

## PR Evidence Sections

In `.github/PULL_REQUEST_TEMPLATE.md`, use:
- `## Testing Evidence`:
  - Commands run and results (for example `cd v2 && npm run ci`, `cd v2 && npm run check:ascii -- ...`)
- `## Risks / Follow-ups`:
  - Link any logged defects that were deferred

Add a separate heading in the PR description body:
- `## Manual QA Evidence`
  - Link the run copy file in repo (from `v2/docs/qa/runs/`)
  - Attach or link screenshots from `v2/docs/qa/evidence/...`
  - Paste final Signoff summary (tester/date/result)

Note: these are PR description sections, not commit names.

---

## Defect Log

Fill in if any issues are found during execution.

| ID | Severity             | Test Case | Repro Steps | Suspected File/Component | Fix PR |
|----|----------------------|-----------|-------------|--------------------------|--------|
|    | blocker/high/med/low |           |             |                          |        |

Severity guide:
- **Blocker**: Prevents core workflow. Must fix before merge.
- **High**: Significant regression or UX break. Fix before or immediately after merge.
- **Medium**: Noticeable but not workflow-blocking. Log as follow-up.
- **Low**: Minor visual or copy issue. Log as follow-up.

---

## Signoff

| Field  | Value                              |
|--------|------------------------------------|
| Tester |                                    |
| Date   |                                    |
| Result | Pass / Pass with follow-ups / Fail |
| Notes  |                                    |

---

## Rollout Policy

1. **First 2 UI PRs**: treat checklist as "required but learning" -- partial completion acceptable with notes.
2. **After 2 successful uses**: strictly required for all `Full QA` PRs.
3. **Monthly review**: remove dead steps, add missing regressions based on defects found.

## References

- `docs/runbooks/GitHub Workflow (Solo).md` -- branch model and PR level definitions
- `docs/runbooks/PR Governance Checklist.md` -- pre-PR hygiene requirements
- `docs/design/V2 UI Blueprint.md` -- as-built shell layout reference
