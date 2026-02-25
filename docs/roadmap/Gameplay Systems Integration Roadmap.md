# Gameplay Systems Integration Roadmap

Last updated: 2026-02-20
Purpose: Map identified gameplay system gaps into existing architecture with clean, testable implementation slices.

Source: Analysis of Design Doc v1.1, Sprint Plan, engine-core/script-core/export-core architecture, and frontend JS layer.

## Context

After completing P0-1 (script runtime), P0-2 (scene/level system), P0-3 (collision + components), P1-1 (CI quality gates), and P1-2 (export-core modularization), an audit identified foundational gameplay systems needed to support the full range of target game types (Tetris, Zelda, Final Fantasy, Mario, Chrono Trigger, and beyond). Additionally, several 3D-engine techniques were identified that accelerate 2D workflows.

This document maps each system to its architectural home, sprint placement, dependencies, and slicing strategy.

## Animation Completion Program (2026-02-20 Addendum)

This addendum defines the remaining animation-specific work to reach a modern "animation studio" level while preserving stability.

### A-1 Asset-Bound Animation Runtime (next)
- Move from primarily entity-inline clip/state data to graph-asset-driven runtime binding.
- Keep backward compatibility:
  - load legacy inline animation data
  - migrate to asset references on save
  - preserve deterministic playtest/export behavior
- Acceptance:
  - legacy projects open unchanged
  - new projects save/load graph asset references
  - desktop/web playtest parity on active state + frame output

### A-2 Motion Fluidity (blend + locomotion)
- Add transition blending:
  - crossfade duration in ticks
  - optional phase sync for locomotion transitions
- Add locomotion blend mapping driven by speed tier/parameter (idle/walk/run continuity).
- Add transition hysteresis/dead-zones to avoid state flicker near thresholds.
- Acceptance:
  - idle->walk->run transitions are visually smooth without threshold chatter
  - blend behavior deterministic in unit tests

### A-3 Cancel Windows (responsiveness)
- Add optional per-state cancel windows:
  - normal cancel
  - special cancel
  - hit/block cancel
- Keep canceling data-driven per clip/state and optional (beginner defaults remain simple).
- Acceptance:
  - transition allowed only inside configured windows
  - deterministic combat-style interrupt behavior validated by tests

### A-4 Scripting Integration Policy (beginner + custom)
- Beginner scripting:
  - expose guided animator controls (bool/int/trigger presets)
  - avoid requiring raw graph authoring for first success
- Custom scripting:
  - direct animator param writes for advanced behavior
  - state machine remains authoritative consumer
- Acceptance:
  - same animation behavior can be driven by beginner presets or custom script events
  - no direct bypass path that desynchronizes runtime state machine

### A-5 Sequencer Expansion (camera + effects)
- Sequencer track types:
  - animation state/clip track
  - camera position track
  - camera zoom track
  - script event track
  - audio trigger track
- Add VFX trigger support (event/notify-based first; full particle authoring later).
- Acceptance:
  - authored camera movement/zoom plays in desktop and web
  - sequencer event timing parity with export runtime

### A-6 Documentation/Manual Track (parallel, required)
- Deliver user-facing docs with each sprint:
  - `docs/animation/Quickstart.md`
  - `docs/animation/State-Machine-Guide.md`
  - `docs/animation/Flipbook-Guide.md`
  - `docs/animation/Sequencer-Guide.md`
  - `docs/animation/Troubleshooting.md`
- Add in-product help links/tooltips to these docs as features ship.
- Acceptance:
  - a new user can complete "import sprite -> create clip -> create graph -> bind entity -> playtest"
    using docs only
  - docs remain aligned with command/payload contracts

## Invariants (from Design Doc)

Every system below must respect:
1. Preview = Export (same runtime for both)
2. Every edit is undoable
3. No hot-path IPC (simulation stays in Rust — native for desktop, WASM for browser)
4. Profiles enforce constraints
5. Beginner-first (each system must have sensible defaults)

## Architecture Placement Summary

