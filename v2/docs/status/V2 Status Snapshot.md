# V2 Status Snapshot

Last updated: 2026-02-24

## Purpose
Provide a single-page, current-state summary of v2 implementation progress, quality gates, and immediate priorities.

## Current State

### Vertical Slice Lock (General 2D)
- Locked target:
  - player movement and collision
  - one interaction trigger (player -> interactable entity)
  - one actionable task/diagnostic recovery path
  - save/load + playtest loop passing in CI
- Rule:
  - prioritize slice-complete behaviors over new infrastructure unless blocking this target

### Foundation and Governance
- Done:
  - v2 workspace + CI + ADR/docs baseline
  - PR governance checks (`Doc References`, `Change-of-Plan Log`)
  - contract/schema/doc/test coupling checks in CI
  - status automation command (`npm run status`)
  - canonical architecture/design/production docs added and indexed

### Contracts and Validation
- Done:
  - schema baseline for common/project/map/assets/story/entity/animation slices
  - fixture-backed schema validation tests in `@gcs/contracts`
  - semantic validation for quest graphs:
    - duplicate node IDs
    - missing edge endpoints
    - start-node cardinality
    - unreachable node warnings
  - initial `x-ui` schema hints in animation and sprite renderer schemas
- In Progress:
  - full schema pack completion (recipes/vfx/material variants/etc.)
  - Rust-side parity harness for schema fixtures

### Runtime Web
- Done:
  - project load structural validation
  - runtime semantic validation enforcement on quest graph during load
  - regression coverage for valid/invalid semantic cases
  - end-to-end golden project smoke test in runtime-web CI path
  - warning diagnostics are captured on load and exposed through runtime/editor APIs
  - task labels/fix-action mapping extended for edit-time `EDIT_*` diagnostics
  - playtest interaction trigger events emitted on `interact` input edge near interactable entities
  - authored playable interaction fixture + smoke test in CI
  - grouped undo batching API for command sequences (`beginUndoBatch`/`endUndoBatch`) with multi-tile stroke coverage
  - collision parity coverage for wall-slide and edge-contact movement behavior in playtest tests
  - diagnostics/task taxonomy uplift (category mapping + deterministic task ordering by severity/category/label)
  - authored recovery-actions fixture plus smoke test for actionable task generation
  - exported `resolveFixAction` for cross-package fix action resolution
  - `removeByCodeAndPath` for scoped diagnostic removal (multiple editor diagnostics coexist)
- In Progress:
  - extending diagnostics beyond load-time into deeper runtime command workflows

