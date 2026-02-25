# UI Zone Contract

**Version**: 1.0
**Date**: 2026-02-19
**Status**: Active — freeze before any structural UI changes

This document defines the ownership and responsibility of each UI zone. Changes to zone scope require updating this document first.

---

## Zones

### App Bar
**Element IDs**: `appBar`, `projectNameInput`, `saveBtn`, `playtestBtn`, `playtestStopBtn`
**CSS class**: `.app-bar`
**Owns**:
- Project identity (name, profile/visual style)
- Global persistence actions (save, undo/redo at top level)
- Playtest lifecycle controls (enter, stop, speed, pause)
- Help / settings access

**Does NOT own**: map-editing tools, entity properties, scene selection

---

### Tool Bar
**Element IDs**: `toolbarPaint`, `toolbarErase`, `toolbarFill`, `toolbarSelect`, `mapZoomFitBtn`, `mapZoom1xBtn`, `mapZoom2xBtn`, `mapZoom3xBtn`, `overlayGridBtn`, `overlayCollisionBtn`, `overlayIdsBtn`
**CSS class**: `.toolbar`
**Owns**:
- Active map editing tool (paint, erase, fill, select)
- Map viewport zoom level
- Canvas diagnostic overlays (grid, collision, IDs)

**Does NOT own**: playtest controls, entity creation, scene switching

**Keyboard shortcuts** (`ui-editor-input.js` owns these):
- `P` → paint, `E` → erase, `F` → fill, `S` → select
- `1/2/3` → zoom 1×/2×/3×, `0` → fit

---

### Left Panel
**Element IDs**: `sceneList`, `sceneAddBtn`, `entityList`, `entityAddBtn`
**CSS class**: `.panel-left`
**Owns**:
- Scene tree (list, add, rename, delete scenes)
- Entity list (list, add, select entities for map placement)

**Does NOT own**: entity property editing, tile palette, onboarding content, workspace status

**Note**: Quick Start, Guided Walkthrough, Project Health, and Workspace Mode sections are NOT left panel content. They belong to a Help overlay (see below).

---

### Canvas (Center)
**Element IDs**: `canvasSurface`, `tileLayer`, `entityLayer`, `diagnosticLayer`, `strokePreviewLayer`
**CSS class**: `.map-viewport`, `.canvas-surface`
**Owns**:
- World-space tile and entity rendering
- Pointer interaction (paint, drag, select)
- Game-screen boundary overlay (Phase 4)
- Zoom/pan state (via `ui-map-viewport.js`)

**Does NOT own**: UI controls, inspector fields, palette selection

**Coordinate model**: World-space. Entity positions are logical pixels; canvas is scaled via `--map-zoom-scale`. Game screen boundary is shown as a dashed overlay, not a hard canvas edge.

---

### Right Panel (Inspector)
**Element IDs**: `inspectorPanel`, `entityNameInput`, `entityXInput`, `entityYInput`, `entityComponentsList`, `tilePropertiesPanel`
**CSS class**: `.panel-right`
**Owns**:
- Properties of the currently selected entity or tile
- Component add/remove for selected entity
- Tile metadata display

**Does NOT own**: tile palette/color picker, scene selection, map tools

---

### Tile Palette
**Element IDs**: `tilePalettePanel`, `paletteColorList`, `selectedTileDisplay`
**CSS class**: `.tile-palette`
**Owns**:
- Available tile types for the current visual style
- Active tile selection (color/type to paint with)

**Does NOT own**: paint brush logic (Tool Bar owns active tool), entity palette

---

### Bottom Bar / Log
**Element IDs**: `statusBar`, `logPanel`, `logOutput`
**CSS class**: `.status-bar`, `.log-panel`
**Owns**:
- Playtest log output
- Status messages (save confirmation, errors)
- Breakpoint/trace output during playtest

**Does NOT own**: controls of any kind

---

### Help Overlay (future — Phase 2 output)
**Trigger**: `helpBtn` in App Bar
**Owns**:
- Quick Start walkthrough
- Guided Walkthrough
- Project Health / diagnostics
- Workspace Mode explanation

**Not a permanent panel.** Rendered as a modal/overlay on demand.

---

## Cross-Zone Rules

1. **No zone renders content it doesn't own.** If onboarding content appears in the left panel, that is a bug.
2. **Keyboard shortcuts are centralized** in `ui-editor-input.js`. Zones do not add their own `keydown` listeners unless the scope is explicitly local (e.g., an input field).
3. **Element IDs are the public API.** Changing an element ID requires updating `ui-shell-elements.js` and this document in the same commit.
4. **Panel collapse state** is managed by `ui-layout-panels.js` via `body.panel-left-collapsed` and `body.panel-right-collapsed` CSS classes. Do not manage collapse state elsewhere.
5. **CSS variables are the theming API.** Zones read `--tile-size`, `--map-zoom-scale`, `--left-panel-width`, `--right-panel-width` from the root. They do not override layout variables.

---

## Phase Checklist

| Phase | Zone(s) affected | Contract change required? |
|---|---|---|
| Phase 1 — Entity node sizing | Canvas | No |
| Phase 2 — Left panel cleanup | Left Panel, Help Overlay | Yes — remove Quick Start etc. from Left Panel |
| Phase 3 — Toolbar split | App Bar, Tool Bar | Yes — move playtest to App Bar only |
| Phase 4a — Layout expansion + camera | Canvas | Yes — add world-space + boundary |
| Phase 4b — Game screen boundary | Canvas, App Bar | Yes — add resolution config to App Bar |
| Phase 5 — VisualStyle Rust rename | All (terminology) | Yes — update "profile/hardware" → "visual style" |