| System | Backend Crate | Backend Module | Frontend Module(s) | Design Doc Section |
|--------|--------------|----------------|--------------------|--------------------|
| Movement | engine-core | `movement.rs` (new) | ui-playtest.js | S4 Engine Design, S7 Map Editor |
| Velocity/Physics | engine-core | `physics.rs` (new) | ui-playtest.js | S4 Engine Design (fixed timestep) |
| Input Action Mapping | engine-core | `input.rs` (new) | ui-editor-input.js, project-api.js | S10 Scripting (event nodes) |
| Camera System | engine-core | `camera.rs` (new) | ui-playtest.js | S4 Engine Design (viewport) |
| Persistent State | script-core | extend runtime.rs | project-api.js | S10 Scripting (scoped vars) |
| Prefab/Template | engine-core | `prefab.rs` (new) | project-api.js, ui-entity-list.js | S7 Tool Suite (templates), S5 Data Format |
| Runtime Spawning | script-core + engine-core | extend runtime.rs + scene.rs | project-api.js | S10 Scripting (action nodes) |
| Animation State Machine | engine-core | `animation.rs` (new) | ui-playtest.js | S7 Animation Lab |
| Game UI Layer (HUD) | export-core + engine-core | extend types.rs + new `hud.rs` | ui-playtest.js (new overlay) | S4 Multi-pass rendering |
| Viewport Gizmos | frontend only | n/a | `ui-gizmos.js` (new) | S7 Tool Suite |
| Live Edit During Play | engine-core + frontend | extend editor_runtime.rs | ui-map-interaction.js | S7 "preview-from-here" |
| Timeline/Sequencer | engine-core + frontend | `timeline.rs` (new) | `ui-timeline.js` (new) | S7 Animation Lab |

## Sprint Placement

### Sprint 2 Extension (Current — Runtime Vertical Slice)

These complete the "playable map flow" objective already defined for Sprint 2.

#### S2-G0: Tile Properties (Pre-requisite)
**Crate**: `engine-core`
**Extends**: `map_editor.rs`, `collision.rs`

**What it does**: Adds a tile property registry so the collision/movement systems can distinguish solid tiles from walkable ones. Without this, movement + tile collision cannot function.

**Types**:
- `TileProperties`: solid (bool), default: solid=true
- `TilePropertyRegistry`: HashMap<TileId, TileProperties> with default-solid convention

**Design choice**: All tiles are solid by default (matches retro convention — placed tiles = walls). Users override specific tile IDs as non-solid for floor/decoration tiles.

**Integration**:
- `MapEditorState` gains `tile_properties` field
- `check_tile_collisions` gains `would_block` variant that filters by solid flag
- Movement system uses this to block movement into solid tiles

**Slices**: Single slice — types + registry + collision integration + tests.

**Tests**: Solid/non-solid tile filtering, default-solid behavior, registry CRUD.

---

#### S2-G1: Movement System
**Crate**: `engine-core`
**New module**: `src/movement.rs`
**Extends**: `components.rs`, `editor_runtime.rs`

**What it does**: Defines movement archetypes that cover the target game range.

**Types**:
- `MovementMode` enum: `GridSnap` (Zelda/Tetris), `FreeMove` (Mario), `TurnBased` (FF/Chrono)
- `MovementComponent`: speed, movement_mode, facing_direction
- Movement system function: `apply_movement(entities, components, input, delta) -> Vec<MovementEvent>`

**Integration point**: Called inside `tick_playtest()` after script event processing, before collision resolution.

**Slices**:
1. **Slice A**: Add `MovementComponent` to `components.rs`, add `movement.rs` with `GridSnap` mode only. Unit tests for grid-snap movement (8px steps). (~30 min)
2. **Slice B**: Wire into `editor_runtime::tick_playtest()` — movement reads input state, applies grid-snap, checks collision via existing `would_collide_with_entities()`. Integration tests. (~30 min)
3. **Slice C**: Add `FreeMove` mode (sub-pixel accumulator, variable speed). Add `TurnBased` mode (queued moves, turn counter). Unit tests per mode. (~45 min)

**Tests**: Movement unit tests per mode + integration tests for tick-driven movement.

**Depends on**: P0-3 collision (DONE)

---

#### S2-G2: Velocity / Physics Step
**Crate**: `engine-core`
**New module**: `src/physics.rs`
**Extends**: `components.rs`, `editor_runtime.rs`