### UI Editor
- Done:
  - baseline editor tests and workflows (map/entity core loop)
  - task model API (`EditorApp.getTasks`) mapped from load diagnostics
  - minimal tasks panel renderer module (`renderTasksPanel`, `applyTaskFixById`) with unit tests
  - Tasks tab interaction controller (`TasksTabController`) for container render + fix wiring
  - shell integration controller (`EditorShellController`) wiring canvas/tasks/status/load/new hooks
  - module-driven shell bootstrap (`main.ts`) replacing legacy inline shell script
  - shell `Save` wiring to local persistence with test coverage
  - schema-driven inspector slice v1 (entity position fields from shared schema metadata)
  - canvas selection wiring + selected entity visual highlight
  - edit-time diagnostics surfaced through Tasks for command failures (tile bounds/layer, missing entity)
  - inspector visual-fields slice (solid/sprite/animation) with command-path updates
  - edit-time asset-reference validation surfaced via Tasks (`EDIT_ASSET_REF_INVALID`)
  - deterministic asset-reference auto-fix for invalid sprite/animation refs (`EDIT_ASSET_REF_INVALID` -> `entity:updateVisual` clears invalid fields)
  - deterministic missing-layer auto-fix (`EDIT_LAYER_MISSING` -> fallback `tile:set` with clamped coordinates)
  - deterministic duplicate-name auto-fix (`EDIT_DUPLICATE_ENTITY_NAME` -> `entity:rename` with unique suffix)
  - recovery smoke coverage for layered deterministic fix loop (layer/entity/tile/asset/name failures)
  - edit-time entity bounds checking (`EDIT_ENTITY_OUT_OF_BOUNDS`) with deterministic auto-fix (clamp to canvas)
  - edit-time tile bounds checking (`EDIT_TILE_OUT_OF_BOUNDS`) with deterministic auto-fix (clamp to layer bounds)
  - edit-time duplicate entity name detection (`EDIT_DUPLICATE_ENTITY_NAME`, info severity)
  - editor diagnostics now auto-attach fix actions via `resolveFixAction` (no longer empty)
  - `applyFix()` correctness: only removes diagnostic after confirmed dispatch success
  - scoped diagnostic removal replaces `clearSource('editor')` -- multiple editor issues coexist
  - test mode controls wired for play/pause/step/interact with console interaction logs
  - paint stroke batch hooks (`beginPaintStroke`/`endPaintStroke`) wired in `EditorApp` for grouped undo integration
  - shell pointer paint lifecycle wired (`pointerdown`/`pointermove`/`pointerup`) with grouped undo stroke behavior
  - toolbar-driven shell controls: tool mode (`paint`/`erase`/`entity`), tile ID input, map size controls (`width`/`height`/`tileSize`) with apply-map recreate flow
  - canvas hover-cell highlight for tile authoring feedback
  - Test mode telemetry summary line improved (`tick/entities/interactions/position`)
  - entity rename: `entity:rename` command + undo/redo, inspector name field editable, duplicate-name diagnostics refresh on create/rename/delete -- all EntityDef authoring fields now editable through inspector
  - story panel MVP: node selection + inspector binding + apply for node `name`/`kind`, with story graph persistence in save/load
- In Progress:
  - manual/guides-driven UX spec implementation
  - deeper animation/story/effects panel behavior
  - animation panel behavior implementation beyond anchor/slot authoring baseline
  - animation anchor/slot authoring panel wired in shell (selected entity clip binding, command-path anchor add/move/remove, slot attach/detach/occlusion update)

### Runtime Desktop
- Planned:
  - adapter parity after web/runtime contracts stabilize

### Onboarding and Dashboard Track
- Done (MVP):
  - welcome dashboard overlay with entry routing, boot-once shell architecture (`UI-DASH-001`)
  - recent project health badges from stored metadata (`UI-DASH-002`)
  - in-editor checklist with event-driven step progression (`UI-ONBOARD-001`)
  - preference persistence + reset (6 prefs, localStorage-backed) (`UI-ONBOARD-002`)
  - beginner/pro mode toggle with `data-mode` attribute on shell root (`UI-ONBOARD-003`)
  - `OnboardingStore`, `DashboardController`, `OnboardingChecklistController` modules shipped
  - 31 new focused tests (5 test files, all green)

### Behavior Authoring Track
- Done (MVP) -- 2026-02-21:
  - canonical Behavior IR with Event Rows MVP (`BEHAV-ROW-001`)
  - picker/selection-set semantics and TargetSelector chips (`BEHAV-PICK-001`)
  - behavior execution debug trace with ring-capped buffer at 200 (`BEHAV-DEBUG-001`)
  - `BehaviorEvaluator`, `BehaviorPanelController`, `renderBehaviorPanel` modules shipped
  - entity:delete undo parity: behaviors restored alongside entity
  - 27 new focused tests (3 test files, all green)
- Expanded runtime execution -- 2026-02-22:
  - contextual trigger execution for `on:interact` and `on:collision` in playtest
  - deterministic action execution path for `set_velocity` and `destroy_self` (target: `this`)
  - evaluator trigger scoping (`triggerEntityIds`) to avoid cross-entity fanout for contextual triggers
  - focused coverage added in `playtest-runner.test.ts` and `behavior-debug-trace.test.ts`
