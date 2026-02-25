# V2 Behavior Specs

Status: In Progress  
Purpose: Source-of-truth behavior contracts for implementation and test mapping.

## Format
Each behavior spec includes:
1. User/System action
2. Expected behavior
3. Data mutation
4. Validation rules
5. Test mapping

---

## Build

### `BUILD-PROJECT-001` Create, load, and save project
- Action: User creates a new project, loads an existing project file, or saves the current project.
- Behavior: Create initializes a project with defaults (name, resolution, tileSize, empty layers/entities). Load deserializes project JSON and validates schema. Save serializes current state to JSON. All three operations are atomic -- partial failure does not corrupt state.
- Data: `Project` object created/replaced on create/load. `updatedAt` timestamp set on save.
- Validation: Schema validation on load (STORY-STRUCT-001 pattern). Required fields: `id`, `name`, `resolution`, `tileSize`. Version field must match supported range.
- Tests: `project-store.test.ts`, `schema-validation.test.ts`.

### `BUILD-TILE-001` Paint tile
- Action: Set tile in a tile layer cell.
- Behavior: Updates only targeted tile index.
- Data: `TileLayer.data[idx]` mutates.
- Validation: Layer must exist; index in bounds.
- Tests: `project-store.test.ts` paint/erase tests.

### `BUILD-ENTITY-001` Create entity
- Action: Dispatch entity create command.
- Behavior: Adds stable entity object with defaults.
- Data: `entities[]` append.
- Validation: Payload shape valid.
- Tests: `project-store.test.ts` create/delete/move tests.

---

## Playtest

### `PLAY-LIFECYCLE-001` Lifecycle transitions
- Action: Enter, pause, resume, exit playtest.
- Behavior: State transitions are deterministic and valid. Valid transitions: Stopped->Running, Running->Paused, Paused->Running, Running->Stopped, Paused->Stopped. All others are rejected as no-op.
- Data: `PlaytestState` enum mutates (stopped/running/paused).
- Validation: Invalid transition requests are rejected/no-op. State is serializable via `#[serde(rename_all = "lowercase")]`.
- Tests: `playtest-runner.test.ts`.

### `PLAY-COLLISION-001` AABB collision detection
- Action: Simulation tick with entities and solid tiles.
- Behavior: Axis-aligned bounding box checks between entities and between entities and solid tile cells. Collision results are deterministic for the same input state. Follows V2 Determinism Spec: fixed-step, stable system order.
- Data: Collision query results (boolean hit, contact normal). No direct mutation -- consumers (movement, physics) react to results.
- Validation: Bounding boxes must have positive dimensions. Out-of-bounds queries return no collision.
- Tests: Rust unit tests in `gcs-collision` crate, TS unit tests in `playtest-runner.test.ts` (tile/entity blocking, wall slide, edge-contact parallel movement).

### `PLAY-MOVEMENT-001` Grid and free movement
- Action: Entity movement command during playtest.
- Behavior: Grid mode snaps movement to tile-aligned steps. Free mode allows sub-pixel movement. Movement respects collision results -- entities stop or slide on contact. Movement delta is applied per fixed-step tick.
- Data: Entity `x`, `y` mutated by velocity * dt. Velocity zeroed on collision in the blocked axis.
- Validation: Movement mode (grid/free) is per-entity configuration. dt must be positive.
- Tests: Rust unit tests in `gcs-simulation`, TS unit tests in `playtest-runner.test.ts`.

### `PLAY-PHYSICS-001` Physics-lite simulation
- Action: Simulation tick with physics-enabled entities.
- Behavior: Applies gravity (downward acceleration), friction (velocity decay), and velocity integration. Physics runs after movement in the system order. Values are deterministic for the same input (per V2 Determinism Spec).
- Data: Entity velocity and position mutated per tick. Gravity and friction are configurable per-entity.
- Validation: Gravity and friction must be non-negative. Terminal velocity is capped.
- Tests: Rust unit tests in `gcs-physics`, TS unit tests in `playtest-runner.test.ts`.

---

## Story Graph

### `STORY-STRUCT-001` Structural schema validation
- Action: Load project/story JSON.
- Behavior: Invalid schema shape fails load.
- Data: none on failure.
- Validation: JSON Schema checks.
- Tests: `schema-validation.test.ts`.

### `STORY-SEM-001` Duplicate node IDs
- Action: Validate quest graph semantics.
- Behavior: Error when duplicate `nodeId` detected.
- Data: none.
- Validation: `QUEST_DUPLICATE_NODE_ID`.
- Tests: `semantic-validation.test.ts`.

### `STORY-SEM-002` Edge endpoint integrity
- Action: Validate quest graph semantics.
- Behavior: Error when `from`/`to` node is missing.
- Validation: `QUEST_EDGE_FROM_MISSING`, `QUEST_EDGE_TO_MISSING`.
- Tests: `semantic-validation.test.ts`, `project-store.test.ts`.