**What it does**: Adds velocity-based motion with simple 2D physics (gravity, friction, acceleration). Essential for platformers (Mario) and action games.

**Types**:
- `VelocityComponent`: vx, vy (f32), acceleration, friction, gravity_scale
- `PhysicsConfig`: global gravity (default 0 for top-down, configurable for platformer)
- Physics system function: `physics_step(entities, velocities, collisions, config, dt)`

**Integration point**: Called inside `tick_playtest()` between movement application and collision resolution.

**Slices**:
1. **Slice A**: Add `VelocityComponent` to `components.rs`, add `physics.rs` with basic velocity integration (position += velocity * dt). Unit tests. (~20 min)
2. **Slice B**: Add gravity + friction. Add collision response (zero velocity on solid collision). Wire into tick loop. Integration tests. (~30 min)
3. **Slice C**: Add `PhysicsConfig` to `EditorRuntime`, expose via invoke command `physics_set_config`. Frontend bridge. (~20 min)

**Tests**: Physics math unit tests + gravity/friction integration tests + collision-stop tests.

**Depends on**: S2-G1 movement, P0-3 collision (DONE)

---

#### S2-G3: Input Action Mapping
**Crate**: `engine-core`
**New module**: `src/input.rs`
**Extends**: `editor_runtime.rs`, frontend `project-api.js`

**What it does**: Maps physical keys to semantic game actions. Decouples input from movement/scripting so the same game logic works across profiles.

**Types**:
- `InputAction` enum: MoveUp, MoveDown, MoveLeft, MoveRight, ActionA, ActionB, Start, Select
- `InputMapping`: HashMap<KeyCode, InputAction> with profile-specific defaults
- `InputState`: currently_pressed: HashSet<InputAction>, just_pressed, just_released

**Integration point**:
- Frontend sends raw key events via invoke command → backend maps to actions
- `tick_playtest()` reads `InputState` to drive movement system and fire script events
- Script events: `input_action_a`, `input_action_b`, `input_start`, etc.

**Profile defaults**:
- GameBoy: Arrow keys + Z(A) + X(B) + Enter(Start) + Shift(Select)
- NES/SNES: Same defaults (remappable)

**Slices**:
1. **Slice A**: Add `input.rs` with `InputAction`, `InputMapping`, `InputState`, profile defaults. Unit tests for mapping + state transitions. (~25 min)
2. **Slice B**: Add invoke commands `input_key_down(key)`, `input_key_up(key)`, `input_get_state()`. Wire into `EditorRuntime`. Frontend bridge sends key events from `ui-editor-input.js`. (~30 min)
3. **Slice C**: Fire script events from input actions during `tick_playtest()`. Integration tests for input → script event → effect chain. (~20 min)

**Tests**: Mapping unit tests + keydown/keyup state tests + input-to-script integration tests.

**Depends on**: P0-1 script runtime (DONE)

---

### Sprint 3 (Command Bus + Inspector Bridge)

These align with Sprint 3's existing objectives around command bus, inspector, and scripting foundation.

#### S3-G1: Camera Following System
**Crate**: `engine-core`
**New module**: `src/camera.rs`
**Extends**: `editor_runtime.rs`, frontend `ui-playtest.js`

**What it does**: Viewport camera that follows entities for scrolling games (Zelda, Mario, FF world maps). For single-screen games (Tetris), camera stays fixed.

**Types**:
- `CameraMode` enum: `Fixed`, `FollowEntity { target_id, deadzone }`, `Lerp { target_id, speed }`
- `CameraState`: position (f32, f32), bounds (Option<Rect>), mode
- Camera system function: `update_camera(camera, entities, viewport) -> CameraOffset`

**Integration point**:
- Updated during `tick_playtest()` after movement
- `CameraOffset` included in `EditorStateResponse` for frontend rendering
- `ui-playtest.js` applies offset when rendering tiles/entities on canvas