- Expanded target/trigger surface -- 2026-02-22:
  - shared deterministic target resolver (`resolveTargetEntityIds`) for `this` / `tag` / `radius`
  - `on:proximity` trigger execution added in playtest
  - `entity_in_radius` condition execution added through radius selector checks
  - focused coverage added in `behavior-targeting.test.ts`, `playtest-runner.test.ts`, `behavior-debug-trace.test.ts`
- Expanded guardrails + targeting -- 2026-02-22:
  - deterministic row-budget guardrail in evaluator (`maxRowsPerEvaluate`)
  - deterministic per-row action-budget guardrail (`maxActionsPerRow`)
  - `set_velocity` and `destroy_self` now support deterministic target resolution for `this` / `tag` / `radius`
  - focused runtime coverage added for tag-targeted action execution and budget behavior

### Stabilization Slice Track
- Done (MVP) -- 2026-02-22 (`UI-SHELL-001`):
  - clickable tab bar (`<nav class="tab-bar">`) with 9 `<button data-tab="...">` elements above bottom panel
  - only active tab panel visible (CSS `.tab--active`); all panels stay in DOM (no unmount)
  - `aria-selected` updates on active tab button; keyboard-focusable with focus ring
  - `setActiveTab()` method in `EditorShellController`; tab bar click delegation
  - 5 new focused tests (`tab-navigation.test.ts`, all green)
- Done (MVP) -- 2026-02-22 (`UI-SHELL-002`):
  - `ModalController`: `showConfirm` / `showError` / `hide`, `isOpen` getter
  - full focus management: save/restore `document.activeElement`, focus first button on open, tab-trap inside modal box
  - keyboard: Escape = cancel, Enter = confirm
  - `aria-hidden` toggle; `role="dialog" aria-modal="true"` markup
  - dirty-state gate: wired to snapshot-based `UI-DIRTY-001` logic; New/Load only show modal when `isDirty === true`
  - 10 new focused tests (`modal.test.ts`, all green)
- Done (MVP) -- 2026-02-22 (`UI-SELECT-001`):
  - `'select'` added as first option in tool dropdown (default tool on load)
  - `onPointerDownHandler` early-returns for select tool (paint skip)
  - `updateCanvasCursor()`: `default` cursor in select mode, `crosshair` in paint/erase/entity/rule-paint
  - auto-select on entity create already present; no new code needed
  - existing `editor-shell-controller.test.ts` tests updated for new default tool
- Done (MVP) -- 2026-02-22 (`UI-UNDO-001`):
  - `EditorApp.canUndo()` / `canRedo()` passthrough methods added
  - Undo/Redo buttons in header with `title` shortcut hints, `disabled` attribute
  - `refreshUndoRedoState()` called on init, every bus event, undo/redo click, New/Load/ApplyMap
  - 6 new focused tests (`undo-redo-surface.test.ts`, all green)
- test count: 411 total (16 contracts + 129 runtime-web + 266 ui-editor); net +33 vs previous baseline
- Done (MVP) -- 2026-02-22 (`UI-HOTKEY-001`):
  - keyboard shortcuts: `S`/`P`/`E` -> select/paint/erase tool (updates `toolSelect.value` + canvas cursor)
  - `Ctrl+Z` -> undo + refresh; `Ctrl+Y` / `Ctrl+Shift+Z` -> redo + refresh
  - `Space` -> viewport pan mode (cursor: grab) when playtest stopped; playtest step when running/paused; `Escape` -> close open modal
  - form-element guard: no hotkeys when focus is in `INPUT`/`TEXTAREA`/`SELECT`
  - `setTool()` private helper; `keydownTarget` in `EditorShellElements` (passes `document` in production)
  - 11 new focused tests (`hotkey.test.ts`, all green)
