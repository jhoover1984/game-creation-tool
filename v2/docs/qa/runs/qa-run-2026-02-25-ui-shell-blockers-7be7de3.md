# QA Rerun: Blocker Fixes D-001 / D-002 / D-005a

**Rerun scope:** Targeted recheck of only the test cases that failed in
`qa-run-2026-02-24-ui-shell-polish-8483098.md`.
All other test cases from that run are considered **carry-over Pass** and are not re-executed.

**Branch under test:** `fix/ui-shell-polish-blockers`
**Supersedes (failed run):** `docs/qa/runs/qa-run-2026-02-24-ui-shell-polish-8483098.md`

---

## Preflight

1. `git rev-parse --short HEAD` -- record SHA here: `7be7de3` (rename this file to match)
2. `cd v2 && npm run ci` -- must be green before starting.
3. Dev server: `npm run dev` in `v2/`.
4. Open `http://localhost:4173/ui-editor/src/app.html` in Chrome at 100% zoom.

---

## Test Environments

Required resolutions for `[ALL RES]` cases:

| Resolution  | How to set                                      |
|-------------|-------------------------------------------------|
| 1366x768    | DevTools > Device > Responsive, set 1366 x 768  |
| 1920x1080   | DevTools > Device > Responsive, set 1920 x 1080 |
| 2560x1440   | DevTools > Device > Responsive, set 2560 x 1440 (real monitor preferred) |

---

## Test Cases

### SH-02 -- Left rail tabs

**Area:** Shell layout
**Fix under test:** D-001 -- `.tab-btn` flex basis 3-per-row + `white-space: normal`

**Setup:** Fresh load at 1920x1080.

**Steps:**
1. Open app.html at 1920x1080.
2. Locate the left rail column.
3. Count and read all visible tab labels in the tab bar.
4. Confirm "Getting Started" is readable (may wrap to 2 lines) and not truncated to a single letter.

**Expected:**
- Tab bar contains exactly 9 tabs: Tasks, Console, Story, Getting Started, Behavior, Sprite, Effects, Export, Animation.
- No tab label is a single character.
- All 9 tabs visible without horizontal scroll.
- Active tab has a visible accent underline.

**Evidence:** Screenshot `qa-shell-1920x1080.png`.

**Result:**
- 1920x1080: Pass

---

### CV-01 -- No right-edge clipping [ALL RES]

**Area:** Canvas framing
**Fix under test:** D-002 -- `FRAMING_MARGIN_PX=4` inset applied in `fitViewportToMap()`

**Setup:** Fresh load at each required resolution.

**Steps:**
1. Set browser to 1366x768. Open app.html. Wait ~2s for deferred fit.
2. Examine the right edge of the canvas. The canvas has a 2px inset box-shadow border.
   Confirm the shadow is fully visible on all four sides.
3. Repeat at 1920x1080.
4. Repeat at 2560x1440.

**Expected:**
At every resolution: the 2px inset box-shadow on the canvas right edge is fully visible.
The canvas does not extend to or past the canvas-stage boundary.

**Evidence:** `qa-shell-1366x768.png`, `qa-shell-1920x1080.png`, `qa-shell-2560x1440.png`.

**Result:**
- 1366x768: Pass
- 1920x1080: Pass
- 2560x1440: Pass (env limitation noted: monitor smaller than 2560x1440 so editor overflows screen; visual target under test -- canvas right-edge shadow -- passed)

---

### CV-02 -- Startup fit and centering [ALL RES]

**Area:** Canvas framing, viewport
**Fix under test:** D-002 -- margin-aware `fitToMap()`

**Setup:** Clear localStorage (incognito or DevTools > Application > Storage > Clear site data). Set to each resolution.

**Steps:**
1. Open app.html at 1920x1080 in incognito. Wait ~2s.
2. Observe canvas position: should be centered with a visible gap on all four sides (not flush to any edge).
3. Repeat at 1366x768.
4. Repeat at 2560x1440.

**Expected:**
- At 1920x1080 and wider: canvas upscaled (zoom > 1), visibly centered, no right-edge clip.
- At 1366x768: canvas scaled down and centered, no clipping.
- No edge of the canvas is hidden or cut off at any resolution.

**Evidence:** `qa-shell-1920x1080.png` (or separate screenshot per resolution).

**Result:**
- 1366x768: Pass
- 1920x1080: Pass
- 2560x1440: Pass

---

### CV-05 -- Resize no-clip

**Area:** Canvas framing, viewport
**Fix under test:** D-002 -- margin applied on every `fitViewportToMap()` call (including resize)

**Setup:** App loaded at 1920x1080.

**Steps:**
1. Open app.html at 1920x1080. Confirm canvas visible and centered.
2. Drag browser window edge inward to approximately 1200px wide.
3. Check canvas right edge -- the 2px inset shadow must remain visible.
4. Continue dragging to approximately 900px wide.
5. Check canvas right edge again.
6. Restore to 1920x1080.