**Slices**:
1. **Slice A**: Add `camera.rs` with `Fixed` mode and `FollowEntity` mode. Unit tests for follow logic + bounds clamping. (~25 min)
2. **Slice B**: Wire into `EditorRuntime`, add `camera_state` field. Include camera offset in state response. (~20 min)
3. **Slice C**: Frontend applies camera offset in `renderPlaytestViewport()`. Add `Lerp` mode for smooth following. (~25 min)
4. **Slice D**: Add invoke command `camera_set_mode`. Script action node `SetCamera` for graph-driven camera changes. (~20 min)

**Tests**: Camera math + bounds clamping + follow tracking + frontend rendering offset.

**Depends on**: S2-G1 movement

---

#### S3-G2: Persistent State Across Scenes — **Shipped 2026-02-17**
**Crate**: `script-core`
**Extends**: `runtime.rs`, `editor_runtime.rs`

**What it does**: Distinguishes global state (persists across scene transitions) from scene-local state (resets on scene change). Essential for RPGs (quest progress, inventory) and adventure games (collected items).

**Current state**: `ScriptState` already has `flags` and `variables` that persist across scene transitions in `editor_runtime`. This slice formalizes the scoping.

**Types**:
- `StateScope` enum: `Global`, `Scene`
- Extend `ScriptState`: `global_flags`, `global_variables`, `scene_flags`, `scene_variables`
- `transition_to_scene()` preserves global_*, clears scene_*

**Slices**:
1. **Slice A**: Refactor `ScriptState` to separate global vs scene scope. Backward-compatible: existing flags/variables become global by default. Unit tests for scope separation. (~25 min)
2. **Slice B**: Extend `ScriptNodeBehavior::SetFlag` and `SetVariable` with optional `scope` field (default: Global for backward compat). Update runtime traversal. (~20 min)
3. **Slice C**: `transition_to_scene()` in `editor_runtime` clears scene-scoped state while preserving global. Integration tests for multi-scene state isolation. (~20 min)

**Tests**: Scope separation + scene transition state preservation + backward compatibility.

**Depends on**: P0-1 (DONE), P0-2 (DONE)

---

#### S3-G3: Entity Prefab / Template System
**Crate**: `engine-core`
**New module**: `src/prefab.rs`
**Extends**: `components.rs`, `scene.rs`, `editor_runtime.rs`
**Status**: In progress (Slice A + Slice B complete on 2026-02-19; Slice C adapted via `prefab_stamp` API, command-bus entity-create integration pending)

**What it does**: Reusable entity templates (3D-engine "prefab" concept). Define once, place many. Override specific properties per instance. Essential for level design efficiency and consistent enemy/NPC behavior.

**Types**:
- `PrefabId`: String
- `EntityPrefab`: id, name, default_components (EntityComponents)
- `PrefabLibrary`: HashMap<PrefabId, EntityPrefab>

**Integration point**:
- `EditorRuntime` holds `prefab_library`
- Invoke/API can stamp prefab defaults to a new entity instance via `prefab_stamp`
- Inspector shows inherited vs overridden values (future Sprint 5 UI)

**Slices**:
1. **Slice A**: ~~Add `prefab.rs` with `EntityPrefab`, `PrefabLibrary`, CRUD operations. Unit tests.~~ (Complete 2026-02-19)
2. **Slice B**: ~~Add invoke commands `prefab_create`, `prefab_update`, `prefab_list`, `prefab_delete`. Wire into `EditorRuntime`.~~ (Complete 2026-02-19)
3. **Slice C**: Partial: frontend bridge + runtime stamping landed via `prefab_stamp`; `map_create` now supports optional `prefabId` for standard create-path linkage. Remaining work is deeper command-bus `CreateEntityCommand` prefab linkage and override-edit flow. (~25 min remaining)

**Tests**: Prefab CRUD + entity-from-prefab creation covered for invoke/frontend bridge. Override editing behavior pending.

**Depends on**: P0-3 components (DONE)

---

#### S3-G4: Screen Transitions
**Crate**: `engine-core`
**Extends**: `scene.rs`, `editor_runtime.rs`, frontend `ui-playtest.js`

**What it does**: Visual transitions between scenes (fade-to-black, wipe). Every target game type uses these. Currently scene transitions are instant.