### `STORY-SEM-003` Start node cardinality
- Action: Validate quest graph semantics.
- Behavior: Exactly one `start` node required.
- Validation: `QUEST_START_NODE_MISSING`, `QUEST_START_NODE_MULTIPLE`.
- Tests: `semantic-validation.test.ts`, `project-store.test.ts`.

### `STORY-SEM-004` Unreachable node warning
- Action: Validate quest graph semantics.
- Behavior: Warn if node unreachable from start; does not block load.
- Validation: `QUEST_NODE_UNREACHABLE` (warning).
- Tests: `semantic-validation.test.ts`, `project-store.test.ts`.

---

## UI Selection

### `UI-SELECT-001` Single entity select
- Action: Click an entity on the canvas.
- Behavior: Clears previous selection; sets clicked entity as sole selection. Inspector updates to show entity properties.
- Data: `selection.entities` = `[clickedEntityId]`.
- Validation: Entity must be on a visible, unlocked layer. Click must hit entity bounding box.
- Tests: Planned -- `editor-selection.test.ts`.

### `UI-SELECT-002` Multi-select
- Action: Shift+click an entity, or drag a box selection region.
- Behavior: Shift+click toggles entity in/out of selection set. Box drag selects all entities whose bounding boxes intersect the drag rectangle.
- Data: `selection.entities` append/remove (shift+click) or replace (box drag).
- Validation: Only entities on visible, unlocked layers are eligible. Empty box drag clears selection.
- Tests: Planned -- `editor-selection.test.ts`.

### `UI-SELECT-003` Layer-aware selection
- Action: Any selection action when layers have locked/hidden state.
- Behavior: Entities on hidden layers are not rendered and cannot be selected. Entities on locked layers are rendered but click/drag-through; they cannot be selected or modified.
- Data: No mutation on locked/hidden layer entities.
- Validation: Layer `visible` and `locked` flags checked before hit-test.
- Tests: Planned -- `editor-selection.test.ts`.

### `UI-SELECT-004` Deselect
- Action: Click empty canvas area, or press Escape.
- Behavior: Clears entire selection set. Inspector reverts to default/empty state.
- Data: `selection.entities` = `[]`.
- Validation: No-op if selection is already empty.
- Tests: Planned -- `editor-selection.test.ts`.

---

## UI Transform

### `UI-TRANSFORM-001` Move selection
- Action: Drag selected entity/entities, or press arrow keys.
- Behavior: All selected entities translate by the same delta. Arrow keys move by 1 pixel (or 1 tile when grid-snap is active). Drag uses pointer delta from drag start.
- Data: Each entity's `x`, `y` mutated by delta.
- Validation: At least one entity must be selected. Move is a no-op if delta is (0, 0).
- Tests: Planned -- `editor-transform.test.ts`.

### `UI-TRANSFORM-002` Grid snap
- Action: Move or place entity/tile with grid-snap enabled.
- Behavior: Final position rounds to nearest grid cell origin. Grid size is determined by `project.tileSize`. When grid-snap is off, positions are free (1px granularity). Visual style `pixelSnap` flag does not affect editor placement -- it controls runtime rendering only.
- Data: Entity `x`, `y` snapped to `tileSize` multiples when grid-snap is active.
- Validation: Grid-snap toggle is a UI preference, not a project property.
- Tests: Planned -- `editor-transform.test.ts`.

### `UI-TRANSFORM-003` Bounds enforcement
- Action: Move or place entity near canvas/layer boundary.
- Behavior: Entities can be placed partially off-canvas (no hard clamp). A warning diagnostic is emitted if entity bounding box is fully outside canvas bounds. Tile painting is clamped to tile layer dimensions.
- Data: Entity position is set as-is; tile paint index is clamped to `[0, width*height)`.
- Validation: Tile layer bounds check (existing in BUILD-TILE-001). Entity bounds warning is non-blocking.
- Tests: Planned -- `editor-transform.test.ts`.

---

## UI Undo

### `UI-UNDO-001` Paint stroke granularity
- Action: User paints tiles by clicking or dragging across multiple cells.
- Behavior: One continuous drag = one undo entry. All tile mutations within a single pointer-down -> pointer-up sequence are grouped into a single `UndoRecord`. Individual tile changes within the stroke are not separately undoable.
- Data: `UndoRecord` captures all `{ idx, oldValue, newValue }` pairs for the stroke.
- Validation: Empty strokes (no cells changed) produce no undo entry.
- Tests: `project-store.test.ts` (`undo/redo tile paint restores old value`, `groups multi-tile paint into a single undo batch`, `empty undo batch is a no-op`), `editor-shell-controller.test.ts` (`batches drag paint into a single undo step`).

### `UI-UNDO-002` Entity operations
- Action: Create, delete, or move a single entity.
- Behavior: Each discrete operation produces exactly one undo entry. Create <-> Delete are inverse pairs. Move captures `{ oldX, oldY, newX, newY }`.
- Data: Existing `UndoRecord` types: `paintTile`, `createEntity`, `deleteEntity`, `moveEntity`.
- Validation: Undo of create = delete; undo of delete = re-create with original properties.
- Tests: `project-store.test.ts` (existing undo/redo tests).