**Expected:**
At no intermediate width does the canvas right edge clip or disappear.
The 2px inset shadow remains visible on all four sides throughout the resize.

**Evidence:** Screenshot at ~900px width -- `qa-900px-window.png` (optional but recommended).

**Result:** Pass at ~1200px and ~900px per test scope (steps 2-5). Extreme widths narrower than ~900px show canvas scaling degradation and grid rendering artefacts -- out of scope for D-002 (separate follow-up).

---

### PT-01 -- Play starts playtest with live HUD

**Area:** Playtest controls, HUD
**Fix under test:** D-005a -- rAF run loop started on Play; HUD updates each frame

**Setup:** Click "Add Starter Scene" in header. Player entity on canvas.

**Steps:**
1. Click "Play" in the header.
2. Watch the Playtest HUD in the header for ~2 seconds.

**Expected:**
- HUD shows `Playtest: running, tick=N, player=(X,Y)` (values visible within ~1 second).
- Tick number is greater than 0 and increasing each frame.
- `player=(X,Y)` coordinates are shown (position will NOT change -- keyboard movement is out of scope for this fix; position visible = Pass).

**Evidence:** Screenshot of HUD with tick and player visible -- `qa-playtest-hud.png`.

**Result:** Pass

---

### PT-02 -- Pause stops HUD updates; retains last tick

**Area:** Playtest controls, HUD
**Fix under test:** D-005a -- `stopPlayLoop()` preserves `lastPlaySnap` in HUD on Pause

**Setup:** Playtest running from PT-01 with tick > 0 visible in HUD.

**Steps:**
1. Note the current tick number in HUD (e.g. `tick=47`).
2. Click "Pause".
3. Wait 1 full second.
4. Read the tick number in HUD again.

**Expected:**
- HUD after Pause shows the last known tick value (e.g. `tick=47`), NOT just `Playtest: paused`.
- Tick value does NOT increment while paused.
- `player=(X,Y)` remains visible (not cleared on Pause).

**Evidence:** Visual (share `qa-playtest-hud.png` or separate).

**Result:** Pass

---

### PT-03 -- Step from paused state increments tick by exactly 1

**Area:** Playtest controls, HUD
**Fix under test:** D-005a -- `stepPlaytest()` + HUD update path from paused state

**Setup:** Playtest paused from PT-02, tick value visible in HUD.

**Steps:**
1. Read the exact tick number in HUD (e.g. `tick=47`).
2. Click "Step" once.
3. Read the new tick number in HUD.

**Expected:**
- Tick increments by exactly 1 (e.g. `tick=47` -> `tick=48`).
- `player=(X,Y)` remains visible.
- NOTE: Player will not move (movement requires keyboard wiring, deferred to D-005b).

**Evidence:** Visual.

**Result:** Pass

---

## Screenshot Checklist

| Filename                | Required                          | Captured |
|-------------------------|-----------------------------------|----------|
| qa-shell-1366x768.png   | Yes (SH-02, CV-01, CV-02)         | Yes      |
| qa-shell-1920x1080.png  | Yes (SH-02, CV-01, CV-02)         | Yes      |
| qa-shell-2560x1440.png  | Yes (CV-01, CV-02)                | Yes      |
| qa-playtest-hud.png     | Yes (PT-01, PT-02)                | Yes      |
| qa-900px-window.png     | Optional (CV-05)                  | No       |

Evidence folder: `v2/docs/qa/evidence/2026-02-25-ui-shell-blockers-7be7de3/`
(Create with: `New-Item -ItemType Directory -Force -Path "v2/docs/qa/evidence/2026-02-25-ui-shell-blockers-7be7de3"`)

---

## Defect Status

| ID     | Original Severity | Status                  | Notes                                           |
|--------|-------------------|-------------------------|-------------------------------------------------|
| D-001  | high              | Fixed -- verified in rerun | CSS-only: flex basis 3-per-row + normal whitespace |
| D-002  | high              | Fixed -- verified in rerun | `FRAMING_MARGIN_PX=4` + ResizeObserver debounce |
| D-005a | high              | Fixed -- verified in rerun | rAF run loop; player movement deferred (D-005b) |
| D-007  | medium            | Closed discoverability  | Test confirms `moveEntity` fires on Apply       |
| D-005b | medium            | Open -- deferred        | Keyboard movement wiring; separate PR           |
| D-008  | low               | Open -- deferred        | Spawn alignment; separate PR                    |
| D-009  | low               | Open -- deferred        | Tags discoverability; separate PR               |

---

## Signoff

| Field  | Value |
|--------|-------|
| Tester | Josh  |
| Date   | 2/25/26   |
| Result | Pass      |
| Notes  | SHA under test: `7be7de3`. Targeted rerun of SH-02, CV-01/02/05, PT-01/02/03. All other cases carry-over Pass from run 8483098. |
