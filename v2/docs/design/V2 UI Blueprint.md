# V2 UI Blueprint

Status: As-built (v2 MVP, 2026-02-24); target architecture marked separately.

## As-Built Shell Layout (v2 MVP)

Last updated: 2026-02-24 (UI-SHELL-POLISH-001).

### 1. Header (top bar)

- `<header>` element, flex row.
- **Project controls:** New, Save, Load.
- **History:** Undo (Ctrl+Z), Redo (Ctrl+Y) -- disabled until there is history.
- **Playtest controls:** Play, Pause/Resume, Step, Interact.
- **Quick actions (hierarchy established UI-SHELL-POLISH-001):**
  - Primary: `Add Starter Scene` (`btn btn--primary`) -- paints ground strip and spawns player.
  - Secondary: `Add Player` (`btn btn--secondary`) -- spawns a centered player entity.
- **Viewport:** Fit (fit-to-map button, `btn-zoom-reset`).
- **Playtest HUD:** `#playtest-hud` live region showing state/tick/player position.

### 2. Toolbar strip

- `.toolbar` flex row, surface background, border-bottom.
- Controls: Tool select (Select / Paint Tile / Erase Tile / Place Entity / Rule Paint), Tile ID,
  Map W, Map H, Tile size, Apply Map (`btn btn--secondary`).
- All inputs styled via `.toolbar select` / `.toolbar input[type="number"]` token-based rules.
- All labels carry `title` attributes for hover tooltips.

### 3. Left rail

- `.left-rail` flex column, 240px fixed, border-right.
- **Tab bar** (top): 9 tabs in one wrapped flex row:
  Tasks, Console, Story, Getting Started, Behavior, Sprite, Effects, Export, Animation.
  - `aria-selected` ARIA attribute tracks active tab; `.tab-btn[aria-selected="true"]` carries
    accent bottom border.
  - Tasks and Console are tab positions 0 and 1 -- one-click accessible at all times.
- **Panel area** (`.bottom-tabs`): shows the active `.tab.tab--active` panel.
  - **Tasks:** diagnostic list with severity-specific border-color accents
    (`--status-err-bg` for error/fatal, `--status-warn-bg` for warning).
  - **Console:** timestamped shell log lines.
  - **Story:** quest-graph node/edge summary.
  - **Getting Started:** onboarding checklist with `Add Starter Scene` CTA until complete.
  - **Behavior, Sprite, Effects, Export, Animation:** workspace panels.

### 4. Center (canvas stage)

- `.canvas-stage` flex-1, overflow-hidden, relative.
- `<canvas id="editor-canvas">` 1024x576 drawing buffer.
  - Viewport framing: `box-shadow: inset 0 0 0 2px var(--border-control)` -- zero layout
    footprint, prevents right-edge clip on resize (replaces former `border:` property).
  - CSS transform (translate + scale) applied by `ViewportController`.
  - Startup fit: double `requestAnimationFrame` defers `fitViewportToMap()` until layout
    is stable, ensuring correct container dimensions before the first fit.
- `#fx-overlay`: absolute full-cover, opacity driven by `--fx-intensity` via FX preset.

### 5. Right (inspector)

- `.inspector-panel` fixed 260px, border, surface background.
- Renders entity inspector fields when an entity is selected; empty-state otherwise.
- Inspector section foldouts via `.inspector-section` / `.inspector-section-title`.

### 6. Footer

- `<footer>` with `#status` text showing project name and map dimensions.

### 7. Overlays

- **Modal** (`.modal-overlay`, `z-index: 200`): confirm dialogs for destructive actions.
- **Context menu** (`.context-menu`, `z-index: 300`): canvas right-click menu
  (Delete Entity / Deselect / Properties).
- **Dashboard overlay** (`#dashboard-overlay`): full-screen project/template picker on New.

### Visual / token compliance (as-built)

- Two-layer CSS token system: `tokens.css` defines `--prim-*` primitives and semantic aliases
  (`--bg-*`, `--text-*`, `--border-*`, etc.). All component/layout files consume only aliases.
- Density: `data-density="comfort"` (default) / `"dense"` (compact overrides) independent of
  `data-mode` (UI-VISUAL-002 Slice B).
- All interactive elements use `:focus-visible` + `var(--focus-ring)` box-shadow.
- Token compliance gate: no `--prim-*` or raw hex outside `tokens.css` (enforced by test).

---

## Target Shell Layout (Future)

The following describes the intended long-term shell topology. The as-built MVP above is a
deliberate simplification. Migration to this layout is deferred.

1. Top bar: project controls + save state + undo/redo + playtest controls + command palette.
2. Left rail: mode tabs (Build / Animate / Story / Effects / Test).
3. Center: primary canvas/viewport.
4. Right: contextual inspector.
5. Bottom tabs: Timeline / Console / Tasks / optional profiler.

---

## Tasks Surface (Locked)

1. Tasks consume normalized diagnostics/task models.
2. Each task includes severity, message, and remediation path where possible.
3. Tasks must support progressive cleanup workflows.
4. Severity accents: error/fatal = `--status-err-bg` border; warning = `--status-warn-bg` border.

## Mode-Specific Expectations (Target)

1. Build: tile/field/entity authoring surfaces; smart brush entry points visible.
2. Animate: clip timeline, anchor edits, marker management.
3. Story: graph editing with condition/effect editing.
4. Effects: light/emitter placement and preview controls.
5. Test: play/pause/step with runtime inspection.

## Workspace Extensions (Planned)

1. Sprite Workspace: pixel editing canvas, slice/import/recolor, tile-safe seam preview.
2. Export Workspace: one-click build targets, preflight validation, bake report.
3. Dashboard Workspace: recents + templates + health badges + Start Here checklist.
4. Onboarding Layer: non-blocking checklist panel, context tips, opt-in guided overlays.

## Planned (Post-V2)

1. Expanded sequencing integration across modes.
2. More advanced graph/inspector visualizations.
3. Behavior authoring surface: Event Rows editor (default) + Node Graph view (advanced).

## References

1. `docs/design/V2 Product UX Spec.md`
2. `docs/design/V2 Professional UX Bar.md`
3. `docs/design/V2 Smart Tooling Spec.md`
4. `docs/design/V2 Dashboard UX Spec.md`
5. `docs/design/V2 Onboarding Spec.md`
6. `docs/design/V2 Diagnostics and Tasks Contract.md`
7. `docs/manual/Behavior Specs.md`
8. `docs/architecture/V2 System Architecture.md`