- test count: 422 total (16 contracts + 129 runtime-web + 277 ui-editor); net +11
- Done (MVP) -- 2026-02-22 (`UI-DIRTY-001`):
  - replaced event-flag `isDirty = true` with snapshot-based `recomputeDirty()` (compares `app.save()` to `lastSavedSnapshot`)
  - `markClean()` called at init, save, load, new project
  - `recomputeDirty()` called in bus subscription, undo/redo button handlers, undo/redo hotkey handlers, and Apply Map handler
  - `StoryPanelController` now accepts optional `onMutate?: () => void`; called after successful `updateQuestNodeBasics`
  - shell wires `onMutate: () => this.recomputeDirty()` to detect bus-bypassing story mutations
  - 10 focused tests (`dirty-state.test.ts`, all green)
- test count: 432 total (16 contracts + 129 runtime-web + 287 ui-editor); net +10
- Done (MVP) -- 2026-02-22 (`UI-CTX-001`):
  - `ContextMenuController` (new): show/hide, position, item visibility by selection, click-away, Escape
  - Actions: Delete Entity (hidden when none selected), Deselect, Properties (inspector refresh)
  - `contextMenu` + `contextMenuTarget` added to `EditorShellElements`; shell wires `contextmenu` event on canvas
  - `app.html`: `<div id="context-menu">` with 3 `<button data-action>` items
  - `components.css`: `.context-menu`, `.ctx-item`, hover + focus-visible states
  - 12 focused tests (`context-menu.test.ts`, all green)
- test count: 444 total (16 contracts + 129 runtime-web + 299 ui-editor); net +12
- Follow-up fix -- 2026-02-23 (`UI-CTX-001`):
  - right-click now hit-tests and selects entity under cursor before menu open (actions target intended entity)
  - Properties action now refreshes and focuses inspector context (not refresh-only)
  - 1 focused shell regression test added for contextmenu hit-test selection
- Done (MVP) -- 2026-02-23 (`INTEG-001`):
  - Golden integration smoke test: new->tile->entity->save->load roundtrip, playtest lifecycle, combined sequence
  - Hardened: 4th test asserts player x increases by 2px after moveX=1 step (speed=120, dt=1/60)
  - 4 tests (`integration-smoke.test.ts`, runtime-web, all green)
- Done (MVP) -- 2026-02-23 (`UI-INSPECT-001`):
  - Schema-driven inspector: section foldouts (Transform/Visual/Metadata via `<details>/<summary>`)
  - `id` field added to inspector schema as read-only first field
  - Empty-state CTA updated with actionable guidance text
  - `schema-inspector.test.ts` rewritten with 11 tests (section grouping, foldout open/closed, ordering)
- Done (MVP) -- 2026-02-23 (`SPRITE-PERSIST-001`):
  - Sprite pixel buffers now saved/loaded as part of project JSON (`sprites` field in `PersistedProjectFile`)
  - `ProjectStore.setSpriteAsset()` / `getAllSpriteAssets()` / `createProject()` clears sprites
  - `SpriteWorkspaceStore.exportBuffers()` / `importBuffer()` added; shell flushes on save, imports on load
  - `sprite-persistence.test.ts` (6 tests) + `sprite-editor.test.ts` SPRITE-PERSIST-001 block (5 tests)
- Done (MVP) -- 2026-02-23 (`UI-VIEWPORT-001`):
  - Mouse-wheel zoom (0.25x-4x, centered on cursor); middle-mouse and Space+left-drag pan
  - "Fit" button in header triggers fit-to-map; auto fit-to-map on New/Load/Apply Map
  - `.canvas-stage` is now `flex: 1; overflow: hidden` (clips zoomed canvas, enables proper container sizing)
  - `ViewportController` class + 18 focused tests (`viewport-controller.test.ts`)
  - Space hotkey updated: pan mode when stopped, playtest step when running