**Types**:
- `TransitionEffect` enum: None, FadeOut, FadeIn, Wipe(direction)
- `TransitionState`: active, effect, progress (0.0..1.0), duration_ticks

**Integration**:
- `transition_to_scene()` starts a transition instead of instant-switching
- `tick_playtest()` advances transition progress
- Frontend renders transition overlay on canvas
- Script node `ChangeScene` gains optional `transition` field (default: FadeOut)

**Slices**:
1. **Slice A**: Add `TransitionEffect`, `TransitionState` to scene.rs. Tick-driven progress. Unit tests. (~20 min)
2. **Slice B**: Wire into editor_runtime + frontend canvas overlay rendering. Integration tests. (~25 min)

**Tests**: Transition progress math, scene-switch timing, frontend overlay rendering.

**Depends on**: P0-2 scenes (DONE), S3-G1 camera

---

### Sprint 4 (Story + Export Parity)

These align with Sprint 4's existing objectives around Event Graph, Story Maker, and export completeness.

#### S4-G1: Runtime Entity Spawning
**Crate**: `script-core` + `engine-core`
**Extends**: `runtime.rs` (ScriptNodeBehavior), `scene.rs`, `editor_runtime.rs`

**What it does**: Script-graph-driven entity creation/destruction during gameplay. Essential for projectiles (Mario fireballs), collectibles, enemy waves, and dynamic world content.

**Types**:
- New `ScriptNodeBehavior` variants: `SpawnEntity { prefab_id, x, y }`, `DespawnEntity { entity_id }`
- New `ScriptEffect` variants: `SpawnEntity`, `DespawnEntity`
- `PlaytestEntityPool`: tracks spawned entities for cleanup on playtest exit

**Integration point**:
- Script graph action nodes trigger spawn/despawn
- `apply_script_effects()` in `editor_runtime` creates/removes entities
- Playtest exit restores original scene state (all runtime-spawned entities removed)

**Slices**:
1. **Slice A**: Add `SpawnEntity` / `DespawnEntity` to `ScriptNodeBehavior` and `ScriptEffect`. Backward-compatible with `#[serde(default)]`. Runtime traversal tests. (~20 min)
2. **Slice B**: Add `PlaytestEntityPool` to `editor_runtime`. `apply_script_effects()` handles spawn (creates entity + components from prefab) and despawn (removes entity). (~30 min)
3. **Slice C**: Playtest exit cleanup. Invoke API exposure. Frontend bridge. Integration tests for spawn-play-despawn-exit lifecycle. (~25 min)

**Tests**: Spawn/despawn effect handling + pool cleanup + scene restore + script graph integration.

**Depends on**: S3-G3 prefabs, P0-2 scenes (DONE)

---

#### S4-G2: Animation State Machine
**Crate**: `engine-core`
**New module**: `src/animation.rs`
**Extends**: `components.rs`, `editor_runtime.rs`

**What it does**: Frame-based sprite animation with state-driven transitions. Essential for character animations (walk cycles, attack frames), environmental animations, and visual feedback.

**Types**:
- `AnimationClip`: frames (Vec<u16>), frame_duration_ticks, loop_mode (Loop, Once, PingPong)
- `AnimationState`: current_clip_name, current_frame_index, ticks_in_frame, playing
- `AnimationComponent`: states (HashMap<String, AnimationClip>), current_state: AnimationState
- `AnimationTransition`: from_state, to_state, condition (flag or input)

**Integration point**:
- `tick_playtest()` advances animation frames after movement/physics
- Current frame index written to `SpriteComponent.frame`
- Script events: `animation_finished`, `animation_state_changed`
- Runtime.js reads frame index to select sprite sheet region

**Slices**:
1. **Slice A**: Add `animation.rs` with `AnimationClip`, `AnimationState`, frame advancement logic. Unit tests for all loop modes. (~25 min)
2. **Slice B**: Add `AnimationComponent` to `components.rs`. Wire frame advancement into `tick_playtest()`. Updates `SpriteComponent.frame`. (~20 min)
3. **Slice C**: Add state transitions (condition-driven). Fire `animation_finished` script event. Integration tests. (~25 min)
4. **Slice D**: Invoke commands for animation control. Frontend bridge. (~20 min)