### `UI-UNDO-003` Multi-entity group operations
- Action: Move multiple selected entities simultaneously.
- Behavior: All entity moves within a single drag are grouped into one undo entry. Undo reverses all entity positions atomically.
- Data: `UndoRecord` of type `groupMove` containing array of `{ entityId, oldX, oldY, newX, newY }`.
- Validation: Group record must contain at least one entity. Individual entity IDs must exist.
- Tests: Planned -- `project-store.test.ts` (extend with group undo test).

### `UI-UNDO-004` Undo stack limits
- Action: User performs many sequential operations.
- Behavior: Undo stack has a configurable maximum depth (default: 100). When limit is reached, oldest entries are discarded (FIFO). Redo stack is cleared on any new command (existing behavior).
- Data: `undoStack.length <= maxUndoDepth`. Evicted records are garbage-collected.
- Validation: `maxUndoDepth` must be a positive integer.
- Tests: Planned -- `project-store.test.ts` (add stack overflow test).

---

## UI Tasks

### `UI-TASKS-001` Diagnostic display
- Action: System emits a diagnostic (error, warning, info).
- Behavior: Diagnostic appears in bottom Tasks tab. Severity icon + short user-safe message displayed. Technical details available via expandable panel. Follows Error Recovery UX spec: no raw stack traces in primary text.
- Data: `diagnostics[]` append. Each diagnostic has `{ id, severity, category, message, detail?, actions[] }`.
- Known diagnostic codes (edit-time): `EDIT_LAYER_MISSING`, `EDIT_TILE_OUT_OF_BOUNDS`, `EDIT_TILE_SET_FAILED`, `EDIT_ENTITY_MISSING`, `EDIT_ENTITY_CREATE_FAILED`, `EDIT_ENTITY_OUT_OF_BOUNDS`, `EDIT_DUPLICATE_ENTITY_NAME` (info severity -- duplicates allowed but flagged), `EDIT_COMMAND_FAILED`, `EDIT_ASSET_REF_INVALID`.
- Known diagnostic codes (semantic): `QUEST_DUPLICATE_NODE_ID`, `QUEST_START_NODE_MISSING`, `QUEST_NODE_UNREACHABLE`, `QUEST_EDGE_FROM_MISSING`, `QUEST_EDGE_TO_MISSING`, `QUEST_START_NODE_MULTIPLE`.
- Scoped removal: Editor diagnostics are removed by code+path prefix (not blanket clearSource) so multiple actionable issues coexist.
- Validation: Severity must be one of: `info`, `warning`, `error`, `fatal`. Message must be non-empty.
- Tests: Done -- `diagnostic-store.test.ts`, `editor-app.test.ts`.

### `UI-TASKS-002` Task generation from diagnostics
- Action: Diagnostic with a known remediation path is emitted.
- Behavior: A task entry is created linking diagnostic -> suggested fix. Tasks surface in the Tasks tab with actionable label (e.g., "Fix missing start node", "Remove duplicate entity ID"). Tasks reference the originating diagnostic and target entity/node. Fix actions are auto-resolved from diagnostic codes via `resolveFixAction()`.
- Data: `tasks[]` append with `{ diagnosticId, severity, category, label, targetRef, fixAction? }`.
- Ordering: Tasks sort deterministically by severity desc, then category asc, then label asc.
- Validation: Task must reference a valid diagnostic ID.
- Tests: Done -- `diagnostic-store.test.ts`, `editor-app.test.ts`.

### `UI-TASKS-003` Auto-fix actions
- Action: User clicks a task's auto-fix button.
- Behavior: If `fixAction` is deterministic (e.g., clamp entity to bounds), it dispatches a command through the CommandBus. The diagnostic is only removed after dispatch confirms success (non-null event). If non-deterministic (e.g., "choose which node to keep"), it returns false so the caller can open the relevant editor surface. After fix, diagnostic is re-evaluated and dismissed if resolved.
- Deterministic fixes: `EDIT_ENTITY_OUT_OF_BOUNDS` (clamps entity position to canvas bounds via `entity:move`), `EDIT_TILE_OUT_OF_BOUNDS` (clamps tile coordinates to layer bounds via `tile:set`), `EDIT_ASSET_REF_INVALID` (clears invalid sprite/animation reference via `entity:updateVisual` while preserving valid fields), `EDIT_LAYER_MISSING` (re-routes tile edit to fallback layer with clamped coordinates), `EDIT_DUPLICATE_ENTITY_NAME` (renames entity to deterministic unique suffix via `entity:rename`).
- Data: Fix action dispatches a command through the CommandBus. Diagnostic re-validation runs.
- Validation: Auto-fix must be idempotent. Re-running on an already-fixed state is a no-op. Dispatch failure preserves the diagnostic.
- Tests: Done -- `editor-app.test.ts`.