- Done (MVP) -- 2026-02-24 (`UI-STARTUP-001`, `UI-LAYOUT-001`):
  - Startup map default updated to `64x36 @ 16` (16:9 baseline) in shell initialization
  - Deferred startup `fitViewportToMap()` added with `requestAnimationFrame` so first open uses real layout dimensions
  - `fitToMap()` now supports upscale to fill viewport, clamped by existing `VIEWPORT_MAX_ZOOM`
  - Workspace tabs/panels moved into a left rail inside `<main>` while preserving `.bottom-tabs` class for tab logic/test compatibility
  - Toolbar map defaults updated (`Map W=64`, `Map H=36`); canvas initial attrs aligned (`1024x576`)
- Done (MVP) -- 2026-02-24 (`UI-PLAYFLOW-001`):
  - Added command-path player speed authoring (`entity:setSpeed`) with undo/redo support in runtime-web `ProjectStore`
  - Added `speed?: number` to `EntityDef`; `parseEntities()` now parses speed so save/load round-trips preserve authored values
  - `PlaytestRunner` now initializes runtime speed from authored entity speed (`e.speed ?? 120`)
  - Inspector adds conditional `Player Config` section with `Speed (px/s)` for entities tagged `player`
  - Getting Started checklist adds discoverability CTA (`Add Starter Scene`) and dismissible playable-loop flow hint
  - Onboarding preferences now include `showFlowHint`; adding `playable-scene-ready` step changes default step count from 5 to 6 (stored 5-step checklist state resets once to new defaults)
  - Shell wires checklist action delegation (`add-starter`) and marks `playable-scene-ready` after starter scene generation
- Done (MVP) -- 2026-02-24 (`INTEG-CONTRACT-001`):
  - Added a canonical runtime integration contract test (`playable-contract.test.ts`) to lock one playable baseline
  - Contract covers: starter authored tile state, command-authored player speed with undo/redo behavior, one playtest tick with movement + interact, and save/load invariants
  - Purpose: freeze backend playable semantics before further UI/UX shell polish
- Fix -- 2026-02-23 (`UI-DIRTY-001` + `SPRITE-PERSIST-001`):
  - `isDirty` now includes sprite workspace mutations via generation counter (was blind to sprite edits)
  - `SpriteWorkspaceStore.clearAll()` added; called on New/Load to prevent stale buffer leakage
- Improvement -- 2026-02-24 (playable starter path):
  - Added header-level `Add Player` action in editor shell.
  - Action creates a centered entity named `Player`, tags it with `player`, marks it solid, auto-selects it, and writes a console line.
  - This makes movement-ready playtest setup discoverable without hidden tag edits.
- Improvement -- 2026-02-24 (starter scene shortcut):
  - Added header-level `Add Starter Scene` action (formerly `Add Ground + Player`; renamed in UI-SHELL-POLISH-001).
  - Action paints a deterministic ground strip (row `height-2`) and spawns/selects a tagged player one tile above.
  - Focused shell test added for ground row paint + player spawn/selection.
- Improvement -- 2026-02-24 (playtest HUD strip):
  - Added header HUD (`#playtest-hud`) showing playtest state, tick, and tagged player position when a snapshot is available.
  - HUD now updates on Play, Pause/Resume, Step, New, Load, and Apply Map flows.
  - Focused shell test added for tick/player HUD updates after stepping playtest.