**Tests**: Frame math per loop mode + state transitions + script event firing.

**Depends on**: P0-3 components (DONE), P0-1 script runtime (DONE)

---

#### S4-G3: Game UI Layer (HUD / Menus)
**Crate**: `engine-core` + `export-core`
**New module**: `engine-core/src/hud.rs`
**Extends**: `types.rs` (export), `editor_runtime.rs`, frontend `ui-playtest.js`

**What it does**: In-game overlay for health bars, score counters, dialog boxes, and menu screens. Rendered as a separate pass on top of the game scene (Design Doc S4: multi-pass rendering).

**Types**:
- `HudElement` enum: `Text { content, x, y }`, `Bar { current, max, x, y, width }`, `Counter { variable, x, y, format }`
- `HudLayout`: Vec<HudElement>, visible: bool
- `HudBinding`: Maps HudElement fields to ScriptState variables

**Integration point**:
- `EditorRuntime` holds `hud_layout`
- `tick_playtest()` resolves variable bindings (e.g., `player_hp` → health bar current value)
- Frontend renders HUD as canvas overlay after scene render
- Export runtime renders same HUD layer (Preview = Export invariant)

**Slices**:
1. **Slice A**: Add `hud.rs` with `HudElement`, `HudLayout`, `HudBinding`. Unit tests for binding resolution. (~25 min)
2. **Slice B**: Wire into `EditorRuntime`. Add HUD state to `EditorStateResponse`. Invoke commands for HUD element CRUD. (~25 min)
3. **Slice C**: Frontend renders HUD overlay in `ui-playtest.js` canvas. Text and bar elements. (~30 min)
4. **Slice D**: Export runtime renders matching HUD. Parity test. (~20 min)

**Tests**: Binding resolution + layout positioning + export parity.

**Depends on**: S3-G2 persistent state (for variable bindings)

---

### Sprint 5 (UX Polish + Accessibility)

These align with Sprint 5's focus on usability, interaction quality, and advanced features.

#### S5-G1: Viewport Gizmos
**Location**: Frontend only
**New module**: `ui-gizmos.js`
**Extends**: `ui-map-interaction.js`, `ui-canvas-renderer.js`

**What it does**: Visual editing handles borrowed from 3D editors. Resize collision boxes, visualize spawn points, preview patrol routes. Makes the editor feel professional and reduces guess-and-check workflows.

**Gizmo types**:
- Collision box resize handles (corner + edge)
- Spawn point markers (with name labels)
- Entity bounding box outlines on hover
- Patrol route path visualization (Tier 1.5 Design Doc item)

**Slices**:
1. **Slice A**: Collision box resize handles. Drag corners to resize, updates component via invoke command. (~30 min)
2. **Slice B**: Spawn point markers. Render named markers at spawn positions with labels. (~20 min)
3. **Slice C**: Entity hover outlines. Show bounding box on mouseover before selection. (~15 min)

**Tests**: E2E gizmo interaction tests via Playwright.

**Depends on**: P0-3 components (DONE), S3-G3 prefabs

---

#### S5-G2: Live Editing During Play
**Extends**: `editor_runtime.rs`, `ui-map-interaction.js`

**What it does**: Modify entity positions and state variables while playtest is running, without exiting and re-entering. Changes are marked as temporary (playtest-only) unless explicitly committed. Borrowed from Unity/Godot "play mode" editing.

**Integration point**:
- `ui-map-interaction.js` allows entity drag during playtest (currently disabled)
- Watch panel already shows flags/variables — extend with inline editing
- Add "Commit" action to persist playtest changes back to editor state

**Slices**:
1. **Slice A**: Allow entity position changes during playtest via new invoke command `playtest_move_entity`. Tracks modified entities in `PlaytestEntityPool`. (~25 min)
2. **Slice B**: Watch panel variable editing. Click variable value to modify during playtest. (~20 min)
3. **Slice C**: "Commit playtest changes" action. Copies playtest entity positions back to map state. Command-bus integration for undo. (~25 min)

**Tests**: Playtest modification + commit/discard lifecycle tests.

**Depends on**: S2-G1 movement, S2-G3 input

---