### `UI-ONBOARD-001` Welcome dashboard checklist progression
- Action: User starts from welcome dashboard and completes guided checklist steps.
- Behavior: Checklist reflects real editor events (project created, map edited, playtest entered, etc.) and marks progress deterministically.
- Data: Onboarding progress state mutates per user/project profile.
- Validation: Step completion is event-driven; manual overrides are explicit and logged.
- Tests: Planned -- `onboarding-checklist.test.ts`.

### `UI-DASH-001` Dashboard entry routing and project launch
- Action: App starts or user triggers Home from editor shell.
- Behavior: Entry follows dashboard/onboarding preferences (`openLastProjectOnLaunch`, `showDashboardOnLaunch`) without blocking project open paths.
- Data: Session navigation state mutates; optional last-project pointer updates.
- Validation: Invalid last project reference falls back to dashboard with non-fatal diagnostic.
- Tests: Planned -- `dashboard-routing.test.ts`.

### `UI-DASH-002` Recent project health badges
- Action: Dashboard loads recent projects.
- Behavior: Each recent project card shows deterministic health badge (`ready`, `warnings`, `needs_fixes`) from metadata-first diagnostic scan.
- Data: Dashboard view model stores badge state per project entry.
- Validation: Deep validation is deferred until explicit open/repair action; dashboard load remains non-blocking.
- Tests: Planned -- `dashboard-health.test.ts`.

### `UI-ONBOARD-002` Onboarding preference persistence
- Action: User toggles onboarding settings or resets onboarding state.
- Behavior: Preferences persist across sessions and apply immediately to dashboard/checklist/tips behavior.
- Data: Onboarding settings object mutates in user preferences store.
- Validation: Reset action clears onboarding progress without mutating project content.
- Tests: Planned -- `onboarding-preferences.test.ts`.

### `UI-ONBOARD-003` Beginner/pro mode surface gating
- Action: User switches onboarding mode (`beginner` or `pro`).
- Behavior: Beginner mode collapses advanced controls and enables guidance surfaces; pro mode exposes full controls and minimizes guidance prompts.
- Data: UI mode preference mutates; panel visibility state recalculates.
- Validation: Mode switch is non-destructive and reversible at runtime.
- Tests: Planned -- `onboarding-mode-switch.test.ts`.

### `UI-VISUAL-001` Tokenized shell rendering baseline
- Action: Shell and workspace surfaces render in dark/light + comfort/dense configurations.
- Behavior: UI components resolve style values from visual tokens only (no hardcoded theme constants in component surfaces).
- Data: Theme/density preference state mutates and drives token resolution.
- Validation: Focus ring and reduced-motion accessibility behaviors remain active in all themes/modes.
- Tests: Done -- `visual-tokens.test.ts` (10 tests).

### `UI-VISUAL-004` Accessibility normalization and workspace consistency
- Action: All interactive surfaces have a consistent focus ring; disabled state opacity is centralized; reduced-motion coverage is verified.
- Behavior: `:focus-visible` covers `button`, `input`, `select`, `textarea`, `a`, and `[tabindex]` elements. A centralized `:disabled` rule in `accessibility.css` provides `opacity: var(--opacity-disabled)` and `cursor: default` for all form controls. The `button:hover` hover state is guarded with `:not(:disabled)`. Inline disabled overrides removed from workspace CSS.
- Data: `--opacity-disabled: 0.4` semantic token added to `tokens.css`. No project data changes.
- Validation: `visual-accessibility.test.ts` verifies focus-visible coverage, reduced-motion clamping, disabled normalization, and workspace consistency fixes.
- Tests: `visual-accessibility.test.ts` (10 tests, green).

### `UI-VISUAL-003` Token compliance lint gate
- Action: CSS files outside `tokens.css` are statically verified to contain no `--prim-*` references and no raw hex values.
- Behavior: Any `--prim-*` usage in component, layout, workspace, or accessibility CSS is a build failure. All component surfaces must use semantic aliases only. `tokens.css` is the sole file permitted to define or reference primitives.
- Data: Pure static analysis; no runtime or project data involved.
- Validation: Compliance tests in `visual-tokens.test.ts` catch any new violations immediately. Existing violations fixed: `--prim-size-xs` in density override (replaced with `--text-xs`); `--prim-blue-400` in sprite swatch (replaced with `--accent-highlight`).
- Tests: `visual-tokens.test.ts` (3 new compliance tests: no-prim-outside-tokens, no-raw-hex-outside-tokens, accent-highlight-alias-exists).

### `UI-VISUAL-002` CSS modularization and density decoupling
- Action: (Slice A) All CSS loaded from modular stylesheet files linked in `<head>`. (Slice B) Density switches without changing onboarding mode.
- Behavior: Slice A -- pure CSS refactor; same selectors and values as UI-VISUAL-001 baseline, extracted into 6 deterministic `<link>`-loaded stylesheets (`tokens`, `base`, `layout`, `components`, `workspaces`, `accessibility`). Slice B -- `[data-density="comfort|dense"]` attribute decoupled from `[data-mode]`; density vars no longer live in mode selector.
- Data: Slice A -- pure refactor, no data contract changes. Slice B -- `data-density` root attribute; `EditorShellController` density toggle method.
- Validation: Slice A -- `visual-tokens.test.ts` passes reading CSS files (not `app.html`). Slice B -- `visual-density.test.ts` verifies `[data-density="dense"]` exists with overrides and `[data-mode="pro"]` no longer contains density vars.
- Tests: Slice A -- `visual-tokens.test.ts` (10 tests, updated to read CSS files). Slice B -- `visual-density.test.ts` (6 tests, green).