- Polish -- 2026-02-24 (`UI-SHELL-POLISH-001`):
  - A1: Renamed `Add Ground + Player` -> `Add Starter Scene` (primary CTA) with `btn--primary` class; `Add Player` becomes `btn--secondary`. Swapped DOM order (primary first).
  - A4: Startup framing fix: single `requestAnimationFrame` upgraded to double-rAF so container layout is stable before `fitViewportToMap` measures container dimensions.
  - A5: Canvas viewport framing uses `box-shadow: inset 0 0 0 2px var(--border-control)` instead of `border:` to eliminate layout overflow that caused right-edge clipping on resize.
  - A6: Added `.toolbar` CSS block in `layout.css` (flex row, surface bg, border-bottom, labeled inputs and selects styled with tokens); `btn-apply-map` now carries `btn--secondary`; toolbar inputs have descriptive `title` tooltip attributes.
  - A7: Onboarding checklist panel CTA label and quick-start hint copy updated to match new action name. Onboarding store step label updated.
  - A8: Task list items carry severity-specific border-color using status tokens (`--status-err-bg` for error/fatal, `--status-warn-bg` for warning).
  - A9: Token compliance confirmed green; no raw hex in non-token CSS files.
  - Tests: 2 new viewport startup-fit scenario tests; 4 new shell-structure compliance tests in visual-tokens.test.ts; 1 canvas box-shadow compliance test; 1 test fix (onboarding CTA label assertion); 1 test name updated.
- test count: 521 (16 contracts + 147 runtime-web + 358 ui-editor) -- verified by per-workspace runs 2026-02-24
  - Note: root `npm test` output shows the last workspace (ui-editor) summary as apparent total; use per-workspace counts.

## Quality Gate Status
- `npm run ci` (v2): passing
- TypeScript package tests: 521 passing total (`16 contracts + 147 runtime-web + 358 ui-editor`)
- Rust workspace tests: passing (separate root workflow scope)
- Lint/typecheck/tests for v2 packages: passing

## Known Gaps / Risks
1. Edit-time diagnostics cover common authoring failures; deeper runtime diagnostics still limited.
2. Full schema portfolio is partially complete.
3. Status command is heuristic; not yet tied to CI test artifacts.
4. Deterministic auto-fix coverage exists for entity and tile out-of-bounds; broader recovery coverage still limited.

### Visual Token Track
- Done (MVP) -- 2026-02-21 (`UI-VISUAL-001`):
  - two-layer CSS token system: primitives (`--prim-*`) + semantic aliases in `app.html`
  - pro mode density overrides via `[data-mode="pro"]`
  - `prefers-reduced-motion` support
  - standardized `focus-visible` focus ring
  - all hardcoded hex colors in shell rules replaced with semantic tokens; sub-scale px spacing deferred to Phase 2
  - 10 new focused tests (`visual-tokens.test.ts`, all green)
- Slice A Done -- 2026-02-22 (`UI-VISUAL-002`):
  - all CSS extracted from `app.html` into 6 modular stylesheet files (`tokens`, `base`, `layout`, `components`, `workspaces`, `accessibility`)
  - `app.html` reduced to 6 deterministic `<link>` tags in canonical load order
  - `visual-tokens.test.ts` updated to read from CSS files (pure refactor; all 10 tests still green)
  - test count unchanged: 339 total (14 contracts + 108 runtime-web + 217 ui-editor)
- Slice B Done -- 2026-02-22 (`UI-VISUAL-002`):
  - `[data-density="comfort|dense"]` attribute introduced; density vars moved from `[data-mode="pro"]` to `[data-density="dense"]`
  - `EditorShellController.setDensity()` method added; initial `data-density="comfort"` wired on shell root
  - `visual-density.test.ts` added: 6 tests verifying decoupling (dense block vars + mode block absent)
  - test count: 345 total (14 contracts + 108 runtime-web + 223 ui-editor)
- Done (MVP) -- 2026-02-22 (`UI-VISUAL-003`):
  - compliance gate added: no `--prim-*` references and no raw hex outside `tokens.css`
  - 2 violations fixed: `--prim-size-xs` in density override (-> `--text-xs`); `--prim-blue-400` in sprite swatch (-> `--accent-highlight`)
  - `--accent-highlight: var(--prim-blue-400)` semantic alias added to `tokens.css`
  - 3 new compliance tests in `visual-tokens.test.ts`
  - test count: 348 total (14 contracts + 108 runtime-web + 226 ui-editor)