#### S5-G3: Timeline / Sequencer (Foundation)
**Crate**: `engine-core`
**New module**: `src/timeline.rs`
**Frontend**: `ui-timeline.js` (new)

**What it does**: Keyframe-based property animation for cutscenes, dialog sequences, and complex choreography. Connects to Story Maker (Sprint 4) and Animation Lab (Design Doc S7).

**Types**:
- `Keyframe<T>`: time (ticks), value: T, easing: EasingCurve
- `Timeline`: Vec<Track>, duration_ticks, loop_mode
- `Track`: target_entity, property (position.x, opacity, etc.), keyframes

**Note**: This is a foundation slice. Full UI is backlog (v1+). The runtime data model and tick-driven evaluation land here.

**Slices**:
1. **Slice A**: Add `timeline.rs` with `Keyframe`, `Track`, `Timeline`, `evaluate_at(tick)` interpolation. Unit tests for linear + easing. (~30 min)
2. **Slice B**: Wire into `tick_playtest()` for cutscene playback. Script action node `PlayTimeline { timeline_id }`. (~25 min)

**Tests**: Interpolation math + easing curves + timeline playback integration.

**Depends on**: S4-G2 animation

---

## Dependency Graph

```
S2-G0 Tile Properties ───────── S2-G1 Movement System (needs solid tile data)

P0-1 Script Runtime (DONE) ──┬── S2-G3 Input Action Mapping
                              ├── S3-G2 Persistent State
                              ├── S4-G1 Runtime Spawning
                              └── S4-G2 Animation State Machine

P0-2 Scene System (DONE) ────┬── S3-G2 Persistent State
                              ├── S3-G4 Screen Transitions
                              └── S4-G1 Runtime Spawning

P0-3 Collision (DONE) ───────┬── S2-G0 Tile Properties
                              ├── S2-G1 Movement System
                              ├── S2-G2 Velocity/Physics
                              ├── S3-G3 Prefab System
                              └── S5-G1 Gizmos

S2-G1 Movement ──────────────┬── S2-G2 Velocity/Physics
                              ├── S3-G1 Camera Following
                              └── S5-G2 Live Edit During Play

S2-G3 Input ─────────────────── S5-G2 Live Edit During Play

S3-G1 Camera ────────────────── S3-G4 Screen Transitions

S3-G2 Persistent State ──────── S4-G3 HUD Layer

S3-G3 Prefabs ───────────────── S4-G1 Runtime Spawning

S4-G2 Animation ──────────────── S5-G3 Timeline
```

## Implementation Rules

These rules apply to every slice above:

1. **Test-first gating**: Every slice ends with `cargo test --workspace` + `cargo clippy --workspace --all-targets -- -D warnings` passing. Frontend slices also pass `npm test` + `npm run lint` + `npm run typecheck`.

2. **Update 3 docs per slice**:
   - `docs/CHANGELOG.md` — append entry
   - `docs/sprints/Sprint Plan.md` — update progress log + task status
   - `docs/KNOWN_ISSUES.md` — add/close items as needed

3. **Backward compatibility**: All new `ScriptNodeBehavior` variants use `#[serde(default)]` on new fields. Existing graphs must continue to load without modification.

4. **Public API stability**: New modules use `pub(crate)` for internal types. Only types needed by invoke API or export are `pub`.

5. **Profile constraint enforcement**: New systems respect profile viewport bounds. Movement speeds, camera bounds, and HUD layouts are profile-aware.

6. **Beginner-safe defaults**: Every system has sensible defaults that work without configuration. Movement defaults to GridSnap. Camera defaults to Fixed. Physics gravity defaults to 0 (top-down).

7. **Slice independence**: Each slice compiles and tests independently. No slice depends on later slices in the same sprint group.

8. **No feature creep**: Each slice does exactly what's described. Optimizations, advanced modes, and UI polish go in later slices or sprints.

## Execution Order (Recommended)