---

## Animation Panel

### `ANIM-PANEL-001` Clip selection and preview binding
- Action: User selects an animation clip from the animation panel list.
- Behavior: Selection binds the panel to the selected entity's `animationClipId`. Panel supports:
  - anchor upsert/remove via `animation:anchor:add|move|remove`
  - slot attach/detach/update-occlusion via `entity:slot:attach|detach|setOcclusion`
  Missing entity or clip falls back to explicit empty-state messages.
- Data: `animationPanel.selectedEntityId` (UI state) mutates. Mutations flow only through command bus handlers in runtime-web.
- Validation: Anchor upsert dispatches `move` when `(anchorName, frame)` already exists, else `add`. Slot attach requires parent entity id and rejects duplicates/cycles through runtime validation.
- Tests: Done -- `animation-panel-controller.test.ts` (render states, anchor add/move dispatch, slot attach/occlusion dispatch, dispose path).

---

## Story Panel

### `STORY-PANEL-001` Graph selection and inspector binding
- Action: User selects a quest node in story panel and applies edits.
- Behavior: Story inspector binds to selected node and exposes editable `name` and `kind`. Graph data mutates only after explicit apply action.
- Data: `selectedQuestNodeId` (UI state) mutates; `questGraph.nodes[]` mutates on apply; save/load persists `story.questGraph`.
- Validation: Selected node must exist in current quest graph; stale selection is cleared on project load/new project.
- Tests: Done -- `story-panel-controller.test.ts`, `editor-app.test.ts`.

---

## Animation Clips

### `ANIM-CLIP-001` Create and delete clip
- Action: User creates a new animation clip or deletes an existing one.
- Behavior: Create initializes clip with defaults (`fps: 12`, `loopMode: 'loop'`, `frameCount: 1`). Delete removes clip and any transitions referencing it. Both produce undo entries.
- Data: Create appends to `AnimationClipDef[]`. Delete removes by `id` and filters `AnimationTransitionDef[]`.
- Validation: Clip `id` must be unique. Delete of a clip referenced by an active entity's `animationClipId` emits a warning diagnostic.
- Tests: Planned -- `animation-editor.test.ts`.

### `ANIM-CLIP-002` Edit keyframes
- Action: User adds, removes, or moves a keyframe in the timeline.
- Behavior: Add inserts a keyframe at the specified frame index with interpolated or default values. Remove deletes the keyframe. Move changes the frame index. Each operation is one undo entry.
- Data: Keyframe array within the clip mutates. `frameCount` auto-adjusts if the last keyframe extends beyond current count.
- Validation: Frame index must be >= 0. Cannot remove the only keyframe in a clip. Duplicate frame indices are rejected.
- Tests: Planned -- `animation-editor.test.ts`.

### `ANIM-CLIP-003` Timeline scrub and preview
- Action: User drags the timeline playhead or clicks a frame.
- Behavior: Canvas preview updates to show the interpolated frame state at the playhead position. Scrubbing is real-time (no debounce). Preview respects the clip's `fps` for playback but allows frame-by-frame scrub.
- Data: `previewFrame` (transient UI state, not persisted). No project data mutation.
- Validation: Playhead must be within `[0, frameCount - 1]`.
- Tests: Planned -- `animation-editor.test.ts` (state only; visual tests are manual).

### `ANIM-CLIP-004` Playback modes
- Action: User sets clip loop mode to `once`, `loop`, or `pingpong`.
- Behavior: `once` plays frames 0->N then stops. `loop` plays 0->N->0->N continuously. `pingpong` plays 0->N->0 continuously (reverse on boundary). Matches Rust `LoopMode` enum and TS `LoopMode` type.
- Data: `AnimationClipDef.loopMode` mutates. Produces undo entry.
- Validation: Value must be one of the `LoopMode` union members.
- Tests: `animation-player.test.ts` (existing), `animation-editor.test.ts` (planned UI test).

---

## Animation Anchors

### `ANIM-ANCHOR-001` Define anchor point
- Action: User places or moves an anchor point on a sprite frame.
- Behavior: Anchor is a named 2D offset relative to the sprite origin. Each frame can have independent anchor positions for animation. Anchor names are freeform strings (e.g., `"hand_r"`, `"head"`, `"fx_origin"`).
- Data: `AnchorKeyframe { frame, pos, rot?, flip? }` per named anchor. Stored in `AnimationClipDef.anchors` keyed by name. Commands: `animation:anchor:add|move|remove` with undo/redo. `resolveAnchorPosition` helper interpolates position at any frame.
- Validation: Anchor name must be non-empty. Position can be outside sprite bounds. Commands return null for unknown clipId or frame.
- Tests: Done -- `animation-anchor.test.ts` (add/move/remove commands, unknown-id guard, undo, resolveAnchorPosition exact/interpolate/clamp/missing).