- Done (MVP) -- 2026-02-22 (`UI-VISUAL-004`):
  - `:focus-visible` expanded to cover `a`, `textarea`, `[tabindex]` in `accessibility.css`
  - centralized `:disabled` rule: `opacity: var(--opacity-disabled)` for all form controls
  - `--opacity-disabled: 0.4` token added to `tokens.css`; 3 inline disabled overrides removed from `workspaces.css`
  - `button:hover` guarded with `:not(:disabled)` in `base.css`
  - `.dash-recent-card:hover` hover state added
  - `visual-accessibility.test.ts` added: 10 tests
  - test count: 358 total (14 contracts + 108 runtime-web + 236 ui-editor)

### Animation Anchor Track
- Done (MVP) -- 2026-02-22 (`ANIM-ANCHOR-001-003`):
  - `AnchorKeyframe` type added to `AnimationClipDef.anchors` in contracts
  - `animation:anchor:add|move|remove` commands with undo/redo wired in `ProjectStore`
  - `resolveAnchorPosition` helper: linear interpolation between per-frame keyframes, clamp guards
  - `SlotType`, `OcclusionHint`, `SlotAttachment` types added to `EntityDef.slots[]` in contracts
  - `entity:slot:attach|detach|setOcclusion` commands with undo/redo wired in `ProjectStore`
  - `detectCircularAttachment` helper: deterministic DFS (sort by entity id) for cycle prevention
  - `resolveOcclusionOrder` helper: anchorY vs parentHalfHeight -> `in-front` | `behind`
  - `entity.prefabOrInstance.v2.json` schema updated with `slots` property; `entity_with_slots.v2.json` fixture added
  - `clips: AnimationClipDef[]` added to `ProjectStore` with save/load persistence
  - 2 new schema validation tests + 18 new runtime-web tests (`animation-anchor.test.ts`)
  - test count: 378 total (16 contracts + 126 runtime-web + 236 ui-editor)

### Sprite Editing Track
- Done (MVP) -- 2026-02-21 (`SPRITE-EDIT-001`):
  - `SpriteWorkspaceStore`: pixel buffer, pixel-safe stroke, undo/redo (local to store)
  - `SpritePanelController` + `renderSpritePanel`: pencil/erase tools, color swatches, canvas rendering
  - Sprite panel wired as 6th tab in editor shell; entity selection opens sprite buffer
  - 10 new focused tests (`sprite-editor.test.ts`, all green)
- Done (MVP) -- 2026-02-21 (`SPRITE-STYLE-001`):
  - `SpriteStyleLintService` (`lintSprite`, `nearestPaletteColor`): pure palette lint, exempt transparent pixels, nearest-color remap data
  - `applyPixelFix()` on `SpriteWorkspaceStore`: direct pixel write, no undo record, pixel-safe
  - Remap button in sprite toolbar with off-palette count; disabled when clean
  - `SPRITE_COLOR_OUT_OF_PALETTE` diagnostic wired to DiagnosticStore via shell onLintUpdate callback
  - 10 new focused tests (`sprite-style.test.ts`, all green); 251 total TS tests green
- Done (MVP) -- 2026-02-21 (`SPRITE-BRUSH-001`):
  - `BrushEngine` (`expandDab`, `expandStroke`): pure, stateless, seeded xorshift32 RNG; position-derived seed
  - Brush types: `pencil` (1px point) + `scatter` (square neighborhood, Fisher-Yates shuffle)
  - Brush sizes: 1px / 3px / 5px; hard cap 50 points per dab
  - Toolbar: brush type buttons + size selector added to sprite panel
  - Controller: dab centres accumulated per drag, expanded on pointerup, one `applyStroke` call per drag
  - 8 new focused tests (`sprite-smart-brush.test.ts`, all green); 167 total TS tests green

