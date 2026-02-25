# QA Run: UX Follow-ups D-005b / D-008 / D-009

**Branch under test:** `fix/ui-shell-followups-d005b-d008-d009`
**SHA:** `6c1fdca`
**Date:** 2026-02-25
**Defects under test:** D-005b (keyboard movement), D-008 (spawn alignment), D-009 (tags discoverability)

---

## Preflight

1. `git rev-parse --short HEAD` -- `6c1fdca`
2. `cd v2 && npm run ci` -- must be green before starting.
3. Dev server: `npm run dev` in `v2/`.
4. Open `http://localhost:4173/ui-editor/src/app.html` in Chrome at 100% zoom.

---

## Test Cases

### PT-04 -- Keyboard movement during playtest

**Area:** Playtest controls, player movement
**Fix under test:** D-005b -- Arrow/WASD keys wired to `pendingMoveX`/`pendingMoveY`; passed into `setInput()` each frame.

**Setup:** Click "Add Starter Scene" in header. Player entity on canvas.

**Steps:**
1. Click "Play".
2. Confirm HUD shows `Playtest: running, tick=N, player=(X,Y) | Arrows/WASD: move`.
3. Press and hold ArrowRight.
4. Watch HUD `player=(X,Y)` -- X coordinate should increase each frame.
5. Release ArrowRight. X should stop changing.
6. Press ArrowLeft -- X should decrease.
7. Press W/A/S/D -- should behave identically to arrow keys.
8. Click Pause. Movement should stop.

**Expected:**
- HUD shows `| Arrows/WASD: move` hint while running.
- Holding ArrowRight/d increments player X each tick.
- Holding ArrowLeft/a decrements player X each tick.
- Holding ArrowUp/w decrements player Y each tick.
- Holding ArrowDown/s increments player Y each tick.
- Movement stops immediately on Pause.
- In editor mode (playtest stopped), S/P/E tool shortcuts still work normally.

**Evidence:** Screenshot of HUD showing movement and hint -- `qa-d005b-movement.png`.

**Result:** [x] Pass / [ ] Fail - initial run: Fail (no movement). Root cause: movement keys were placed after the INPUT-focus early-return guard in keydownHandler; inspector field retaining focus silently swallowed all movement keys. Fix: hoisted movement block before the guard + blur activeElement on Play/Resume. Rerun: Pass.

---

### PT-05 -- HUD hint absent when not running

**Area:** Playtest controls, HUD
**Fix under test:** D-005b -- hint only shown when `state === 'running'`

**Setup:** Playtest paused or stopped.

**Steps:**
1. Click "Play" then "Pause".
2. Read HUD text.

**Expected:**
- HUD shows last tick/position but does NOT contain `Arrows/WASD: move` when paused.

**Result:** [x] Pass / [ ] Fail

---

### SP-01 -- Player spawn tile alignment

**Area:** Starter scene, entity placement
**Fix under test:** D-008 -- spawn uses `Math.floor(dim / 2 / tileSize) * tileSize`

**Setup:** Fresh load (clear localStorage).

**Steps:**
1. Click "Add Starter Scene".
2. Click the Player entity to select it.
3. Open the Entity Inspector (right rail).
4. Read `Position X` and `Position Y` values.
5. Verify both are multiples of 16 (the default tileSize).

**Expected:**
- Position X is a multiple of 16 (e.g. 512, 496, 256 -- NOT 504 or similar non-aligned values).
- Position Y is a multiple of 16.

**Evidence:** Screenshot of inspector showing aligned position -- `qa-d008-spawn.png`.

**Result:** [x] Pass / [ ] Fail

---

### SP-02 -- Add Player button tile alignment

**Area:** Toolbar, entity placement
**Fix under test:** D-008 -- `createPlayablePlayer()` spawn also tile-aligned

**Setup:** Fresh load, no starter scene.

**Steps:**
1. Click "Add Player" button in toolbar (if present without starter scene) OR add a scene then add a new player.
2. Select the resulting Player entity.
3. Read Position X and Y in inspector.
4. Verify both are multiples of 16.

**Expected:**
- Position X and Y both multiples of 16.

**Result:** [x] Pass / [ ] Fail

---

### EI-04 -- Tags section in entity inspector

**Area:** Entity inspector, discoverability
**Fix under test:** D-009 -- read-only Tags `<details>` section added to `refresh()`

**Setup:** Any entity selected.

**Steps:**
1. Click the Player entity on canvas.
2. Open Entity Inspector (right rail).
3. Look for a "Tags" section (should be open by default).
4. Confirm it shows `player` (or the entity's actual tags).
5. Click a wall tile entity (if any) -- Tags section should show `(none)` or relevant tags.

**Expected:**
- Tags section is visible and open by default immediately after selecting an entity.
- Player entity shows `player` in the tags list.
- Entity with no tags shows `(none)`.
- Tags section is read-only (no input field or Apply path for tags).

**Evidence:** Screenshot of inspector with Tags section visible -- `qa-d009-tags.png`.

**Result:** [x] Pass / [ ] Fail NOTE: observed that entity undo and entity delete appear non-functional -- logged as D-010 (separate defect, out of D-009 scope).

---

## Screenshot Checklist

| Filename               | Required | Captured |
|------------------------|----------|----------|
| qa-d005b-movement.png  | Yes      |    Yes   |
| qa-d008-spawn.png      | Yes      |    Yes   |
| qa-d009-tags.png       | Yes      |    Yes   |

Evidence folder: `v2/docs/qa/evidence/2026-02-25-ux-followups-6c1fdca/`

---

## Defect Status

| ID     | Original Severity | Status                   | Notes                                                                 |
|--------|-------------------|--------------------------|-----------------------------------------------------------------------|
| D-005b | medium            | Fixed -- verified in rerun | Root cause: input-focus guard swallowed movement keys; fix hoists block before guard + blur on play/resume |
| D-008  | low               | Fixed -- verified in rerun | Spawn tile-aligned in both starter and add-player                   |
| D-009  | low               | Fixed -- verified in rerun | Read-only Tags section in inspector                                 |
| D-010  | medium            | Open -- deferred         | Entity undo and entity delete non-functional; observed during EI-04 step; separate PR |

---

## Signoff

| Field  | Value        |
|--------|--------------|
| Tester | Josh         |
| Date   | 2026-02-25   |
| Result | Pass         |
| Notes  | D-005b required a second fix (guard ordering) after initial run; all three defects verified fixed on rerun. D-010 (entity undo/delete) logged as new deferred defect. |