### `ANIM-ANCHOR-002` Slot attachment
- Action: User attaches child sprite/entity to a parent's anchor point.
- Behavior: Child entity follows the parent anchor position each frame. Slot system supports `socket` and `prop` slot types. Attachment is a runtime relationship, not baked into the sprite.
- Data: `SlotAttachment { slotName, slotType, parentEntityId, anchorName, occlusionHint }` in `EntityDef.slots[]`. Commands: `entity:slot:attach` (with circular-attachment guard via `detectCircularAttachment`) and `entity:slot:detach` with undo/redo. Entity schema updated with `slots` property and `entity_with_slots.v2.json` fixture added.
- Validation: Circular attachments rejected deterministically (sort by id, DFS). Schema validates slotType enum and occlusionHint enum.
- Tests: Done -- `animation-anchor.test.ts` (attach, circular-block, detach commands; detectCircularAttachment true/false); `schema-validation.test.ts` (validates entity_with_slots fixture; rejects invalid occlusionHint).

### `ANIM-ANCHOR-003` Occlusion layer hints
- Action: User sets occlusion hint on an anchor or slot.
- Behavior: Occlusion hints control render order for attached children relative to the parent sprite. Values: `in-front`, `behind`, `auto`. `auto` is resolved at runtime via `resolveOcclusionOrder` using anchor Y vs parent half-height. No renderer sort integration this cycle (data + helper only).
- Data: `occlusionHint: OcclusionHint` on `SlotAttachment`. Command: `entity:slot:setOcclusion` with undo/redo.
- Validation: Value must be one of the `OcclusionHint` union members (`in-front` | `behind` | `auto`).
- Tests: Done -- `animation-anchor.test.ts` (setOcclusion command; resolveOcclusionOrder in-front/behind).

---

## Behavior Authoring

### `BEHAV-ROW-001` Event row authoring (MVP)
- Action: User creates/edits behavior rows using Trigger -> Conditions -> Actions.
- Behavior: Rows execute deterministically in entity/row order within trigger scope. Runtime supports `on:tick` plus context-scoped `on:interact`, `on:collision`, and `on:proximity` evaluation.
- Data: Behavior document mutates in one canonical IR format; no per-view forked storage.
- Validation: Trigger, condition, and action references must resolve to known types. Invalid rows emit actionable diagnostics. Runtime enforces a deterministic per-evaluate row budget.
- Tests: `behavior-rows.test.ts`, `playtest-runner.test.ts`.

### `BEHAV-PICK-001` Picker/selection-set semantics (MVP)
- Action: User assigns row targets (e.g., `This Entity`, `Entities with tag`, `Entities in radius`).
- Behavior: Conditions filter the active selection set; actions execute against the resulting set. Selection evaluation order is deterministic for stable replay. `entity_in_radius` executes through deterministic distance checks. Action target resolution uses the same deterministic resolver for `this`/`tag`/`radius`.
- Data: Target selectors are stored as part of behavior IR condition/action operands.
- Validation: Target queries must be type-safe and scope-safe. Empty selections are valid and do not throw.
- Tests: `behavior-picker.test.ts`, `behavior-targeting.test.ts`, `playtest-runner.test.ts`.

### `BEHAV-DEBUG-001` Behavior execution trace (MVP)
- Action: User inspects behavior execution during playtest.
- Behavior: Tool records a deterministic trace: trigger result, condition pass/fail, action dispatch outcome. Failed conditions include "why not" details. Dispatch-ready action types include `log`, `set_velocity`, and `destroy_self` (execution is deterministic in playtest runner). Runtime enforces deterministic per-row action budget guardrails.
- Data: Ephemeral trace buffer in playtest/debug state; optional export as replay-attached artifact.
- Validation: Trace must not mutate gameplay state. Trace ordering must match execution ordering.
- Tests: `behavior-debug-trace.test.ts`, `playtest-runner.test.ts`.

### `BEHAV-DEBUG-002` Behavior guardrail overflow diagnostics (playtest-time)
- Action: Author runs a playtest step where the global row cap (256) or the per-row action cap (16) is exceeded.
- Behavior: BehaviorEvaluator tracks overflow state per evaluate() call. PlaytestRunner merges overflow across all trigger passes (on:tick, on:interact, on:collision, on:proximity) and exposes it via getLastStepOverflow(). EditorShellController reads the overflow after each step and writes BEHAV_ROW_CAP_EXCEEDED / BEHAV_ACTION_CAP_EXCEEDED diagnostics to DiagnosticStore. Diagnostics use stable IDs so the Tasks panel does not churn. Overflow state is cleared and diagnostics removed when playtest exits.
- Data: BehaviorEvalOverflow { rowCapHit: boolean; actionCapHits: readonly { entityId, rowId }[] }. Diagnostic IDs: editor:BEHAV_ROW_CAP_EXCEEDED:playtest (global), editor:BEHAV_ACTION_CAP_EXCEEDED:{entityId}:{rowId} (per row). actionCapHits are deduplicated per (entityId, rowId) within a step.
- Validation: Cap values (256 rows, 16 actions/row) must appear in diagnostic messages. actionCapHits must be deduplicated -- the same (entityId, rowId) pair must never appear twice in a single step report. Overflow is playtest-time only; edit-time lint is a separate deferred slice.
- Tests: `behavior-guard.test.ts` (6 tests).