### Tile Rule Mapping Track
- Done (MVP) -- 2026-02-21 (`TILE-RULE-001`):
  - `tile-rule-engine.ts`: pure stateless engine -- `computeMask` (N=1/E=2/S=4/W=8), `resolveTile`, `collectNeighborhood`
  - `DEMO_RULESET`: built-in 16-variant ruleset mapping cardinal masks 0-15 to tileIds 1-16
  - `applyRulePaint()` on `EditorApp`: 2-pass algorithm (intent pass with fallback, resolve pass with neighborhood mask)
  - Rule Paint tool wired in `EditorShellController` + dropdown option added to app.html
  - `TILE_RULESET_INVALID` + `TILE_RULE_MISSING_VARIANT` diagnostics wired to DiagnosticStore
  - 14 new focused tests (`tile-rule-engine.test.ts`, all green); 182 total UI-editor TS tests green

### Effects Workspace Track
- Done (MVP) -- 2026-02-22 (`FX-PRESET-001`):
  - Runtime-owned preset state via `effects:applyPreset` (`activePresetId`, `intensity`) with undo/redo and save/load persistence
  - Built-in preset catalog in runtime-web (`rain`, `fog`, `night_tint`) with validation guard for known IDs
  - UI effects panel + controller wired in shell, with preset buttons, intensity slider, and clear action
  - Canvas display overlay (`#fx-overlay`) driven by `data-fx-preset` + `--fx-intensity` CSS variable
  - Unknown preset diagnostic path wired (`EFFECT_PRESET_UNKNOWN`) to Task labels/fix metadata
  - 11 focused tests (`effects-presets.test.ts`, all green)
- Done (MVP) -- 2026-02-22 (`FX-FIELD-001`):
  - Runtime field coupling command path (`effects:setFieldCoupling`) with undo/redo and save/load persistence
  - Built-in effect field catalog with deterministic scalar sampler (`wind.global`)
  - Overlay intensity modulation uses deterministic tick-based field sampling in playtest
  - Unknown field diagnostic path wired (`EFFECT_FIELD_UNKNOWN`) to Task labels/fix metadata
  - Focused tests added for coupling command path and deterministic sampling (`effects-field-coupling.test.ts`, `project-store.test.ts`)

### Export Workspace Track
- Done (MVP) -- 2026-02-22 (`EXPORT-PREFLIGHT-001`):
  - Runtime preflight evaluator shipped (`evaluateExportPreflight`) with deterministic issue ordering
  - Blocking + warning checks implemented for missing layer, missing player, and empty map baseline
  - Export panel/controller wired in shell with explicit preflight run and build gating behavior
  - Export preflight diagnostics mapped into Tasks via DiagnosticStore labels/fix metadata
  - Focused tests added for runtime evaluator and editor integration (`export-preflight.test.ts`, `export-preflight-ui.test.ts`)
- Done (MVP) -- 2026-02-22 (`EXPORT-BUILD-001`):
  - Deterministic export build function shipped (`buildDeterministicExport`) with stable canonical JSON output
  - Versioned metadata + compatibility marker + source hash/build ID generation included in build report
  - Deterministic artifact list generated (`export/manifest.json`, `export/project.json`, `export/provenance.json`)
  - Export panel now surfaces build summary metadata after successful gated build action
  - Focused tests added for runtime build determinism and UI build summary (`export-build.test.ts`, `export-preflight-ui.test.ts`)

## Immediate Next 3 Priorities
1. Harden cross-workspace diagnostics with deeper runtime/edit-time coverage beyond current `EDIT_*` and behavior guardrail paths.
2. Behavior node graph view (`BEHAV-GRAPH-001`) and code blocks (`BEHAV-CODE-001`).
3. Modular character path follow-up (slot UX polish + occlusion preview + bake pipeline integration).

## Status Update Rule
Any implementation PR that changes behavior, contracts, validation, or roadmap state must update at least one:
1. `docs/architecture/V2 Capability Matrix.md`
2. `docs/status/V2 Status Snapshot.md`

Broad changes should update both.