**Phase 1 — Core Gameplay Loop** (extends Sprint 2) — **COMPLETED 2026-02-16**:
1. ~~S2-G0 (Tile properties — solid flag + registry)~~
2. ~~S2-G1 Slice A (MovementComponent + GridSnap)~~
3. ~~S2-G1 Slice B (Wire into tick loop)~~
4. ~~S2-G3 Slice A (InputAction + mapping)~~
5. ~~S2-G3 Slice B (Invoke commands + frontend bridge)~~
6. ~~S2-G3 Slice C (Input → script events)~~
7. ~~S2-G1 Slice C (FreeMove + TurnBased modes — wired through process_movement dispatch in tick loop)~~
8. ~~S2-G2 Slice A (VelocityComponent)~~
9. ~~S2-G2 Slice B (Gravity + friction + collision response)~~
10. ~~S2-G2 Slice C (PhysicsConfig invoke)~~

**Phase 2 — World Systems** (Sprint 3):
1. S3-G1 Slice A (Camera modes)
2. S3-G1 Slice B (Wire into runtime)
3. S3-G1 Slice C (Frontend rendering offset)
4. S3-G2 Slice A (State scope refactor)
5. S3-G2 Slice B (Scoped script behaviors)
6. S3-G2 Slice C (Scene transition state handling)
7. ~~S3-G3 Slice A (Prefab types + library)~~
8. ~~S3-G3 Slice B (Invoke commands)~~
9. S3-G3 Slice C (Command-bus entity creation from prefab + override editing)
10. S3-G1 Slice D (Camera script node)
11. S3-G4 Slice A (Screen transition types + tick progress)
12. S3-G4 Slice B (Runtime + frontend overlay)

**Phase 3 — Dynamic Content** (Sprint 4):
1. S4-G1 Slice A (Spawn/Despawn behaviors)
2. S4-G1 Slice B (Entity pool + effect handling)
3. S4-G1 Slice C (Playtest cleanup + API)
4. S4-G2 Slice A (AnimationClip + frame math)
5. S4-G2 Slice B (AnimationComponent + tick wiring)
6. S4-G2 Slice C (State transitions + events)
7. S4-G2 Slice D (Invoke + frontend)
8. S4-G3 Slice A (HUD elements + bindings)
9. S4-G3 Slice B (Runtime integration)
10. S4-G3 Slice C (Frontend HUD render)
11. S4-G3 Slice D (Export parity)

**Phase 4 — Polish & Advanced** (Sprint 5):
1. S5-G1 Slice A-C (Gizmos)
2. S5-G2 Slice A-C (Live edit)
3. S5-G3 Slice A-B (Timeline foundation)

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Movement system breaks existing playtest tick timing | Fixed timestep is already 60fps. Movement integrates within existing step. Test frame-exact determinism. |
| Physics gravity conflicts with top-down games | Gravity defaults to 0. Only non-zero for platformer profile or explicit user configuration. |
| Prefab system adds schema complexity | Prefab library is editor-only state initially. Project schema changes deferred until prefab is proven. |
| HUD rendering diverges between preview and export | HUD render function is shared code. Parity test added in S4-G3 Slice D. |
| State scope refactor breaks existing script graphs | Global scope is default. Existing graphs have no scope field → defaults to Global. Zero breakage. |
| Camera offset breaks pixel-exact export parity | Camera is playtest-only initially. Export uses full-scene render without camera offset. |

## Relationship to Existing Documentation

- **Design Doc S4 (Engine Design)**: Movement, physics, camera, animation all implement systems described in the ECS/fixed-timestep design.
- **Design Doc S7 (Tool Suite)**: Prefabs implement "templates" from Map Editor spec. HUD implements overlay pass from multi-pass rendering. Timeline implements Animation Lab timeline.
- **Design Doc S10 (Scripting)**: Input mapping fires events into existing script graph. Spawn/despawn add action nodes. Persistent state formalizes scoped variables.
- **Design Doc S11 (Export)**: HUD layer extends export runtime. All systems respect Preview = Export.
- **2D-to-3D Evolution Plan**: All systems use semantic APIs (spawn_entity, set_stat, play_animation) per Phase A readiness guidance. No renderer-specific fields in core types.
- **Sprint Plan**: Systems slot into existing sprint objectives without restructuring the sprint sequence.
- **KNOWN_ISSUES RF-2026-02-16-11**: Movement + physics directly addresses the "wire collision into playtest" follow-up.