### `BEHAV-GRAPH-001` Node graph view round-trip (Post-V2)
- Action: User edits behavior in graph view.
- Behavior: Graph edits compile to the same Behavior IR used by event rows; switching views preserves semantics.
- Data: No separate graph-only storage format for runtime behavior.
- Validation: Graph cycles/invalid links are surfaced as diagnostics with repair guidance.
- Tests: Planned -- `behavior-graph-roundtrip.test.ts`.

### `BEHAV-CODE-001` Sandboxed code action blocks (Post-V2)
- Action: User inserts a script/code action block in behavior.
- Behavior: Script action executes through sandboxed deterministic runtime and compiles into the same behavior execution pipeline.
- Data: Script block metadata stored as behavior action node with capability-scoped API surface.
- Validation: No unrestricted host access; nondeterministic APIs are blocked by policy.
- Tests: Planned -- `behavior-code-sandbox.test.ts`.

---

## Sprite Workspace (Planned)

### `SPRITE-EDIT-001` Pixel-safe sprite editing
- Action: User edits sprites in Sprite Workspace with pixel-safe mode enabled.
- Behavior: Editing prevents anti-aliased strokes and unintended color noise when pixel-safe mode is active.
- Data: Sprite asset pixels mutate non-destructively in editor buffer and persist on save/apply.
- Validation: Pixel-safe mode must not alter unchanged pixels.
- Tests: Planned -- `sprite-editor.test.ts`.

### `SPRITE-STYLE-001` Palette/style lint and auto-fix
- Action: User runs style lint on sprite or tileset content.
- Behavior: Lint reports palette violations, stray colors, and rule violations with deterministic fix suggestions.
- Data: Diagnostics/tasks emitted; optional fixes apply deterministic remaps only.
- Validation: Lint results are deterministic for identical inputs.
- Tests: Planned -- `sprite-style-lint.test.ts`.

### `SPRITE-BRUSH-001` Smart brush behavior
- Action: User applies smart brush tools (scatter/tile-safe/cluster-aware).
- Behavior: Brush output respects active constraints and uses deterministic seed/path for repeatable results.
- Data: Target sprite/tile data mutates through brush operation batch.
- Validation: Same inputs + seed produce identical outputs.
- Tests: Planned -- `sprite-smart-brush.test.ts`.

---

## Tile Mapping (Active)

### `TILE-RULE-001` Rule-based tile mapping behavior
- Action: User selects Rule Paint tool and paints on the tile canvas.
- Behavior: 2-pass algorithm -- intent pass sets base tile for painted cells; resolve pass recomputes cardinal adjacency mask for each affected cell and its 1-ring neighbors, then selects the matching tile variant from the active ruleset.
- Data: Map tile layer mutates. All writes batched into one undo unit (beginUndoBatch/endUndoBatch).
- Validation: Missing mask variants fall back to fallbackTileId. Invalid rulesets emit TILE_RULESET_INVALID diagnostic. Missing variants emit TILE_RULE_MISSING_VARIANT warning.
- Determinism: Same layer state + same painted cells + same ruleset => identical output. No random choice in resolution path.
- Tests: `tile-rule-engine.test.ts`.

---

## Effects Workspace

### `FX-PRESET-001` Atmosphere preset application
- Action: User applies an effects preset (e.g., rain, fog, night tint).
- Behavior: Preset updates effect parameters atomically through `effects:applyPreset` command and remains reversible through undo/redo.
- Data: Map-level effect state mutates in `ProjectStore.effectState` and persists via save/load.
- Validation: Unknown preset IDs are rejected with `EFFECT_PRESET_UNKNOWN` diagnostic and no state mutation.
- Tests: `effects-presets.test.ts`.

### `FX-FIELD-001` Field-driven effects coupling
- Action: User links effects behavior to world fields (e.g., wind influences particles).
- Behavior: Effect overlay intensity samples linked field values deterministically in playtest ticks. Effective intensity uses base intensity blended by configured field influence.
- Data: `ProjectStore.effectState.fieldLink` mutates through command path (`effects:setFieldCoupling`) and persists in save/load.
- Validation: Linked field ID must exist in built-in field catalog and match scalar type; unknown IDs are rejected with `EFFECT_FIELD_UNKNOWN`.
- Tests: `effects-field-coupling.test.ts`, `project-store.test.ts`.

---

## Export Workspace

### `EXPORT-PREFLIGHT-001` Export preflight validation
- Action: User opens export workflow or runs export.
- Behavior: System runs deterministic preflight checks and surfaces blocking/non-blocking issues in Tasks and Export panel UI. Build action is blocked until report is non-blocking.
- Data: Preflight report emitted; project data is not mutated by preflight execution.
- Validation: Blocking issues prevent export start.
- Tests: `export-preflight.test.ts`, `export-preflight-ui.test.ts`.

### `EXPORT-BUILD-001` Deterministic export build baseline
- Action: User builds web export from the same project state and seed.
- Behavior: Build artifacts and manifest metadata are reproducible for equivalent inputs.
- Data: Export output package + bake/provenance report generated.
- Validation: Build includes versioned metadata and compatibility markers.
- Tests: `export-build.test.ts`, `export-preflight-ui.test.ts`.

---

## UI Shell Stabilization

### `UI-SHELL-001` Tab navigation bar
- Action: User clicks a tab button in the bottom tab bar.
- Behavior: Only the clicked tab's panel becomes visible; all other panels are hidden via CSS class toggle only (panels remain in DOM). Active tab button shows accent border and raised background. Tab buttons are keyboard-focusable with visible focus ring.
- Data: `activeTab` UI state mutates (no project data mutation).
- Validation: Non-existent tab ID is a no-op. Initial active tab is `tasks`.
- Tests: `tab-navigation.test.ts`.

### `UI-SHELL-002` Modal/dialog system
- Action: User triggers a destructive action (e.g., New Project, Load Project) with unsaved changes, or system needs user confirmation.
- Behavior: Modal opens with title, message, confirm, and optional cancel button. Focus moves to confirm button on open. Tab key cycles only within modal box (focus trap). Escape = cancel; Enter = confirm. `aria-hidden` toggled on overlay. Focus restores to trigger element on close. Error modals hide the cancel button.
- Data: No project data mutation. `isDirty` state inspected (not mutated) to decide whether to show modal.
- Validation: Modal open/close state is synchronous. Cannot open two modals simultaneously.
- Tests: `modal.test.ts`.

### `UI-HOTKEY-001` Keyboard shortcuts
- Action: User presses a keyboard shortcut while editor shell is focused.
- Behavior: `Ctrl+Z` triggers undo and refreshes undo/redo button state. `Ctrl+Y` / `Ctrl+Shift+Z` triggers redo. `S` switches to select tool, `P` to paint, `E` to erase. `Space` enables viewport pan mode (cursor: grab) when playtest is stopped; `Space` triggers a playtest step when playtest is running or paused. `Escape` hides open modal. Input elements (`input`, `textarea`, `select`) suppress global shortcuts while focused.
- Data: Tool mode and playtest state may mutate. Undo/redo stack state may mutate.
- Validation: Shortcuts are no-ops when corresponding action is unavailable (e.g., undo when stack is empty). Hotkey handler is attached to `document` and removed on dispose.
- Tests: `keyboard-shortcuts.test.ts`.

### `UI-DIRTY-001` Dirty-state correctness
- Action: User makes changes to the project, saves, or creates/loads a new project.
- Behavior: Snapshot-based dirty detection -- compares current project snapshot to last-saved snapshot. Dirty flag updates after every command-bus event. Flag clears on successful save, new project, or successful load. Undo/redo events also update dirty state correctly (undoing back to saved state clears dirty).
- Data: `isDirty` boolean derived from snapshot comparison. No project data mutation.
- Validation: New project (with default layer) does not trigger spurious dirty state. Save clears dirty immediately on success.
- Tests: `dirty-state.test.ts`.

### `UI-CTX-001` Right-click context menu
- Action: User right-clicks on the editor canvas.
- Behavior: Hit-test selects the entity under the cursor (or uses current selection if cursor is over selected entity). Context menu appears near cursor with relevant actions: Delete Entity (if entity under cursor), Deselect (if selection non-empty), Properties (focuses inspector). Clicking outside or pressing Escape closes menu without action. Menu is positioned within viewport bounds.
- Data: Selection state may mutate on right-click hit-test. Entity deleted via command bus if Delete is chosen.
- Validation: Menu does not appear on empty canvas with no entity hit. Menu closes before any action executes.
- Tests: `context-menu-controller.test.ts`.

### `UI-VIEWPORT-001` Viewport usability baseline
- Action: User zooms or pans the canvas viewport, or presses the Fit button.
- Behavior: Mouse wheel zooms the canvas centered on the cursor position (range 0.25x-4x). Middle-mouse button or Space+left-drag pans the canvas. Space keyup restores cursor. The "Fit" button fits the full map into the visible stage area and centers it. Viewport state (zoom/pan) resets to fit-to-map on New Project, Load, and Apply Map. Canvas hit-tests (tile paint, entity place, entity select) remain pixel-accurate under any zoom/pan transform because `getBoundingClientRect()` returns the transformed visual rect.
- Data: Viewport zoom and panX/panY mutate. No project data mutation.
- Validation: Zoom is clamped to [0.25, 4.0] at all times. fitToMap never scales above 1.0. World point under cursor is fixed during wheel zoom. Pan clears correctly on `dispose()`.
- Tests: `viewport-controller.test.ts` (18 tests).
