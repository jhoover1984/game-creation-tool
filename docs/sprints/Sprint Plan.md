# Game Creator Studio Sprint Plan (Running Doc)

Last updated: 2026-02-19
Purpose: Primary running execution plan for v1-core scope, priorities, and progress history.

Source of truth design spec: `Design Doc Final v1.1.txt`

## How To Use This Doc
1. Read `Current Sprint Status` first for active execution context.
2. Use `Immediate next tasks` as the short-term queue.
3. Use `Optimization Hardening Queue` for ranked technical debt.
4. Use `Progress Log` as append-only execution history.

## Quick Navigation
- Active status: `Current Sprint Status`
- Live execution queue: `Immediate next tasks`
- Risk/cleanup priorities: `Optimization Hardening Queue (Ranked)`
- Historical execution notes: `Progress Log`

## Working Mode
- We execute only `v1-core` scope first.
- Any feature not required for the North Star flow goes to backlog by default.
- Done means tested and integrated, not just coded.

## Team Cadence
- Sprint length: 2 weeks
- Demo: end of each sprint
- Release gate check: every sprint includes safety + UX regression checks

## Global Release Gates (must all pass before v1.0)
- No data loss under crash/kill/disk-full save simulations
- Preview = Export parity checks pass on golden projects
- Command bus undo/redo correctness passes integration suite
- North Star 10-minute flow succeeds on clean install
- Inspector visible update path <= 50 ms on reference hardware

## Sprint 0 (Foundation + Architecture Lock)
### Objectives
- Finalize architecture decisions and repo boundaries.
- Stand up baseline workspace structure and CI skeleton.
- Create measurable acceptance criteria for safety/perf/UX.

### Deliverables
- ADR-001 Runtime boundary (Tauri Rust backend <-> JS frontend; WASM for browser target)
- ADR-002 Command bus and undo history policy
- ADR-003 Project schema/migration/versioning policy
- Workspace folder structure + module placeholders
- CI pipeline skeleton (lint/test placeholders)

### Acceptance Criteria
- ADRs reviewed and approved
- Repo structure created and documented
- Initial build/test commands documented (even if placeholder)

## Sprint 1 (Project Safety Backbone)
### Objectives
- Implement project open/save pipeline with safety guarantees.

### Deliverables
- Atomic save flow: temp -> fsync -> rename
- Autosave + rolling backups
- Crash recovery prompt + restore path
- Path normalization and reference validation
- Migration runner (ordered/idempotent) + report

### Acceptance Criteria
- Kill-process save simulations preserve recoverable state
- Migration dry-run and rollback behavior verified
- Golden test fixtures for old schema versions added

## Sprint 2 (Runtime + Renderer Vertical Slice)
### Objectives
- Build playable map flow with stable render/sim core.

### Deliverables
- ECS fixed-step simulation loop
- Tilemap chunking + entity picking grid
- Multi-pass render pipeline (scene/post/overlay)
- Map editor MVP (paint/select/move/erase)
- Playtest enter/exit loop

### Acceptance Criteria
- Smooth editing on large maps
- Overlay alignment pixel-correct at profile resolution
- Map -> playtest loop works reliably

## Sprint 3 (Command Bus + Inspector Bridge)
### Objectives
- Make editing universally undoable and fast.
- Land scripting architecture foundation for deterministic gameplay logic.

### Deliverables
- Command bus enforcement across implemented tools
- BatchCommand for heavy operations
- Context-scoped + global undo history behavior
- Binary inspector bridge phase 1 (selection payload)
- JSON fallback path + telemetry counters
- Script IR + validator/compiler spike (`script-core` scaffold)
- Runtime command surface stubs for script graph load/validate/run

### Acceptance Criteria
- Undo/redo integration tests pass for map + inspector actions
- Inspector update latency target met in benchmark harness
- ABI mismatch forces safe fallback without UI freeze
- Script validation reports deterministic, actionable errors with stable node IDs

## Sprint 4 (Story + Export Parity)
### Objectives
- Complete North Star flow end-to-end.

### Deliverables
- Story Maker MVP (dialog tree + preview-from-here)
- Script runtime error surface in Issues Drawer
- Event Graph MVP (conditions/actions) + Rhai expression escape hatch
- Playtest debugger MVP (event trace + watch panel + breakpoint-on-event)
- Export HTML5 debug/release presets
- Headless preview/export parity runner + drift report

### Acceptance Criteria
- North Star flow passes in under 10 minutes
- Export blockers and warnings behave as specified
- Parity checks gate release pipeline
- Playtest and export execute identical script graph behavior for golden logic scenarios

## Sprint 5 (UX Polish + Accessibility + Stabilization)
### Objectives
- Raise quality bar for beginner-first usability.

### Deliverables
- First-run onboarding and hints audit
- Built-in help MVP (context help + quick start checklist + issue-linked help)
- Universal canvas interaction consistency audit
- Profile UX system (Beginner/Builder/Pro) with progressive disclosure rules
- Machine-local performance settings MVP (auto mode + low-end preset + render scale/FPS caps)
- Accessibility pass (focus states, contrast, reduced motion)
- Performance tuning + regression baselines
- v1.0 release checklist
- Scripting UX help content and template-first authoring polish

### Acceptance Criteria
- UX smoke tests pass for Map/Draw/Animation controls
- No P0/P1 defects remaining
- Release checklist complete

## Gameplay Systems Integration (Cross-Sprint)
Full roadmap: `docs/roadmap/Gameplay Systems Integration Roadmap.md`

### Sprint 2 Extension (Phase 1 — Core Gameplay Loop)
- S2-G0: Tile properties (solid flag + registry in `engine-core` — prerequisite for movement)
- S2-G1: Movement system (GridSnap/FreeMove/TurnBased modes in `engine-core::movement`)
- S2-G2: Velocity/physics step (gravity, friction, collision response in `engine-core::physics`)
- S2-G3: Input action mapping (semantic actions, profile defaults in `engine-core::input`)

### Sprint 3 Additions (Phase 2 — World Systems)
- S3-G1: Camera following system (Fixed/Follow/Lerp modes in `engine-core::camera`)
- S3-G2: Persistent state scope (global vs scene-local in `script-core::runtime`)
- S3-G3: Entity prefab/template system (reusable entity templates in `engine-core::prefab`)
- S3-G4: Screen transitions (fade/wipe between scenes in `engine-core::scene` + frontend)

### Sprint 4 Additions (Phase 3 — Dynamic Content)
- S4-G1: Runtime entity spawning (script-driven spawn/despawn)
- S4-G2: Animation state machine (frame-based with state transitions in `engine-core::animation`)
- S4-G3: Game UI layer / HUD (variable-bound overlays in `engine-core::hud`)

### Sprint 5 Additions (Phase 4 — Polish & Advanced)
- S5-G1: Viewport gizmos (collision box handles, spawn markers)
- S5-G2: Live editing during play (modify entities/state while playtesting)
- S5-G3: Timeline/sequencer foundation (keyframe animation for cutscenes)

## Backlog (v1+)
- Advanced draw operations beyond core flow
- Expanded animation workflows
- Advanced audio workflows
- Playtest assertions/watchpoints UX
- Heavy media ingest pipelines (MP4/WebM decode, AI-assisted cleanup) behind feature flags
- 2D->3D capability-flag and renderer-boundary prep tasks (no v1 delivery impact)
- Translation assistant (plain-English/pseudocode -> validated Event Graph/Rhai draft)
- Tier 1.5 and Tier 2 roadmap items

## Current Sprint Status
- Active Sprint: S5 — Export Parity + Movement + Input — Started 2026-02-19
- Status: In Progress
- Previous Sprint: S4-EG1 (Event Graph MVP) — Completed 2026-02-18

### S5 Execution Order

Priority order (descending product risk):

1. **Track A — Authored Export Parity** (highest risk, blocks output trust)
2. **Track B — Movement + Input + Physics baseline** (biggest demo impact)
3. **Track C — Screen Transitions (S3-G4)** (follow-on once runtime loop stable)
4. **Track D — Entity Prefab/Template System (S3-G3)** (productivity feature, after runtime correctness)
5. **Visual Design Phase C** — parallel only, must not interrupt Tracks A–B

---

### Hard Acceptance Criteria

**Track A — Authored Export Parity**
- Authored entities, tiles, component data, and audio bindings from a user project round-trip into the export artifact.
- Exported artifact runs in browser runtime (web export preview) with authored entities visible and interactable.
- `authored-export.spec.mjs` E2E passes including audio asset check (fix `test.fixme` on issue#1).
- Export manifest `schema_version` validated at runtime; malformed manifest fails with a clear error.

**Track B — Movement + Input + Physics**
- Player entity responds to arrow/WASD input during playtest in both desktop (Tauri) and web (fallback JS) paths.
- Physics step produces deterministic frame-by-frame output across identical input sequences.
- Tile collision blocks movement at solid tiles; entity collision detects but does not corrupt state.
- Each integration slice has dedicated unit tests AND one e2e coverage path before the next slice starts.

**Track C — Screen Transitions**
- `ChangeScene` effect triggers a visible fade/wipe transition in the playtest overlay.
- Scene state (entities, flags, variables) resets correctly on transition; no bleed between scenes.
- Multi-scene RPG starter project transitions without crash or entity corruption.

**Track D — Entity Prefabs**
- User can save an entity as a prefab and stamp new instances from it.
- Prefab instances share the same component defaults but are independently overridable.
- Export artifact correctly resolves prefab instances to authored entity data.

---

### Pre-Merge Quality Gate (required for every slice)

Run these exact commands (copy-paste; avoid grep variant drift):

```sh
# From apps/desktop:
npm test
npm run test:e2e:smoke
npx playwright test --config=playwright.config.mjs --grep-invert "@visual"

# When Track A (export) changes are in scope, also run:
npm run test:e2e:authored
```

- Any new flake is a **blocker** unless explicitly quarantined with `test.fixme`.
- Every `test.fixme` **must** include: owner, issue link/ID, and target resolution sprint.
  Format: `// FIXME(issue#N, owner: @name, target: S5): <reason>`
- Visual snapshot tests (`@visual`) are advisory — failures do not block merge but must be noted in the PR.
- `cargo test --workspace` required when Rust crates change.

---

### Track B — Gameplay Integration Slices

| Slice | Scope | Gate |
|-------|-------|------|
| B-A | Input → movement, no collisions | unit tests + smoke playtest enters/exits |
| B-B | Tile + entity collision | unit tests + manual playtest collision confirmed |
| B-C | Physics forces + camera follow | unit tests + e2e playtest-viewport signature |

Each slice: unit tests written first, slice ships green, next slice starts.

---

### API Contract Lock (do not change mid-sprint)

Single source of truth: **`docs/contracts/payload-contracts.md`**
All frozen schemas are defined there. Any change to a locked field requires:
1. Update `payload-contracts.md` with rationale + migration note.
2. Reference the contract doc in the PR description.
3. Bump schema version if the field is part of a persisted artifact.

**Locked during S5** (summary — see `payload-contracts.md` for full field lists):
- Playtest snapshot: `playtest`, `camera`, telemetry fields
- Export artifact: `metadata.json`, `assets/manifest.json`, `bundle.json`

Parallel refactors that change these payload shapes are **blocked** during S5.

---

### Race-Condition Policy (standing rule)

- Any async playtest mutation (`tick`, `keyDown`, `keyUp`, `togglePlayPause`, `stepPlaytestFrame`, `setPlaytestSpeed`) **must** use the session/stale-response guard (`isStalePlaytestResponse`).
- `exitPlaytest` **must** remain a hard barrier: set `active = false` and emit synchronously before any `await`.
- Exit path must have explicit E2E coverage (overlay-hidden assertion before HUD check).
- New async playtest operations added in future slices must follow the same pattern before merge.

---

### Stabilization Checkpoint

- **Mid-sprint**: run full non-visual E2E, document any flaky tests in this log.
- **End-sprint**: remove `test.fixme` guards only if corresponding parity tests are green.
- **End-sprint**: run `cargo test --workspace` + full JS + full non-visual E2E; record pass counts here.

---

### S4-EG1 shipped (2026-02-18):
  - Added 6 new `ScriptNodeBehavior` variants to `script-core`: `OnInteract`, `HasItem`, `GiveItem`, `RemoveItem`, `SetEntityState`, `ShowMessage`
  - Added 4 new `ScriptEffect` variants and inventory parameter to `ScriptRuntime::process_event`
  - Wired per-entity script graphs and interact events in `editor_runtime.rs` (INTERACT_RANGE_PX=24)
  - Added `editor_service` and `invoke_api` endpoints: `entity_attach_graph`, `entity_detach_graph`, `entity_get_graph`, `entity_get_states`
  - Created `apps/desktop/src/ui-event-graph.js` — GDevelop-style event sheet list view controller
  - Added `attachEntityGraph`/`getEntityGraph`/`getEntityStates` to `project-api.js`
  - Added Zelda starter templates (Chest/Door/NPC) to `ui-script-templates.js` and `ui-event-graph.js`
  - 5 new Rust unit tests in `script-core` (219 total), 15 new JS tests (100 total)
  - 0 typecheck errors, 0 lint warnings
- **S5 Tracks A–D: all complete as of 2026-02-19.**
- **S4-G1: Runtime Entity Spawning — complete as of 2026-02-19.**
- **S4-G2: Animation State Machine — complete as of 2026-02-19.**
- Immediate next tasks:
  1. **Visual Design Phase C** — finish parallel visual polish pass (was deferred while runtime tracks ran).
  2. **S4-G3: Game UI / HUD** — variable-bound overlay widgets (health bar, coin counter, etc.).
  3. Consider Rhai host API guide (ADR-005 Rollout Sprint 4 item).
  6. Execute Starter Asset Pack v1 baseline implementation slice:
     - ship profile-safe starter pack spec (`docs/tooling/Starter Asset Pack Spec.md`) into Draw Studio/seed UX.
     - baseline quick silhouette presets now landed in Draw Studio (`Tree` / `Bush` / `Rock`) with `tree` as default.
     - authored export now consumes bundled starter asset pack SVGs when explicit/project assets are unavailable.
     - next: expand starter pack coverage and migrate from SVG placeholders to profile-authentic sprite sheets.
  7. Prioritize authored export lane parity for user projects (highest-risk product gap):
     - move default export flow from canonical fixture emphasis to authored map/entity/script output parity.
     - preserve canonical fixture lane only for deterministic CI/regression parity checks.
  8. Land script runtime bridge milestone after validation scaffold:
     - **Slice A complete**: `script-core` now has full execution runtime (`ScriptRuntime`, `ScriptState`, `ScriptEffect`).
       - supports OnEvent, CheckFlag, SetFlag, SetVariable, ChangeScene, PlayAudio, LogMessage behaviors.
       - deterministic event-driven traversal with condition branching and depth limit.
       - 20 unit tests covering all node types, branching, chaining, and backward compatibility.
     - **Slice B complete**: `editor_runtime` now integrates `ScriptRuntime` for playtest execution.
       - `load_script_graph()` / `unload_script_graph()` compile and store graph for playtest use.
       - `fire_script_event()` dispatches named events and applies effects to watch flags/variables/trace.
       - `tick_playtest()` automatically fires `playtest_tick` through loaded script graph.
       - script state resets on enter/exit playtest for clean session isolation.
       - `script_event` breakpoint kind triggers on scene-change effects.
       - 9 new unit tests covering load/fire/unload/reset/tick/trace/breakpoint integration.
     - **Slice C complete**: invoke API commands and frontend bridge for script graph load/execute.
       - `script_load_graph`, `script_unload_graph`, `script_fire_event` invoke commands.
       - frontend `loadScriptGraph()`, `unloadScriptGraph()`, `fireScriptEvent()` in `project-api.js`.
       - `script_loaded` field in `EditorStateResponse` + frontend fallback state.
       - validation gate: `load_script_graph` rejects invalid graphs before compilation.
       - 2 new invoke API tests + 76 frontend tests green + lint clean.
     - **P0-1 complete**: script runtime bridge is fully operational from graph → runtime → invoke → frontend.
     - **P0-2 complete**: scene/level system with multi-scene model, spawn points, and transitions.
       - `engine-core::scene` module: `Scene`, `SceneCollection`, `SpawnPoint`, `SceneId` types with full CRUD and spawn resolution.
       - 10 unit tests in `engine_core::scene::tests`.
       - `editor_runtime` integration: `scene_collection`, `active_playtest_scene` fields, scene management methods, ChangeScene effect handler performs actual scene transitions.
       - 8 integration tests in `editor_runtime::tests` covering scene add/remove/switch/transition/playtest lifecycle/script effect routing.
       - invoke API commands: `scene_add`, `scene_remove`, `scene_set_active`, `scene_list`, `scene_add_spawn_point`.
       - `SceneDto`, `SpawnPointDto`, `SceneListResponse` DTOs in `editor_service`.
       - 1 new invoke API test (`scene_add_list_set_active_remove_dispatch_roundtrip`).
       - frontend bridge: `addScene()`, `removeScene()`, `setActiveScene()`, `listScenes()`, `addSpawnPoint()` in `project-api.js`.
       - `SceneDto`, `SceneListResponse`, scene payload typedefs in `types.js`.
       - validated: 130 Rust tests + 76 frontend tests green.
     - **P0-3 complete**: collision detection and entity component system baseline.
       - `engine-core::components` module: `CollisionBox`, `SpriteComponent`, `EntityComponents`, `ComponentStore`.
       - `engine-core::collision` module: `Aabb`, `entity_aabb()`, `check_entity_collisions()`, `check_tile_collisions()`, `would_collide_with_entities()`.
       - non-solid entities detected in collision pairs but don't block movement (trigger zone pattern).
       - 12 new unit tests (4 components + 8 collision) covering AABB math, entity pairs, tile overlap, movement prediction.
       - validated: 142 Rust tests green.
     - **P1-1 complete**: CI quality gates (clippy enforcement).
       - fixed 4 clippy warnings across workspace: `or_insert_with` → `or_default()` (command-core), suppressed `wrong_self_convention` on trait method (project-core), `1 | 2 | 3` → `1..=3` (export-core), suppressed `field_reassign_with_default` on test with private field (engine-core).
       - added `cargo clippy --workspace --all-targets -- -D warnings` step to `.github/workflows/ci.yml` between format check and test steps.
       - upgraded `cargo test` and `cargo check` to `--workspace` flag for full crate coverage.
       - validated: `cargo clippy --workspace --all-targets -- -D warnings` passes clean, 142 Rust tests green.
     - **P1-2 complete**: export-core modularization.
       - split monolithic `lib.rs` (2,254 lines) into 5 modules: `types.rs`, `input.rs`, `scenes.rs`, `assets.rs`, `lib.rs` (facade + tests).
       - zero behavioral changes — all 142 Rust tests pass, clippy clean, public API unchanged.
     - **Next**: Gameplay systems integration Phase 1 (S2-G1 Movement → S2-G3 Input → S2-G2 Physics).
       - full execution plan in `docs/roadmap/Gameplay Systems Integration Roadmap.md`.
       - 9 slices covering movement archetypes, input action mapping, and velocity/physics step.
       - wires existing collision system (P0-3) into playtest tick loop for real gameplay behavior.
  9. Finish dashboard scalability hardening:
     - recent-project baseline UX pass is shipped (persist/open/sort/cap + smoke coverage).
     - remaining: large-list responsiveness policy (virtualization/windowing where needed) and stress validation.
  10. Lock visual consistency decisions:
      - one icon family across UI.
      - profile-accent contrast audit against semantic warning/error states.
  11. Execute visual COA from full design audit:
      - follow incremental performance-first convergence plan in `docs/reviews/Visual Design Audit 2026-02-16.md`.
      - finish Phase C controls first (theme + density + responsive polish), then Phase D personality pass.
      - execute priorities in `docs/frontend/UI UX Execution Plan.md` with slice-based gates.

## Optimization Hardening Queue (Ranked)
1. `P1` CI strict perf-budget monitoring and threshold tuning
   - Scope: keep strict perf gating enabled and calibrate thresholds using trend deltas (launch/workspace/playtest) without disabling enforcement.
   - Acceptance criteria:
     - strict mode remains enabled in CI.
     - threshold updates are data-backed and documented in testing docs/changelog.
2. `P1` Remaining `ui-shell` decomposition
   - Scope: continue extraction of issues/entities/watch/trace/script-template rendering modules.
   - Acceptance criteria:
     - `ui-shell.js` keeps shrinking while preserving behavior parity in smoke E2E.
     - extracted modules have explicit bind/dispose lifecycle hooks.
3. `P1` Frontend Type Safety Phase 1 completion
   - Scope: expand JSDoc typedef coverage across remaining high-churn UI modules and command payload surfaces.
   - Acceptance criteria:
     - core UI bootstrap/render/controller contracts have explicit typedefs.
     - lint/test gates remain green with no runtime behavior regressions.
4. `P2` Incremental render optimization
   - Scope: move high-frequency regions from full redraw to targeted updates.
   - Acceptance criteria:
     - trace/watch/entity updates avoid unnecessary full list rebuilds.
     - measurable reduction in render-cost spikes under playtest trace load.

## Progress Log
### 2026-02-19
- Playtest exit race condition fixed (S4-EG1 deferred stability item):
  - `apps/desktop/src/app-state.js`: replaced `exitRequested` boolean with a 3-phase state machine (`idle | running | exiting`) + `playtestSessionId` counter.
  - `exitPlaytest` is now a hard barrier: forces `active = false` and emits `playtest:changed` synchronously before awaiting backend, so overlay hides with zero async latency.
  - Pre+post stale-response guards applied to all 6 async playtest mutations (`tick`, `keyDown`, `keyUp`, `togglePlayPause`, `stepPlaytestFrame`, `setPlaytestSpeed`).
  - `exitPlaytest` uses `try/finally` to always clear phase to `idle` even on backend error.
  - `apps/desktop/tests-e2e/smoke.spec.mjs`:
    - Zelda test split into two: "exit determinism with concurrent input" + "state survives exit and export".
    - All `Escape → Edit` assertions now use overlay-hidden-first pattern (lines 550, 731, 1017, 1039).
  - `apps/desktop/tests-e2e/authored-export.spec.mjs`: marked audio-asset assertion `test.fixme` (issue#1 — sample game has no audio clips).
  - Sprint S5 scope, acceptance criteria, quality gates, API contract locks, and race-condition policy added to this doc.
  - Validated with:
    - `node --test tests/app-state.test.mjs` → 28/28 pass
    - `npx playwright test tests-e2e/smoke.spec.mjs` → 46/46 pass
    - `npx playwright test --grep-invert "@visual"` → 50 pass, 1 skipped

- Track D prefab/template implementation slice completed (runtime + invoke + frontend bridge):
  - `crates/engine-core/src/prefab.rs`: added `EntityPrefab` + `PrefabLibrary` with CRUD/update/list and unit coverage.
  - `crates/engine-core/src/lib.rs`: exported prefab module/re-exports.
  - `apps/desktop/src-tauri/src/editor_runtime.rs`: added runtime prefab library + create/update/list/delete/stamp methods.
  - `apps/desktop/src-tauri/src/editor_service.rs`: added `PrefabDto`, `PrefabListResponse`, prefab service handlers.
  - `apps/desktop/src-tauri/src/invoke_api.rs`: added invoke dispatch for `prefab_create`, `prefab_update`, `prefab_list`, `prefab_delete`, `prefab_stamp`.
  - `map_create` now accepts optional `prefabId` to route prefab-backed creation through the standard entity-create command entrypoint (with `name` override support).
  - prefab library now persists/restores through `editor-state.json` in project save/open flow.
  - runtime now syncs per-entity stores (components/script/entity-state) after map undo/redo/delete/reset to prevent orphan state after history operations.
  - authored export now includes flattened per-entity component bags (`scenes.json` → `snapshot.entity_components`) so prefab-derived component defaults are carried into export output.
  - `apps/desktop/src/project-api.js`: added frontend prefab API bridge + fallback prefab state handling/reset paths.
  - Added coverage:
    - `apps/desktop/tests/project-api.test.mjs`: prefab fallback CRUD + stamp flow.
    - `apps/desktop/src-tauri/src/invoke_api.rs`: prefab dispatch roundtrip test.
  - Validated with:
    - `cargo test -p gcs-desktop prefab_dispatch_crud_and_stamp_roundtrip`
    - `cd apps/desktop && npm test`

- S4-G2: Animation State Machine — all 4 slices complete:
  - **Slice A** (`crates/engine-core/src/animation.rs`): `AnimationClip`, `AnimationState`, `AnimationComponent`, `AnimationTransition`, `TransitionCondition`, `LoopMode` (Loop/Once/PingPong), `tick_animation()`. 14 unit tests covering all loop modes, empty/not-playing guards, component set_state, serialization roundtrips.
  - **Slice B** (`components.rs`, `editor_runtime.rs`): `AnimationComponent` field added to `EntityComponents`; `set_animation`/`animation`/`animation_mut`/`entities_with_animation` on `ComponentStore`; `tick_entity_animations()` called per-simulation-step (not per API tick) in `tick_playtest` — ensures Once/PingPong clips finish correctly under multi-step delta_ms calls; syncs `SpriteComponent.frame` from active animation frame.
  - **Slice C** (`editor_runtime.rs`): `TransitionCondition::FlagSet` evaluated against `script_state.flags` each tick; `animation_state_changed` event fired and trace-logged on transition; `animation_finished` event fired when no transition consumes a `ClipFinished` outcome.
  - **Slice D** (`editor_service.rs`, `invoke_api.rs`, `project-api.js`): `animation_add_clip`, `animation_set_state`, `animation_set_transitions` service functions + DTOs; invoke dispatch; JS fallbacks with `fallbackEditor` mutation.
  - Validated with: `cargo test --workspace` → 266 tests, 0 failed; `node --test tests/*.test.mjs` → 108 tests, 0 failed.

- S4-G1: Runtime Entity Spawning — all 3 slices complete:
  - **Slice A (script-core)**: added `SpawnEntity { prefab_id, x, y }` and `DespawnEntity { entity_name }` to `ScriptNodeBehavior` (graph.rs) and `ScriptEffect` (runtime.rs); added match arms in `execute_action`; 3 new tests.
  - **Slice B (editor_runtime)**: added `spawned_entity_pool: Vec<EntityId>` field; cleared on `enter_playtest`; pool entities removed from `map_state` + `component_store` on `exit_playtest`; `apply_script_effects` handles `SpawnEntity` (tracks in pool) and `DespawnEntity` (by name, prunes pool to prevent double-remove).
  - **Slice C (invoke + JS)**: added `spawn_entity_from_prefab_direct` / `despawn_entity_direct` methods; `spawn_entity` / `despawn_entity` service functions; `SpawnEntityPayload` / `DespawnEntityPayload` + dispatch in `invoke_api.rs`; `spawnEntity` / `despawnEntity` with fallbacks in `project-api.js`.
  - Dispatch roundtrip test added: `spawn_and_despawn_entity_dispatch_roundtrip` (prefab_create → spawn_entity → despawn_entity → error on double-despawn).
  - Validated with:
    - `cargo test --workspace` → 250 tests, 0 failed
    - `node --test tests/*.test.mjs` → 108 tests, 0 failed

### 2026-02-16
- Documentation cross-reference audit: fixed Command Surface (12 missing commands), KNOWN_ISSUES RF-11, Review Ledger (RF-10/11/12), Tool Capability Matrix (Gameplay Systems section), Release Checklist (gameplay gates). Marked S2-G1 Slice C complete.
- Shipped project title binding, tile palette picker (6 swatches), and export UI panel (right-panel tab).
- 180 Rust tests, 76 frontend tests, clippy clean, lint clean.

- Dashboard config/recents module split + unit hardening:
  - added `ui-dashboard-config.js` for shared dashboard constants.
  - added `ui-dashboard-recents.js` for pure recent-project parsing/normalization.
  - `ui-launch-dashboard` now uses shared helpers (less inline parsing logic, lower drift risk).
  - added `ui-dashboard-recents.test.mjs` unit tests covering malformed entries, recency sort, cap behavior, malformed JSON, and non-array payloads.
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke`
    - `cd apps/desktop && npm run test:e2e:visual`

- Dashboard catalog module + recents stress hardening pass:
  - moved template metadata into a shared module: `apps/desktop/src/ui-dashboard-templates.js`.
  - `ui-launch-dashboard` now consumes shared catalog/default constants.
  - expanded dashboard recents smoke coverage with large + malformed localStorage seed to validate cap/filter/order behavior.
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke`
    - `cd apps/desktop && npm run test:e2e:visual`

- Dashboard template-catalog consolidation pass:
  - moved launch and new-project template surfaces to a single generated catalog source.
  - dashboard card metadata now includes explicit difficulty label from catalog data.
  - removed static template/options duplication from shell HTML to reduce UI/document drift risk.
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke`
    - `cd apps/desktop && npm run test:e2e:visual`

- Added smoke regression coverage for playtest exit hint:
  - `tests-e2e/smoke.spec.mjs` now asserts `Press Esc to exit` appears while playtest is active.
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm run test:e2e:smoke`

- Playtest discoverability polish:
  - added explicit `Press Esc to exit` hint in Playtest Mode controls for faster novice recovery.
  - updated hint styling to stay legible across active themes.
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke`
    - `cd apps/desktop && npm run test:e2e:visual`

- UI/UX Slice C implementation pass (accessibility + legibility hardening):
  - added `aria-live="polite"` on core status and feedback surfaces:
    - `#dashboard-status`, `#health-summary`, `#onboarding-status`, `#walkthrough-status`, `#issues-list`, `#log-lines`.
  - expanded keyboard focus-ring coverage and slightly increased small helper/status text sizes for better readability in dense panels.
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke`
    - `cd apps/desktop && npm run test:e2e:visual`

- UI/UX Slice B implementation pass (beginner progressive disclosure in workspace):
  - workspace lane list now hides non-essential entries in beginner mode via `profile-advanced`.
  - Quick Start Assisted Content controls now hide in beginner mode while Guided Walkthrough remains visible.
  - beginner right-panel tab presentation tightened to two-column emphasis for core tabs.
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke`
    - `cd apps/desktop && npm run test:e2e:visual`

- UI/UX Slice A implementation pass (dashboard readability + flow clarity):
  - dashboard launch surface was rebalanced for clearer action hierarchy while keeping behavior selectors stable.
  - primary CTA is visually dominant (`#dashboard-action-new`), secondary actions are grouped and lower emphasis.
  - template cards now include explicit difficulty metadata labels for faster scanability.
  - responsive behavior for dashboard actions was tightened to avoid cramped mid-width layouts.
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke`
    - `cd apps/desktop && npm run test:e2e:visual`

- Added consolidated UI/UX execution plan and linked it to delivery gates:
  - new companion plan: `docs/frontend/UI UX Execution Plan.md`
  - synced references in:
    - `docs/frontend/Visual Design System.md`
    - `docs/DOCUMENTATION_INDEX.md`
    - `docs/DEVELOPMENT_WORKFLOW.md`
    - `docs/RELEASE_CHECKLIST.md`
  - objective: keep UI/UX work scoped, test-gated, and aligned with sprint priorities.

- Dashboard recents hardening + smoke stability pass:
  - shipped launch-dashboard recent-project baseline in `apps/desktop/src/ui-launch-dashboard.js` with:
    - persistence key `gcs.dashboard.recent_projects.v1`
    - recency ordering by `updatedAt`
    - capped list surface (`MAX_RECENT_PROJECTS = 8`)
    - explicit reopen flow from dashboard recent-item buttons.
  - wired new dashboard recents element through shell composition:
    - `apps/desktop/src/index.html`
    - `apps/desktop/src/styles.css`
    - `apps/desktop/src/ui-shell-elements.js`
    - `apps/desktop/src/ui-shell.js`
  - stabilized smoke tests by replacing ambiguous role selector usage for dashboard Open with `#dashboard-action-open`.
  - expanded smoke suite with recents cap/sort regression:
    - `dashboard recent projects list is recency-sorted and capped`
  - validated with:
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke`
    - `cargo test -p project-core`

- Phase 1 Gameplay Systems implementation (S2-G0 through S2-G3, all slices complete):
  - S2-G0: Tile Properties — `TileProperties` struct + `TilePropertyRegistry` (default-solid convention), integrated into `MapEditorState`, `would_collide_with_tiles()` in collision.rs (5 tests).
  - S2-G1 Slices A-B: Movement system — `MovementMode` (GridSnap/FreeMove/TurnBased), `MovementComponent`, `MovementInput`, `process_movement()` dispatcher, wired into `tick_playtest()` with collision blocking (8 + 4 tests).
  - S2-G3 Slices A-C: Input mapping — `InputAction` + `KeyCode` enums, `InputMapping` (game_boy/wasd defaults), `InputState` (held/just_pressed/just_released), `to_movement_input()` converter, `playtest_key_down`/`playtest_key_up` invoke commands + frontend bridge, input actions fire script events during tick (7 + 2 + 2 tests).
  - S2-G2 Slices A-C: Velocity/physics — `VelocityComponent`, `PhysicsConfig` (top_down/platformer presets), `physics_step()` with gravity+friction+clamping, wired into tick loop with collision response, `set_physics_config` invoke + frontend bridge (7 + 3 + 2 tests).
  - Added `movement`, `velocity` fields to `EntityComponents` + `ComponentStore` accessors + `entities_with_velocity()`.
  - Total: 180 Rust tests pass, cargo clippy clean, frontend lint clean.
  - validated with:
    - `cargo test --workspace`
    - `cargo clippy --workspace`
    - `cd apps/desktop && npm run lint`

### 2026-02-15
- Authored export runtime-audio bridge slice:
  - `export-core` runtime template now loads `audio_clip` assets and exposes bridge methods for loaded-count + ID listing + basic play/stop control.
  - export runtime movement input now emits deterministic audio-play attempts with playback telemetry events for automation visibility (movement cue prefers `audio_step` / `audio_move` / `audio_footstep` then fallback).
  - frontend export API now forwards optional authored `editorState` hints to native invoke export payload.
  - `Sample Game 01` dogfood builder now emits deterministic authored WAV clips (`theme`, `step`, `pickup`) and passes authored audio hints into native export invoke.
  - authored-export Playwright E2E now verifies packaged audio, runtime bridge visibility, and movement-triggered playback telemetry.
  - validated with:
    - `cargo test -p export-core`
    - `cargo test -p gcs-desktop --bin gcs-desktop`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run build:sample:game01`
    - `cd apps/desktop && npm run test:e2e:authored`

- Authored gameplay-audio binding hook slice:
  - `export-core` now emits normalized authored gameplay-audio bindings into `metadata.json` (`audio_bindings`) from `editorState.audioBindings` and `editorState.audioEvents[]`.
  - export runtime now loads metadata bindings and exposes `triggerGameplayEventAudio(eventName, options)` plus binding introspection/mutation (`getAudioBindings`, `setAudioBindings`).
  - runtime gameplay trigger resolution now supports: authored binding -> direct `audio_${event}` -> built-in alias fallback.
  - `Sample Game 01` now passes `audioBindings` + `audioEvents` hints in native export payload for dogfood validation.
  - authored-export E2E now verifies metadata bindings and gameplay-trigger telemetry (`gameplay:item_pickup`).

- Script Lab export mapping bridge slice:
  - `app-state.exportPreview()` now forwards a composed export hint payload (`entities`, `tiles`, `playtest.frame`) instead of relying only on backend live-state fallback.
  - Script Lab graph input now contributes gameplay-audio routing for export via:
    - explicit graph metadata (`audioBindings`, `audioEvents[]`), and
    - inferred bindings from audio action nodes (`audioId`/`clip`) traced back to upstream event nodes.
  - added app-state regression test to verify export invoke payload includes derived `editorState.audioBindings` and `editorState.audioEvents`.

- Authored export audio ingest/copy baseline slice:
  - `export-core` now packages authored audio clips in invoke export lane when provided via `editorState.audio[]` / `editorState.audioClips[]` with `assetPath`.
  - `projectDir/assets/manifest.json` audio mappings now feed authored export packaging (`audio` map and `assets[]` entries with `kind: "audio"` / `audio_*` IDs).
  - manifest audio resolution is scoped to authored audio IDs referenced in `editorState.audio*` to avoid manifest-wide over-packaging.
  - authored export asset manifest now includes `audio_clip` records and copied files under `assets/audio/*`.
  - regression coverage added in:
    - `crates/export-core/src/lib.rs`
    - `apps/desktop/src-tauri/src/invoke_api.rs`
  - validated with:
    - `cargo fmt`
    - `cargo test -p export-core`
    - `cargo test -p gcs-desktop --bin gcs-desktop`
    - `cd apps/desktop && npm test`

- Authored export starter-pack fallback slice:
  - `export-core` authored asset inference now resolves known tile/entity IDs to bundled starter pack assets (`assets/starter/*.svg`) before generated placeholders.
  - starter source labels now emit as `starter_pack://...` in export asset manifests for deterministic lane attribution.
  - validated with:
    - `cargo test -p export-core`
    - `cargo test -p gcs-desktop --bin gcs-desktop`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run build:sample:game01`

- Starter asset + export-lane UX clarity slice:
  - added explicit export-lane guidance in workspace UI (`#export-lane-hint`) and lane-labeled export logs (`desktop authored lane` / `web fallback lane`).
  - expanded Draw Studio quick presets with starter silhouettes (`Tree`, `Bush`, `Rock`) while preserving existing layout presets (`Cluster`, `Line`, `Ring`) for compatibility.
  - changed Draw Seed default preset fallback from `cluster` to `tree`.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate completion slice (all frontend source modules):
  - promoted `apps/desktop/jsconfig.json` from incremental include list to full-source coverage (`include: ["src/**/*.js"]`).
  - resolved full-source contract blockers in export preview runtime, perf metrics window bridge, workspace bootstrap type contracts, launch dashboard state port typing, and `ui-shell` composition boundary typing.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-preferences`):
  - expanded scoped `checkJs` gate to include `apps/desktop/src/ui-preferences.js`.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-command-bar`, `ui-editor-input`):
  - expanded scoped `checkJs` gate to include:
    - `apps/desktop/src/ui-command-bar.js`
    - `apps/desktop/src/ui-editor-input.js`
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-breakpoints`, `ui-debug-helpers`, `ui-shell-bootstrap-elements`):
  - expanded scoped `checkJs` gate to include:
    - `apps/desktop/src/ui-breakpoints.js`
    - `apps/desktop/src/ui-debug-helpers.js`
    - `apps/desktop/src/ui-shell-bootstrap-elements.js`
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-shell-elements`):
  - expanded scoped `checkJs` gate to include `apps/desktop/src/ui-shell-elements.js`.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-shell-lifecycle`):
  - expanded scoped `checkJs` gate to include `apps/desktop/src/ui-shell-lifecycle.js`.
  - added explicit typed window extension in lifecycle controller for global boundary install state (`__gcsGlobalErrorBoundaryInstalled`) under checked JS mode.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-shell-render`, `ui-workspace-bindings`):
  - expanded scoped `checkJs` gate to include:
    - `apps/desktop/src/ui-shell-render.js`
    - `apps/desktop/src/ui-workspace-bindings.js`
  - aligned assisted-guardrail callback contracts across shell render/bootstrap wiring so health issue rendering receives the shared `AssistedGuardrail` shape.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-shell-events`, `ui-shell-status`, `ui-shell-log`):
  - expanded scoped `checkJs` gate to include:
    - `apps/desktop/src/ui-shell-events.js`
    - `apps/desktop/src/ui-shell-log.js`
    - `apps/desktop/src/ui-shell-status.js`
  - added explicit shell-event payload metadata contract in `ui-shell-events.js` for assisted-generation event fields used by event logging.
  - tightened status-controller DOM contracts in `ui-shell-status.js` to button-specific element types for checked `.disabled` updates.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-shell-runtime`):
  - expanded scoped `checkJs` gate to include `apps/desktop/src/ui-shell-runtime.js` in `apps/desktop/jsconfig.json`.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-shell-module-bundle`):
  - expanded scoped `checkJs` gate to include `apps/desktop/src/ui-shell-module-bundle.js` in `apps/desktop/jsconfig.json`.
  - tightened editor module bundle return contract from `Promise<unknown[]>` to typed tuple bundle shape.
  - deduplicated module-bundle tuple contract by importing it into `ui-workspace-bootstrap.js` from `ui-shell-module-bundle.js`.
  - fixed new typecheck-exposed warning path in `ui-draw-seed.js` by adding explicit schema guard typing in preset import warning parsing.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice (`ui-workspace-bootstrap`):
  - expanded scoped `checkJs` gate to include `apps/desktop/src/ui-workspace-bootstrap.js` in `apps/desktop/jsconfig.json`.
  - added explicit module-bundle JSDoc tuple typing in `ui-workspace-bootstrap.js` for dynamic-import controller factories.
  - aligned bootstrap `state` dependency contract with workspace binding needs (`selectEntities`, `setProjectName`).
  - added explicit element casts for select/input access in bootstrap wiring to satisfy strict checked DOM typing.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`
    - `cd apps/desktop && npm run test:e2e:smoke:quickstart`

- Type-safety gate expansion slice (`app-state`):
  - expanded scoped `checkJs` gate to include `apps/desktop/src/app-state.js` in `apps/desktop/jsconfig.json`.
  - added explicit response typedef contracts in `apps/desktop/src/types.js` for project open/save/health + script validation report shapes.
  - updated `app-state` to use typed response casts for project open/save/health/script-validate/export paths to remove `unknown` payload drift.
  - fixed assisted point normalization typing in `generatePrimitiveAsset` by switching numeric coercion from `parseInt` to `Number(...)`.
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Type-safety gate expansion slice:
  - expanded scoped `checkJs` gate to include `apps/desktop/src/project-api.js` and `apps/desktop/src/ui-playtest.js` in `apps/desktop/jsconfig.json`.
  - hardened typed bridge access in `project-api.js` (`window["__TAURI__"]` typed accessor + typed fallback error code assignment).
  - normalized snapshot tile hydration in fallback state (`tile_id` defaulting) to satisfy stricter contract checks.
  - hardened playtest perf metric bridge access in `ui-playtest.js` (`window["__gcsPerfMetrics"]` typed guard).
  - validated with:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Drift-control guardrail slice:
  - added frontend `checkJs` gate as an initial scoped module set via `apps/desktop/jsconfig.json` and `npm run typecheck`.
  - wired `Frontend typecheck` step into CI (`.github/workflows/ci.yml`).
  - added running drift-audit checklist doc: `docs/reviews/Drift Audit Checklist (Running).md`.
  - updated workflow/docs index tracking:
    - `docs/DEVELOPMENT_WORKFLOW.md`
    - `docs/DOCUMENTATION_INDEX.md`
    - `docs/frontend/Type Safety Plan.md`
  - validation:
    - `cd apps/desktop && npm run typecheck`
    - `cd apps/desktop && npm run lint`
    - `cd apps/desktop && npm test`

- Launch dashboard template-catalog hardening slice:
  - moved dashboard template cards from static markup to data-driven rendering in `apps/desktop/src/ui-launch-dashboard.js` (single source for card metadata + select options).
  - synchronized dashboard and workspace template selectors from shared catalog to reduce template drift.
  - added explicit active-state styling for selected template card in `apps/desktop/src/styles.css`.
  - validated with:
    - `npm test`
    - `npm run test:e2e:smoke:quickstart`

- Playtest telemetry contract normalization slice:
  - standardized frontend playtest telemetry fields to backend snake_case contract (`last_tick_delta_ms`, `last_tick_steps`) across fallback editor responses and playtest UI rendering.
  - removed redundant camelCase telemetry aliases from shared frontend typedefs (`apps/desktop/src/types.js`) to reduce shape drift risk between desktop invoke responses and fallback mode.
  - aligned desktop runtime browser bridge mock payloads in `apps/desktop/tests-e2e/desktop-runtime.spec.mjs`.
  - validated with:
    - `npm test`
    - `npx playwright test --config=playwright.config.mjs tests-e2e/desktop-runtime.spec.mjs`

- Manifest-driven asset discovery slice:
  - added project asset-manifest lookup support in `export-core` (`projectDir/assets/manifest.json`) for authored invoke exports.
  - manifest mappings are now consulted before filename conventions; explicit `editorState.assetPath` hints still override both.
  - added project-scoped manifest path filtering to reject out-of-project absolute paths and parent traversal patterns.
  - added regression coverage:
    - `crates/export-core/src/lib.rs` (`project_manifest_asset_mappings_are_preferred_over_conventions`)
    - `apps/desktop/src-tauri/src/invoke_api.rs` (`export_preview_dispatch_prefers_project_asset_manifest_mappings`)
  - validated with:
    - `cargo test -p export-core`
    - `CARGO_TARGET_DIR=target-tauri cargo test -p gcs-desktop --bin gcs-desktop`
    - `npm run lint`
    - `npm test`
    - `npm run test:e2e:authored:profiles`

- Project-dir asset-discovery slice:
  - added optional `projectDir` support on invoke export payload and frontend export dispatch path (`apps/desktop/src-tauri/src/invoke_api.rs`, `apps/desktop/src/project-api.js`, `apps/desktop/src/app-state.js`).
  - `export-core` now discovers convention-based project assets (`assets/entities`, `assets/tiles`, `assets/sprites`) by entity slug/tile id when `projectDir` is provided, with explicit `assetPath` hints taking priority.
  - added coverage in:
    - `crates/export-core/src/lib.rs` (`project_dir_asset_conventions_are_discovered_and_copied`)
    - `apps/desktop/src-tauri/src/invoke_api.rs` (`export_preview_dispatch_discovers_project_asset_conventions`)
    - `apps/desktop/tests/project-api.test.mjs` (invoke payload forwarding for `projectDir`)
  - validated with:
    - `cargo test -p export-core`
    - `CARGO_TARGET_DIR=target-tauri cargo test -p gcs-desktop --bin gcs-desktop`
    - `npm run lint`
    - `npm test`
    - `npm run test:e2e:authored:profiles`

- Authored asset-ingest scaffold slice:
  - `export-core` now accepts authored-state asset hints and copies source files when `assetPath` is present on authored entities/tiles (`assets/imported/*`), with deterministic placeholder fallback preserved.
  - invoke export dispatch now passes authored-state hints into export-core (`apps/desktop/src-tauri/src/invoke_api.rs`).
  - added regression coverage for copied source assets in:
    - `crates/export-core/src/lib.rs`
    - `apps/desktop/src-tauri/src/invoke_api.rs`
  - validated with:
    - `cargo test -p export-core`
    - `CARGO_TARGET_DIR=target-tauri cargo test -p gcs-desktop --bin gcs-desktop`
    - `npm run lint`
    - `npm run test:e2e:authored:profiles`

- Authored export profile-coverage slice:
  - added browser E2E authored profile-lane spec `apps/desktop/tests-e2e/authored-export-profiles.spec.mjs`.
  - new coverage validates authored invoke export behavior for `game_boy`, `nes`, `snes`:
    - metadata profile contract
    - profile viewport sizing in `scenes.json`
    - non-zero manifest asset packaging
    - runtime asset load + authored scene render bridge path
  - added command `npm run test:e2e:authored:profiles`.
  - promoted authored profile-lane coverage into CI (`.github/workflows/ci.yml`) via `Frontend authored export profile E2E` step.
  - validated with:
    - `npm run lint`
    - `npm run test:e2e:authored:profiles`

- Authored-export E2E gate slice:
  - added `apps/desktop/tests-e2e/authored-export.spec.mjs` to verify authored sample artifact generation + packaged asset load path in browser runtime.
  - added `getLoadedAssetCount()` bridge probe in shared export runtime template for deterministic asset-load assertions.
  - added npm command `test:e2e:authored` in `apps/desktop/package.json`.
  - validated with:
    - `npm run test:e2e:authored`

- Export runtime asset-consumption slice:
  - updated shared template `crates/export-core/templates/runtime.js` to load `assets/manifest.json`, preload referenced image files, and render tile/entity sprites via manifest IDs when available.
  - preserved canonical parity-lane determinism by keeping primitive fallback rendering for empty manifests (`asset_count = 0` lanes).
  - expanded runtime template test contract in `crates/export-core/src/lib.rs` to assert manifest fetch path coverage.
  - validated gates:
    - `cargo test -p export-core`
    - `CARGO_TARGET_DIR=target-tauri cargo test -p gcs-desktop --bin gcs-desktop`
    - `npm test`
    - `npm run lint`
    - `npm run test:e2e:export:gb`

- Authored export slice landed on invoke path:
  - `export_preview_html5` now exports authored scene data from live editor state by default (optional `editorState` payload override supported) in `apps/desktop/src-tauri/src/invoke_api.rs`.
  - `crates/export-core/src/lib.rs` now supports explicit scene injection via `build_html5_preview_artifact_with_scenes(...)` and authored-scene construction via `build_authored_preview_scene(...)`.
  - authored invoke export now infers asset references from authored tiles/entities, emits them in `assets/manifest.json`, and packages generated placeholder SVG assets in `assets/generated/*.svg` (`asset_count` now reflects authored content usage for this lane).
  - canonical preview scenes remain available for CLI parity lanes (`gcs-desktop export-preview`) to keep deterministic export parity tests stable.
  - sample builder script now uses invoke-based authored export payload path (`apps/desktop/scripts/build-sample-game-01.mjs`).

- Export preview interactivity slice:
  - upgraded shared export runtime template (`crates/export-core/templates/runtime.js`) with minimal primary-entity movement controls (Arrow/WASD + bridge API)
  - retained parity-scene rendering contract while enabling interactive dogfood validation in exported artifacts
  - added export parity E2E interaction coverage (`apps/desktop/tests-e2e/export-parity.spec.mjs`)
  - added template-level assertions in `crates/export-core/src/lib.rs` for movement/keyboard control surface

- Dogfood validation slice:
  - added explicit end-to-end Playwright dogfood scenario in `apps/desktop/tests-e2e/smoke.spec.mjs` (`dogfood flow builds and export-previews a mini puzzle game`)
  - added running dogfood scenario doc `docs/testing/Dogfood Game Build Scenarios.md`
  - linked dogfood scenario doc from `docs/DOCUMENTATION_INDEX.md`
  - added scripted sample artifact builder `apps/desktop/scripts/build-sample-game-01.mjs` and npm command `build:sample:game01` to generate `samples/Sample Game 01/*`
  - updated sample builder to mirror export output to `apps/desktop/export-artifacts/sample-game-01` for direct static-server preview route

- Puzzle starter implementation slice:
  - upgraded puzzle starter scripting from generic starter graph to dedicated Sokoban logic scaffold in `apps/desktop/src/ui-script-templates.js` (`sokoban_push_rules`)
  - wired onboarding action support for puzzle scaffolding in `apps/desktop/src/ui-onboarding.js`
  - added `Sokoban-style Puzzle Room` walkthrough path in `apps/desktop/src/ui-walkthrough.js` and selector entry in `apps/desktop/src/index.html`
  - fixed launch-dashboard `New` flow to apply starter script templates consistently with in-editor `New` command (`apps/desktop/src/ui-launch-dashboard.js`, `apps/desktop/src/ui-shell.js`)
  - added smoke E2E contract coverage in `apps/desktop/tests-e2e/smoke.spec.mjs` to ensure puzzle template auto-applies puzzle script graph baseline
  - updated scripting node catalog template mappings in `docs/scripting/Event Graph Node Catalog (v1).md`

- Draw Seed starter-quality implementation slice:
  - expanded built-in Draw Seed preset library in `apps/desktop/src/ui-draw-seed.js` with recognizable starter shapes (`tree`, `bush`, `rock`, `crate`, `chest`) while preserving existing quick-preset flows
  - validated quality gates: `node --check apps/desktop/src/ui-draw-seed.js`, `npm run lint`, `npm test`, `npm run test:e2e:smoke`

- Starter pack implementation-planning update:
  - added implementation-facing starter pack baseline doc `docs/tooling/Starter Asset Pack Spec.md` (profile contents, naming/versioning, Draw Seed quality contract)
  - updated docs navigation to include Event Graph catalog + starter pack spec in `docs/DOCUMENTATION_INDEX.md`
  - added a second tutorial target `docs/tutorials/Clone Blueprint - Sokoban Online.md` for online-reference puzzle clone workflow

- Product-UX planning update (logic + asset quality):
  - expanded scripting UX spec with concrete Event Graph baseline (node families, typed links, deterministic execution, subgraphs/state-machine/scoped variable model) in `docs/scripting/Scripting UX and Translation Assistant.md`
  - expanded tool capability matrix with starter asset packs and deterministic seed quality requirements in `docs/tooling/Tool Capability Matrix.md`
  - aligned source-of-truth design spec with no-code nuance model and starter asset quality bar in `Design Doc Final v1.1.txt`
  - added a legal-safe onboarding clone target in `docs/tutorials/Clone Blueprint - Zelda-like Room.md` and linked it from `docs/DOCUMENTATION_INDEX.md`

- Type Safety + render-cost hardening slice:
  - added explicit JSDoc controller/dependency contracts in:
    - `apps/desktop/src/ui-canvas-renderer.js`
    - `apps/desktop/src/ui-playtest.js`
    - `apps/desktop/src/ui-draw-seed.js`
  - improved entity-layer render efficiency in `ui-canvas-renderer` by reusing keyed entity DOM nodes instead of rebuilding every node on high-frequency updates (drag/playtest overlays), while preserving ordering and diagnostics visuals
  - updated type-safety progress tracking in `docs/frontend/Type Safety Plan.md`
  - validated targeted gates: `npm run format:check`, `npm run lint`, `npm test`, `npm run test:e2e:smoke`

- CI strict perf-budget calibration + promotion:
  - extended `apps/desktop/scripts/playwright-metrics.mjs` to consume playtest telemetry attachment payloads and enforce playtest-first-frame/update-delay budgets
  - calibrated CI perf thresholds and enabled strict mode in `.github/workflows/ci.yml` (`GCS_PERF_BUDGET_STRICT=1`)
  - updated testing strategy/living plan docs with strict-mode defaults and playtest perf budget expectations
  - validated targeted gates: `npm run test:e2e:ci`, `npm run test:e2e:metrics`

- Export parity profile-edge hardening:
  - updated `crates/export-core/src/lib.rs` parity scenes so edge/corner tile/entity coverage is profile-dynamic instead of fixed to Game Boy-style coordinates
  - added `profile_bounds_stress_layout` scene to exercise profile-bound corner + overflow clamp behavior
  - validated profile parity gates end-to-end:
    - `npm run test:e2e:export:gb`
    - `npm run test:e2e:export:nes`
    - `npm run test:e2e:export:snes`

- Playtest responsiveness telemetry hardening:
  - added smoke E2E contract coverage for playtest telemetry probes in `apps/desktop/tests-e2e/smoke.spec.mjs` (`playtestFirstFrameDeltaMs` + `playtestLastMetricUpdateDeltaMs`)
  - verified playtest overlay feedback text transitions from pending to measured timings in active playtest
  - strengthened workspace bootstrap test coverage in `apps/desktop/tests/ui-workspace-bootstrap.test.mjs` for playtest telemetry callback wiring
  - validated targeted gates: `npm run lint`, `npm test`, `npm run test:e2e:smoke`

- Export parity fixture expansion:
  - expanded native export preview scene set in `crates/export-core/src/lib.rs` from 4 to 6 scenes to improve profile-aware parity coverage (dense tile layouts + profile-bound corner scenarios)
  - updated `export-core` test assertions for expanded scene count contract
  - validated targeted gates: `cargo test -p export-core`, `npm run test:e2e:export:gb`, `cargo fmt --all -- --check`

- Issues Drawer recovery hardening:
  - expanded runtime error recovery action modeling in `apps/desktop/src/ui-issues-recovery.js` with retry guidance for retryable `app-state` failures (`retry_last_action`) plus reload fallback for non-retryable paths
  - added retry dispatch behavior for script validation, breakpoint updates, and core editor actions using latest snapshot context
  - added unit coverage in `apps/desktop/tests/ui-issues-recovery.test.mjs` for recovery action modeling and retry execution paths
  - validated targeted gates: `npm test`, `npm run lint`, `npm run format:check`

- Playtest runtime hardening + coverage expansion:
  - updated `apps/desktop/src-tauri/src/editor_runtime.rs` so breakpoint reconfiguration clears stale `last_breakpoint_hit`
  - updated breakpoint handling so higher-priority item/quest breakpoints are not overwritten by tick breakpoints in the same tick
  - added direct tests for breakpoint priority, breakpoint reset on reconfigure, and paused/unpaused accumulator carry-over timing
  - validated targeted gate: `cargo test -p gcs-desktop --bin gcs-desktop`

- Closed export artifact runtime duplication follow-up:
  - added shared canonical export templates in `crates/export-core/templates/runtime.js` and `crates/export-core/templates/index.html`
  - updated `crates/export-core/src/lib.rs` to materialize runtime/html from shared templates (debug/mode/profile tokens)
  - updated `apps/desktop/scripts/build-export-artifacts.mjs` to consume the same shared templates, removing inline duplicated renderer/html logic
  - validated targeted gates: `cargo test -p export-core`, `npm run build:export:preview:js`, `npm run test:e2e:export:gb`, `npm run lint`, `npm run format:check`, `cargo fmt --all -- --check`

- Reliability hardening follow-ups closed:
  - capped fallback undo history in `apps/desktop/src/project-api.js` to bounded FIFO (`FALLBACK_UNDO_LIMIT=128`) with regression test coverage
  - added manifest future-schema rejection in `crates/project-core/src/model.rs` with explicit upgrade guidance and unit test coverage in `crates/project-core/src/lib.rs`
  - validated targeted gates: `npm test -- project-api.test.mjs`, `cargo test -p project-core`

- UI/UX hardening pass (best-order implementation from review queue):
  - fixed dashboard profile propagation into workspace assisted-profile selectors so launch settings now affect generated content defaults
  - added retry-safe editor module lazy loader behavior on transient dynamic-import failures with regression test coverage
  - hardened layout preference reads for restricted-storage contexts (`localStorage.getItem` guarded with safe fallback)
  - implemented right-panel tab keyboard accessibility (`Arrow`/`Home`/`End` plus `Enter`/`Space` activation)
  - updated playtest controller listener lifecycle to dispose bound DOM handlers cleanly
  - replaced hard-coded map tile/grid `16px` sizing with profile-ready `--tile-size` CSS variable wiring
  - replaced stale canvas placeholder copy with current user-facing guidance text
  - validated with `npm run lint`, `npm test`, `npm run test:e2e:smoke`, and `npm run test:e2e:visual`

- Continued `ui-shell` decomposition (runtime wiring slice):
  - added `apps/desktop/src/ui-shell-runtime.js` to own playtest toggle behavior, breakpoint toggle delegation, and shared controller-dispose fan-out
  - `apps/desktop/src/ui-shell.js` now uses `createShellRuntimeController(...)` instead of inline `togglePlaytest`, `toggleBreakpoint`, and direct dispose chaining
  - reduced `apps/desktop/src/ui-shell.js` size from `292` to `286` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-shell-runtime.test.mjs` for playtest toggle branch behavior, breakpoint delegation, and safe mixed-list disposal
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (module-bundle loader slice):
  - added `apps/desktop/src/ui-shell-module-bundle.js` to own lazy editor-module dynamic import loading, promise memoization, and preload mark callbacks
  - `apps/desktop/src/ui-shell.js` now delegates preload/module-bundle tracking through `createEditorModuleBundleLoader(...)`
  - reduced `apps/desktop/src/ui-shell.js` size from `317` to `292` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-shell-module-bundle.test.mjs` for one-shot memoized load behavior and preload mark contract
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (shell element query extraction slice):
  - added `apps/desktop/src/ui-shell-elements.js` to own all DOM query wiring (`getElementById`, `querySelector`, `querySelectorAll`) and grouped command/tool button maps
  - `apps/desktop/src/ui-shell.js` now consumes `collectShellElements(document)` and passes that object through `buildWorkspaceBootstrapElements(...)`
  - reduced `apps/desktop/src/ui-shell.js` size from `536` to `317` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-shell-elements.test.mjs` for key ID/selector mapping and grouped control contract
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (editor-workspace render slice):
  - added `apps/desktop/src/ui-shell-render.js` to own editor-workspace render orchestration (health summary, controller render fan-out, status-context derivation)
  - `apps/desktop/src/ui-shell.js` now delegates workspace rendering through `renderEditorWorkspace(...)`
  - reduced `apps/desktop/src/ui-shell.js` size from `550` to `536` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-shell-render.test.mjs` for shell field updates and controller render delegation contract
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (bootstrap element map + help tour steps slice):
  - added `apps/desktop/src/ui-shell-bootstrap-elements.js` for deterministic `HELP_TOUR_STEPS` creation and workspace bootstrap element-map shaping
  - `apps/desktop/src/ui-shell.js` now imports `createHelpTourSteps()` and `buildWorkspaceBootstrapElements(...)` from the new module
  - reduced `apps/desktop/src/ui-shell.js` size from `587` to `550` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-shell-bootstrap-elements.test.mjs` for help-tour sequence contract and element-map reference mapping
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (workspace bootstrap orchestration slice):
  - added `apps/desktop/src/ui-workspace-bootstrap.js` to own editor-workspace controller composition and bind/init sequencing
  - `apps/desktop/src/ui-shell.js` now delegates workspace bootstrapping through `initializeWorkspaceControllers(...)`
  - reduced `apps/desktop/src/ui-shell.js` size from `750` to `587` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-workspace-bootstrap.test.mjs` for controller initialization, bind sequencing, and guardrail callback delegation
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (assisted-guardrail + shell-log helpers):
  - added `apps/desktop/src/ui-assisted-guardrail.js` for deterministic assisted-guardrail fallback/delegation logic
  - added `apps/desktop/src/ui-shell-log.js` for shell log-line formatting helper
  - `apps/desktop/src/ui-shell.js` now uses `resolveAssistedGuardrail(...)` and `formatShellLogLine(...)`
  - reduced `apps/desktop/src/ui-shell.js` size from `752` to `750` lines in this slice
  - added unit coverage:
    - `apps/desktop/tests/ui-assisted-guardrail.test.mjs`
    - `apps/desktop/tests/ui-shell-log.test.mjs`
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (workspace listener bindings slice):
  - added `apps/desktop/src/ui-workspace-bindings.js` to own workspace-scoped listener wiring for:
    - Issues Drawer recovery/auto-fix click actions
    - entity list selection clicks
    - inspector project-name updates
  - `apps/desktop/src/ui-shell.js` now delegates those listeners via `workspaceBindingsController`
  - reduced `apps/desktop/src/ui-shell.js` size from `789` to `752` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-workspace-bindings.test.mjs` for selection derivation and project-name normalization contracts
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (breakpoint toggle slice):
  - added `apps/desktop/src/ui-breakpoints.js` to own enabled/next breakpoint-kind derivation and apply-toggle action wiring
  - `apps/desktop/src/ui-shell.js` now delegates breakpoint toggling through `applyBreakpointToggle(...)`
  - reduced `apps/desktop/src/ui-shell.js` size from `802` to `789` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-breakpoints.test.mjs` for active-kind filtering, toggle derivation, and apply-toggle re-render behavior
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (entry/preload orchestration slice):
  - added `apps/desktop/src/ui-shell-entry.js` to own launch/workspace mode normalization, workspace-init gating, and idle preload scheduling
  - `apps/desktop/src/ui-shell.js` now delegates route transitions and preload scheduling through `shellEntryController`
  - reduced `apps/desktop/src/ui-shell.js` size from `866` to `802` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-shell-entry.test.mjs` for:
    - mode normalization contract
    - initialized-vs-deferred workspace entry behavior
    - init error reporting path
    - one-shot idle preload scheduling behavior
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (health/issues model slice):
  - added `apps/desktop/src/ui-health-issues.js` to own health summary + Issues Drawer source list composition logic
  - `apps/desktop/src/ui-shell.js` now consumes `buildHealthIssuesModel(...)` instead of inlined conditional/aggregation block
  - reduced `apps/desktop/src/ui-shell.js` size from `884` to `866` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-health-issues.test.mjs` for awaiting-health and aggregated warning/limit/error/guardrail contracts
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (status/HUD render slice):
  - added `apps/desktop/src/ui-shell-status.js` to own command/tool disabled-state logic, HUD labels, runtime badge state, and layout/profile apply hooks
  - `apps/desktop/src/ui-shell.js` now delegates that render block via `shellStatusController`
  - reduced `apps/desktop/src/ui-shell.js` size from `894` to `884` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-shell-status.test.mjs` for edit/playtest status-model contracts
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (entity-list render slice):
  - added `apps/desktop/src/ui-entity-list.js` to own deterministic entity-row formatting and DOM row rendering
  - `apps/desktop/src/ui-shell.js` now delegates entity list rendering through `entityListController`
  - reduced `apps/desktop/src/ui-shell.js` size from `902` to `894` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-entity-list.test.mjs` for empty-state and selected-row formatting contracts
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (state-event wiring slice):
  - added `apps/desktop/src/ui-shell-events.js` to own `state.events.on(...)` subscriptions and event-side log/render behaviors
  - `apps/desktop/src/ui-shell.js` now delegates event binding/disposal to `shellEventsController`
  - reduced `apps/desktop/src/ui-shell.js` size from `990` to `902` lines in this slice
  - added unit coverage in `apps/desktop/tests/ui-shell-events.test.mjs` for:
    - onboarding + playtest sync callbacks from state events
    - deduped playtest status/breakpoint log behavior
    - `app:error` render trigger behavior and unsubscribe cleanup
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (lifecycle boundary slice):
  - added `apps/desktop/src/ui-shell-lifecycle.js` to own global error-boundary wiring and before-unload teardown registration
  - `apps/desktop/src/ui-shell.js` now delegates shell-wide lifecycle hooks to `shellLifecycleController`
  - added unit coverage in `apps/desktop/tests/ui-shell-lifecycle.test.mjs` for:
    - `window:error` forwarding
    - `window:unhandledrejection` forwarding
    - before-unload disposal callback execution
  - validated quality gates (`npm run lint`, `npm test`)

- Advanced frontend type-safety Phase 1 contracts:
  - added explicit JSDoc dependency/controller contracts in `apps/desktop/src/ui-launch-dashboard.js`
  - documented lifecycle contract typing progress in `docs/frontend/Type Safety Plan.md`
  - validated quality gates (`npm run lint`, `npm test`)

- Extended CI Playwright metrics automation with trend deltas:
  - `apps/desktop/scripts/playwright-metrics.mjs` now computes perf deltas against the previous perf-enabled daily summary row
  - metrics artifact now includes `Perf Trend Delta` section for dashboard paint/editor init/workspace-enter timing
  - emits non-blocking trend warnings when regressions exceed configurable env thresholds:
    - `GCS_PERF_DELTA_WARN_DASHBOARD_MS`
    - `GCS_PERF_DELTA_WARN_EDITOR_INIT_MS`
    - `GCS_PERF_DELTA_WARN_WORKSPACE_ENTER_MS`
  - validated via `npm run test:e2e:ci` + `npm run test:e2e:metrics`

- Added direct unit coverage for perf instrumentation module:
  - created `apps/desktop/tests/ui-perf-metrics.test.mjs` covering initial publish contract + delta/preload-source semantics
  - updated frontend coverage matrix to include perf instrumentation unit layer
  - validated quality gates (`npm run lint`, `npm test`)

- Continued `ui-shell` decomposition (perf instrumentation slice):
  - extracted launch/workspace perf metric logic into `apps/desktop/src/ui-perf-metrics.js`
  - `apps/desktop/src/ui-shell.js` now uses `createPerfMetricsController` instead of inline perf state helpers
  - preserved existing perf metric surface contract (`window.__gcsPerfMetrics`) and smoke assertions
  - validated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`)

- Added CI perf budget summary pipeline (soft-warning mode):
  - smoke perf probe now attaches launch/workspace metrics payload via Playwright `testInfo.attach`
  - `apps/desktop/scripts/playwright-metrics.mjs` now parses perf attachments, summarizes budget checks, and emits warnings without failing by default
  - added optional strict mode switch (`GCS_PERF_BUDGET_STRICT=1`) for later gate promotion
  - CI workflow now sets explicit perf budget env vars in metrics step (`.github/workflows/ci.yml`)
  - validated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`, `npm run test:e2e:metrics`)

- Added launch/workspace perf instrumentation probes:
  - `apps/desktop/src/ui-shell.js` now publishes `window.__gcsPerfMetrics` (dashboard first paint, preload schedule/resolve, editor init duration, workspace-enter timing)
  - added smoke E2E contract coverage in `apps/desktop/tests-e2e/smoke.spec.mjs` (`launch and workspace expose performance metrics probes`)
  - validated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`)

- Added dashboard idle-time editor preloading:
  - introduced best-effort module preload scheduling on dashboard route using `requestIdleCallback` with timeout fallback
  - shared module bundle promise now prevents duplicate preloads and duplicate workspace init import work
  - kept preload strictly non-blocking and failure-tolerant
  - validated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`)

- Completed dashboard Phase C code-splitting pass in `apps/desktop/src/ui-shell.js`:
  - replaced static editor-controller imports with on-demand `import(...)` loading during workspace init
  - added initialization promise guard (`editorWorkspaceInitPromise`) to avoid duplicate module boot paths
  - kept dashboard route responsive while editor chunks load and hard-failed errors through `app:error`
  - hardened route transition sequencing so `editor_workspace` mode is entered after init readiness
  - stabilized keyboard shortcut E2E by explicitly focusing canvas before shortcut assertions
  - validated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`)

- Added deferred editor-workspace initialization boundary in `apps/desktop/src/ui-shell.js`:
  - editor controllers/events now initialize on first transition to `editor_workspace` instead of on launch dashboard render
  - launch dashboard remains interactive while heavy editor bind/setup work is deferred
  - runtime state event handlers were hardened with optional controller guards so dashboard mode stays safe pre-init
  - fixed dashboard UI-mode handoff by persisting selected profile before workspace init (`apps/desktop/src/ui-launch-dashboard.js`)
  - validated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`)

- Completed dashboard route integration in shell:
  - wired `apps/desktop/src/ui-launch-dashboard.js` into `apps/desktop/src/ui-shell.js` (bind, render-route gate, dispose lifecycle)
  - launch route now controls visibility for `#launch-dashboard` and `#editor-workspace`
  - set `#editor-workspace` initial hidden state in `apps/desktop/src/index.html` to avoid first-paint route flicker/selector ambiguity
  - set dashboard UI mode default to `beginner`
  - updated smoke coverage in `apps/desktop/tests-e2e/smoke.spec.mjs` for dashboard heading/runtime badge contract, dashboard-driven first-project setup, and `Continue`/`Recover` action flows
  - validated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`, `npm run test:e2e:smoke`)

- Added dashboard-first product and implementation planning set:
  - created `docs/frontend/Launch Dashboard and Entry Flow.md` with concrete UX architecture, coding/performance best practices, and rollout phases
  - synced visual system rules for dashboard-first entry and beginner defaults in `docs/frontend/Visual Design System.md`
  - synced sprint immediate tasks to prioritize dashboard route state + creation flow before additional shell density increases
  - updated testing/docs artifacts to include dashboard route + onboarding-first quality gates

### 2026-02-14
- Continued `P1` `ui-shell` decomposition (issues + recovery slice):
  - extracted issue row assembly, assisted guardrail/action generation, and runtime recovery-action routing into `apps/desktop/src/ui-issues-recovery.js`
  - `ui-shell` now delegates issue rendering and recovery execution through `issuesRecoveryController`
  - preserved onboarding guardrail callback contract via thin shell wrapper while removing duplicated issue/recovery logic from shell
  - reduced `apps/desktop/src/ui-shell.js` from `1029` to `797` lines in this slice
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` `ui-shell` decomposition + `P2` incremental render optimization (canvas slice):
  - extracted map tile/entity render paths into `apps/desktop/src/ui-canvas-renderer.js`
  - `ui-shell` now delegates canvas DOM rendering to `canvasRendererController`
  - added lightweight signature-based change detection for tiles/entities/selection/diagnostics/drag preview so unchanged render passes skip DOM rebuilds
  - reduced `apps/desktop/src/ui-shell.js` from `1091` to `1029` lines while preserving existing selector/interaction contracts
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` UX layout hardening (panel density + discoverability slice):
  - added collapsible workspace rails (`Hide/Show Left Panel`, `Hide/Show Right Panel`) with persisted layout state in `apps/desktop/src/ui-layout-panels.js`
  - added right-panel tabbing (`Inspector`, `Draw`, `Script`, `Issues`) to reduce scroll overload and keep focused workflows visible
  - wired profile-aware tab visibility so Beginner mode only surfaces relevant tabs
  - integrated lifecycle hooks into shell (`bindEvents`/`renderLayout`/`dispose`) to keep module boundaries clean
  - expanded Playwright coverage for panel collapse + right-panel tab behavior in `apps/desktop/tests-e2e/smoke.spec.mjs`
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` `ui-shell` decomposition (map viewport slice):
  - extracted map viewport controls into `apps/desktop/src/ui-map-viewport.js`
  - moved diagnostic overlay toggles (`grid`, `collision`, `ids`), zoom mode state (`fit/1x/2x/3x`), and fit-scale math out of shell
  - `ui-shell` now delegates viewport bind/render/dispose lifecycle through `mapViewportController`
  - `mapInteractionController` now reads zoom scale from viewport controller instead of shell-owned mutable state
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` `ui-shell` decomposition (editor input slice):
  - extracted map action button + keyboard shortcut pipeline into `apps/desktop/src/ui-editor-input.js`
  - moved map command buttons (`create/move/delete/undo/redo/reselect`), tool buttons, and keyboard command handling out of shell
  - `ui-shell` now delegates editor input bind/dispose lifecycle through `editorInputController`
  - preserved existing keyboard behaviors (`F5`, `Escape`, `v/b/e`, delete, undo/redo/reselect)
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` `ui-shell` decomposition (topbar command slice):
  - extracted topbar command dispatch (`open`/`save`/`play`/`new`) into `apps/desktop/src/ui-command-bar.js`
  - `ui-shell` now delegates topbar command bind/dispose lifecycle through `commandBarController`
  - preserved starter-template bootstrap flow for `new` command by delegating into script-template controller
  - removed inline shell listener block for `button[data-command]`
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` `ui-shell` decomposition (preferences slice):
  - extracted UI profile preference storage/apply lifecycle into `apps/desktop/src/ui-preferences.js`
  - `ui-shell` now delegates UI profile bind/dispose/apply behavior through `preferencesController`
  - removed shell-level UI profile helpers (`read/write/apply` + localStorage safety wrapper duplication)
  - preserved existing profile UX (`beginner`/`builder`) and render behavior
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` `ui-shell` decomposition (Script Lab validation slice):
  - extracted Script Lab validation UI concerns into `apps/desktop/src/ui-script-lab.js`
  - moved validate-button event binding, validation summary rendering, and script issue auto-fix flow out of `ui-shell`
  - `ui-shell` now delegates Script Lab lifecycle (`bindEvents`/`dispose`) and script autofix execution to `scriptLabController`
  - preserved Issues Drawer auto-fix integration and script-validated event logging
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` `ui-shell` decomposition (script-template slice):
  - extracted Script Lab template persistence/apply/save/delete flow into `apps/desktop/src/ui-script-templates.js`
  - `ui-shell` now delegates script-template init/bind/dispose and starter-template application through `scriptTemplatesController`
  - removed script-template storage/options wiring and related helper methods from `ui-shell` to reduce monolith scope
  - preserved existing selector contracts and onboarding starter-template flow
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` `ui-shell` decomposition (debug panels slice):
  - extracted trace/watch/issues panel rendering + filter state/event lifecycle into `apps/desktop/src/ui-debug-panels.js`
  - `ui-shell` now delegates debug panel bind/dispose and render paths through `debugPanelsController`
  - removed redundant per-render issue button listener attachment; retained delegated click handling in shell for recovery/script auto-fix actions
  - reduced monolith surface while preserving DOM selectors and existing interaction contracts
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Added graceful local-storage write failure handling:
  - `ui-shell` now wraps UI profile/script template persistence with safe `setItem` handling and user-visible log fallback
  - `ui-draw-seed` now handles `QuotaExceededError`/storage failures when saving custom presets
  - prevents hard failures in long sessions where browser storage quota is exhausted
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Completed `P1` DOM sink safety hardening in shell rendering paths:
  - removed remaining `innerHTML` writes from `apps/desktop/src/ui-shell.js` and `apps/desktop/src/ui-draw-seed.js`
  - moved entity list, issues list, tile/entity canvas layers, trace rows, watch rows, and script-template option rendering to `createElement` + `replaceChildren`
  - removed stale `escapeHtml` prop wiring after converting to DOM node construction
  - revalidated quality gates (`npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Continued `P1` DOM sink safety hardening:
  - removed `innerHTML` usage from extracted UI controllers (`ui-onboarding`, `ui-walkthrough`, `ui-help-tour`)
  - switched checklist/help/walkthrough rendering to explicit DOM builders (`createElement`, `replaceChildren`)
  - preserved interaction behavior and selectors used by existing smoke E2E flows
  - reduced lint warning surface for restricted HTML sinks to remaining legacy modules (`ui-shell`, `ui-draw-seed`)
  - validated with `npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`

- Applied optimization hardening fixes from ranked queue:
  - replaced saturating entity ID allocation with checked overflow error path in `engine-core` map editor
  - added overflow regression test to prevent silent duplicate IDs on counter exhaustion
  - enforced explicit backup contract (`max_backups=0` disables backup creation) and added unit test coverage
  - added ESLint guardrails for risky direct HTML sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`)
  - recorded ranked optimization queue with acceptance criteria for ongoing sprint execution

- Completed quick self-review cleanup pass (docs/test/code quality):
  - added security headers to dev static server responses (`apps/desktop/scripts/static-server.mjs`) to reduce browser-side security drift during local runs
  - optimized migration registration path with ordered insertion (`crates/project-core/src/migration.rs`) to avoid sorting entire migration list on each register call
  - ran formatting normalization for frontend code/tests/scripts and restored clean style gate
  - revalidated core gates after changes (`cargo fmt --check`, `cargo check`, `cargo test`, `npm run format:check`, `npm run lint`, `npm test`, `npm run test:e2e:smoke:quickstart`)

- Continued frontend monolith decomposition (Onboarding slice):
  - extracted Quick Start checklist state/render/action flow from `ui-shell.js` into `apps/desktop/src/ui-onboarding.js`
  - `ui-shell` now delegates onboarding rendering/actions/event binding through `onboardingController`
  - removed duplicate per-render onboarding action listeners and standardized on delegated checklist click handling
  - added explicit onboarding cleanup on unload via `onboardingController.dispose()`
  - verified quality gates remain green (`npm run lint`, `npm test`, targeted `npm run test:e2e -- tests-e2e/smoke.spec.mjs --grep "quick start|guided walkthrough"`)

- Added faster local E2E commands to reduce rerun cycle time during sprint execution:
  - added `npm run test:e2e:smoke` and `npm run test:e2e:smoke:quickstart`
  - kept full `npm run test:e2e` as release-path command with mandatory export build parity step
  - confirmed quickstart subset stability with back-to-back repeat runs (`2/2` green)

- Continued frontend monolith decomposition (Help/tour slice):
  - extracted help overlay + guided-tour logic into `apps/desktop/src/ui-help-tour.js`
  - moved help visibility/tour state, focus sync, and summary action handling out of `ui-shell`
  - `ui-shell` now calls `helpTourController.renderHelpOverlay(...)` and binds help events via controller
  - added help controller unload cleanup path for event/focus lifecycle safety
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run test:e2e:visual`)

- Stabilized local Playwright harness against pass/fail rerun flakiness:
  - identified root cause as concurrent E2E jobs sharing one local static server lifecycle/port
  - `static-server` now supports configurable port via env
  - added dedicated visual config (`playwright.visual.config.mjs`) on isolated port `4174`
  - switched visual script to isolated config and made server ownership deterministic (`reuseExistingServer: false`)
  - validated by running regular E2E and visual suites concurrently with green results

- Started Type Safety Plan Phase 1 (JSDoc contracts):
  - added shared frontend type contracts in `apps/desktop/src/types.js` (snapshot + editor response + command payload shapes)
  - wired contracts into `app-state` and `project-api` for key state/application command surfaces
  - kept implementation non-breaking (JS runtime unchanged) while reducing payload-shape drift risk
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run test:e2e:visual`)

- Continued frontend monolith decomposition (Map interaction slice):
  - extracted map pointer interaction logic into `apps/desktop/src/ui-map-interaction.js`
  - moved drag/marquee/stroke event pipelines and map tool mode state out of `ui-shell`
  - `ui-shell` now consumes controller-provided state for HUD/tool active state and entity drag rendering offsets
  - added controller cleanup on unload to remove window/surface listeners explicitly
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run test:e2e:visual`)

- Continued frontend monolith decomposition (Playtest slice):
  - extracted playtest rendering/loop/controls into `apps/desktop/src/ui-playtest.js`
  - `ui-shell` now delegates playtest viewport rendering and playtest loop sync to the new module
  - added explicit playtest `ResizeObserver` lifecycle cleanup via module `dispose()` on unload
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run test:e2e:visual`)

- Continued frontend monolith decomposition (Draw Studio slice):
  - extracted Draw Studio seed/preset state + import/export + preview rendering into `apps/desktop/src/ui-draw-seed.js`
  - `ui-shell` now delegates draw-seed preset controls, draft preview, and warning state access to the new controller
  - preserved existing selectors/behavior and issue-action paths (`dismiss_draw_preset_warnings`)
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run test:e2e:visual`)

- Started frontend monolith decomposition (high-priority hardening):
  - extracted walkthrough engine/state/rendering from `ui-shell.js` into `apps/desktop/src/ui-walkthrough.js`
  - `ui-shell` now delegates walkthrough start/step/render/click handling to the dedicated controller
  - preserved existing selectors and behavior to keep E2E compatibility stable
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run test:e2e:visual`)

- Added lightweight visual regression lane for UI stability:
  - introduced Playwright visual baseline spec (`topbar`, `canvas shell`, `Issues Drawer severity rows`)
  - added `npm run test:e2e:visual` for targeted UI/CSS regression checks
  - updated test docs/coverage matrix with visual lane scope
  - verified visual lane baseline run (`npm run test:e2e:visual` -> `2 passed`)

- Executed Phase B visual polish (CSS-only, selector-stable) from Visual Design System:
  - normalized control hit targets to >=32px across topbar/toolbars/panels for accessibility baseline
  - added consistent button/input/select/textarea motion states and reduced-motion fallback
  - improved visual hierarchy for topbar action cluster and canvas view-controls cluster (calmer chrome, clearer grouping)
  - unified component radii/timing tokens and refined active/hover states without changing DOM behavior
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Expanded Draw Studio preset import diagnostics into Issues Drawer:
  - preset import warnings now persist as actionable Issues Drawer rows after import (unknown keys, clamped points, invalid point entries)
  - added `Dismiss` action for Draw preset import warnings to avoid stale/noisy issue lists after review
  - added warning severity tags (`info` / `warning` / `error`) for faster scan and prioritization in Issues Drawer
  - expanded browser E2E to assert warning surfacing and dismissal behavior
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Added Draw Studio preset schema/version metadata and import compatibility warnings:
  - exported/copy preset payload now includes `schema_id` + `schema_version`
  - import flow now surfaces compatibility warnings for missing/newer schema version and schema-id mismatch
  - expanded Draw Studio E2E to assert schema metadata is present in exported JSON
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Completed Draw Studio copy/share UX for preset portability:
  - added one-click preset `Copy` action with clipboard support and deterministic textarea fallback
  - expanded Draw Studio E2E to verify copy/share path plus duplicate-import conflict path
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Hardened Draw Studio preset portability behavior:
  - import now resolves name conflicts deterministically (no silent overwrite) using suffixed custom keys/titles
  - expanded Draw Studio E2E to verify conflict import creates a distinct custom preset and remains re-applicable
  - updated Playwright local server behavior (`reuseExistingServer: !CI`) to avoid local port-collision friction during active dev
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Added Draw Studio draft preset persistence/import-export:
  - added preset manager controls (`Apply`, `Save`, `Delete`, `Export`, `Import`) with local preset list
  - added local-storage persistence for custom presets with validation and normalization
  - added JSON import/export path for preset portability across sessions/users
  - expanded browser E2E coverage for save/apply/export preset workflow
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Added Draw Studio draft preset controls for faster primitive ideation:
  - added quick preset buttons (`Cluster`, `Line`, `Ring`) in Draw Studio Seed panel
  - preset selection now updates mini-canvas draft points and preview list before map apply
  - preserved preset drafts across offset/profile edits until explicit primitive/mirror reset
  - expanded browser E2E to verify preset preview transformation before apply
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Upgraded Draw Studio seed flow to editable draft-before-apply:
  - added Draw Studio draft controls (`Offset X`, `Offset Y`, `Mirror X`), per-tile mini-canvas toggling, and live draft preview rows
  - assisted generation now accepts deterministic draft options (`baseX`, `baseY`, `mirrorX`) and explicit draft `points` in `app-state`
  - expanded unit and browser E2E coverage for draft-editable apply behavior
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Added Draw Studio assisted-seed integration:
  - added `Draw Studio Seed` panel with profile/primitive controls and map-apply action
  - reused shared assisted generation logic to keep Quick Start + Draw Studio behavior aligned
  - added Draw Studio seed browser E2E coverage and hardened assisted selector matching for multi-surface controls
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `35 passed`)

- Added proactive assisted-guardrail action flow:
  - Issues Drawer now includes one-click actions for profile switching and generated-prop cleanup
  - added profile-targeted cleanup command path in `app-state` (`cleanupAssistedGenerated`)
  - hardened Issues Drawer action click handling with resilient target resolution
  - added unit + Playwright coverage for switch/cleanup paths
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `34 passed`)

- Added assisted-generation guardrail messaging for profile limits:
  - Issues Drawer now includes profile-aware assisted-content warnings (`near cap` and `limit reached`)
  - Quick Start onboarding hint now appends guardrail guidance based on selected assisted profile capacity
  - guardrail computation is lightweight and local (UI-derived counts, no backend dependency)
  - added Playwright regression coverage for near-limit warning visibility
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `32 passed`)

- Expanded assisted-content v1 into profile-aware generation:
  - added assisted profile selector in Quick Start (`Game Boy`, `NES`, `SNES`)
  - generator now uses profile tile IDs (`1/2/3`) and profile-tagged prop names (`GB`/`NES`/`SNES`)
  - updated tests for profile-aware behavior in unit and browser E2E suites
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `31 passed`)

- Completed assisted-content v1 seed scope (procedural primitive generator + UX hooks):
  - added Quick Start assisted-content controls (`Tree`, `Bush`, `Rock`, `Crate`, `Chest`) with one-click primitive generation
  - added deterministic local primitive generator path in `app-state` (`generatePrimitiveAsset`) reusing map paint/entity commands
  - kept implementation lightweight and offline-first (no network/model dependency)
  - added regression coverage (`app-state` unit + Playwright browser E2E)
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `31 passed`)

- Completed UI visual hardening Phase A (tokenization-only, no structural refactor):
  - added semantic theme tokens to `apps/desktop/src/styles.css` and mapped existing shell surfaces/controls to shared tokens
  - added consistent keyboard `:focus-visible` treatment for button/input/select/textarea controls
  - preserved existing selectors/DOM/layout to avoid interaction regressions during Sprint 2 runtime stabilization
  - verified quality gates remain green (`npm run lint`, `npm test`, `npm run test:e2e` -> `30 passed`)

- Completed first-pass product UX starter-template onboarding:
  - added topbar starter-template picker and wired `New` to apply selected starter
  - added `map_reset` backend command for deterministic clean-slate project bootstrap
  - seeded starter entities/tiles via `app-state` template flow (`rpg`, `platformer`, `puzzle`, `blank`)
  - applied starter script templates by profile in `ui-shell`
  - verified `cargo test -p gcs-desktop --bin gcs-desktop` (`40/40`) pass
  - verified frontend unit/lint/browser suites pass (`npm test`, `npm run lint`, `npm run test:e2e` -> `19/19`)

- Completed first-pass guided Quick Start checklist:
  - added `Quick Start` panel in shell with live milestone status text + completion state
  - wired checklist progress to template/new flow, authored content presence, playtest, and save
  - added inline action affordances for pending checklist steps
  - added contextual next-step tip text with expected outcomes
  - added browser E2E coverage for full checklist progression to completed state
- Completed first-pass in-app help overlays:
  - added topbar `Help` toggle and contextual help panel in the canvas workspace
  - added mode-aware help content (Map Help vs Playtest Help)
  - added guided tour controls with step-by-step highlighted target controls
  - added guided-tour `Do It` action to auto-advance tour steps
  - added tour-complete summary state with quick next actions
  - hardened tour completion quick actions with state-aware labels/disable rules and inline status feedback
  - fixed canvas interaction routing so clicks inside Help overlay do not trigger map selection/marquee handlers
  - verified browser E2E coverage for help context switching + guided tour (`25/25` total E2E)

- Completed editor zoom ergonomics for map/tile authoring:
  - added map zoom controls (`Map Fit`, `Map 1x`, `Map 2x`, `Map 3x`) in main view controls
  - added map-layer scaling with pointer-coordinate correction to keep paint/select/drag behavior accurate while zoomed
  - added logical map-size scaling support for authored content bounds
  - validated frontend quality gates (`npm run lint`, `npm run test:e2e` -> `25/25`)
- Completed first-pass Issues Drawer recovery templates:
  - runtime errors now provide contextual recovery actions (reload editor state, retry save/open, restart playtest)
  - recovery actions are integrated into shared Issues Drawer click handling alongside script auto-fix actions
  - browser E2E updated to assert recovery action presence on surfaced runtime errors
  - validated browser suites remain green (`25/25`, with 1 known `fixme` drag case)

- Completed first-pass UI profile progressive disclosure:
  - added `Builder UI` / `Beginner UI` selector in topbar and persisted preference per user
  - beginner mode now hides advanced editing controls and advanced right-panel tooling
  - retained one-product workflow while reducing first-open visual complexity
  - added browser E2E coverage for profile-mode visibility transitions
  - added runtime mode badge (`Web Mode` / `Desktop Local`) for capability clarity in one-product UX

- Completed first-pass guided walkthrough framework:
  - added data-driven walkthrough definitions for `Zelda-like Room`, `Chrono-style Town`, and `Platformer Room`
  - added walkthrough UI controls in Quick Start (`Start Walkthrough`, `Run Step`) with step status/completion rendering
  - integrated walkthrough execution with onboarding action pipeline for predictable behavior
  - added per-step teaching metadata (`Why`, `Expected`) so walkthroughs explain design intent and expected outcomes
  - added walkthrough completion action cluster (`Playtest`, `Export Preview`, `Start Over`) for clear post-tutorial flow
  - added browser E2E coverage for walkthrough progression (`start` + `run step`)

- Completed Hardening Wave 1 frontend global error boundary slice:
  - added `app-state.reportError(...)` for centralized non-guarded error routing
  - installed `window` global error handlers in `ui-shell` (`error`, `unhandledrejection`)
  - surfaced runtime/global errors in Issues Drawer via `snapshot.lastError`
  - added frontend unit coverage for `reportError` emission path
  - added browser E2E coverage validating both global error paths surface to Issues Drawer/log
  - fixed UI refresh on `app:error` so issues update immediately after runtime failure
  - verified `npm test` (`23/23`) and `npm run lint` pass
  - verified `npm run test:e2e` (`17/17`) pass

- Completed Hardening Wave 1 runtime trace optimization:
  - switched `editor_runtime` playtest trace buffer from `Vec` to `VecDeque`
  - removed front-removal O(n) behavior in bounded trace retention
  - replaced playtest simulation magic numbers with named constants for maintainability
  - added `runtime_trace_buffer_keeps_fifo_order_with_limit` regression test
  - added `runtime_breakpoint_event_pauses_and_captures_watch_updates` regression test
  - added `runtime_tick_inactive_updates_last_tick_fields` and `runtime_quest_breakpoint_triggers_and_can_resume`
  - verified `cargo test -p gcs-desktop --bin gcs-desktop` passes (`38/38`)

### 2026-02-12
- Updated `Design Doc Final v1.1.txt` for product alignment:
  - Defined UI exposure profiles (Beginner / Builder / Pro) while keeping one engine/runtime
  - Added diagnostics architecture: deterministic local checks + built-in fix knowledge + optional cloud advisor (opt-in)
- Initialized workspace scaffold for apps, crates, tests, and tools.
- Added Sprint running doc, README, and ADR stubs.
- Bootstrapped Rust workspace with `project-core`, `engine-core`, `export-core`, and desktop app crate.
- Implemented `project-core` modular foundation:
  - `model`: schema constants + manifest + save report
  - `storage`: atomic save/load + backup creation + load/migrate entrypoint
  - `migration`: migration runner + v0->v1 idempotent step + reporting
  - `error`: typed project error taxonomy
- Added safety enhancements:
  - Configurable backup rotation with max backup retention
  - Recovery state scan API (temp-file + backup visibility)
  - Restore latest backup helper for crash-recovery flows
- Added unit tests for validation, atomic save roundtrip, backup creation, and legacy migration.
- Expanded tests for backup rotation and backup restore recovery behavior.
- Added migration execution enhancements:
  - In-place migration API with pre-migration rollback snapshot creation
  - Migration report now includes changed files, warnings, and rollback snapshot path
- Added `ProjectHealth` report shape for desktop consumption.
- Added desktop app service flow (`open_project`) with dry-run and apply-migrations modes.
- Expanded desktop app service flow:
  - `open_project`
  - `save_project`
  - `project_health`
  - `migrate_project`
- Added desktop service tests for legacy dry-run, migration apply, and current-schema open.
- Added `command-core` crate:
  - `Command` trait
  - `CommandStack` undo/redo manager
  - `BatchCommand` aggregation behavior
  - `ContextCommandBus` for context-scoped histories
  - command-stack unit tests
- Added `engine-core` map editor command model:
  - `MapEditorState`
  - `CreateEntityCommand`
  - `MoveEntityCommand`
  - batch move integration test
- Added desktop editor runtime/session foundation:
  - `EditorSession` with active context + selection/reselect history
  - `EditorRuntime` with command-driven map create/move/batch-move
  - context-aware undo/redo through `ContextCommandBus`
  - runtime/session unit tests
- Added desktop editor service API and CLI command surface:
  - `editor_service` in-memory runtime gateway
  - map command operations: create, move, batch-move, undo, redo, reselect, state
  - CLI wiring for map command operations
- Added visual map interaction controls in UI shell:
  - Add Entity / Move Selected / Undo / Redo / Reselect buttons
  - Map Entities list with selected-state display
  - frontend fallback model now supports map command history and reselect
- Added selection integrity and interaction improvements:
  - runtime now normalizes selection after undo/redo/reselect to avoid stale IDs
  - editor service `select_map_entities` endpoint with invalid-ID filtering
  - UI entity list click-to-select with Ctrl/Cmd additive selection
  - fallback API supports `map_select` behavior
- Added interaction polish + sprint integration coverage:
  - backend editor state now reports `can_undo` and `can_redo`
  - UI buttons disable based on selection/history availability
  - keyboard shortcuts wired for undo/redo/reselect
  - end-to-end workflow test added (`open -> create -> move -> undo/redo -> save`)
- Added invoke-aligned backend command surface:
  - `invoke_api` dispatcher with command names matching frontend (`open_project`, `save_project`, `map_*`)
  - generic CLI invoke command (`gcs-desktop invoke <command> <json-payload>`)
  - dispatcher tests for map create/select roundtrip
- Added reusable command gateway layer:
  - centralized command execution + JSON dispatch helper
  - CLI invoke path now routes through shared gateway (pre-Tauri registration step)
- Hardened desktop test reliability:
  - static runtime tests synchronized with test lock
  - integration assertions switched to entity-ID lookup to avoid order assumptions
- Added frontend editor UI shell scaffold:
  - Topbar commands
  - Workspace/Health left panel
  - Central canvas surface placeholder with grid overlay
  - Inspector + Issues drawer right panel
  - Log console footer
- Added frontend state bridge:
  - `project-api.js` for backend invoke/fallback
  - `app-state.js` for centralized UI state transitions
  - `event-bus.js` for typed UI command/result events
  - `ui-shell.js` render/update loop for health/issues/project name
- Added command-driven map erase flow end-to-end:
  - `DeleteEntityCommand` in `engine-core` with undo/redo coverage
  - runtime/service/invoke/CLI `map_delete` operation
  - frontend Delete Selected action + Delete/Backspace shortcut
  - delete button state now tracks current selection
- Added interactive canvas entity layer for Sprint 2 UX:
  - entity nodes render on the map surface with selected-state styling
  - click-to-select on canvas + canvas click to clear selection
  - drag preview on selected entities with grid-snapped move commit on pointer release
- Added Sprint 2 tile authoring vertical slice:
  - `PaintTileCommand` and `EraseTileCommand` in command bus path
  - runtime/service/invoke/CLI map tile operations (`map_paint_tile`, `map_erase_tile`)
  - frontend tool modes (Select/Paint/Erase) with tile rendering on canvas
  - canvas click paints/erases grid cells and updates undo/redo history
- Added Sprint 2 Tauri-invoke bridge preparation:
  - new `tauri_bridge` module exposes shared invoke executor for CLI and future Tauri command registration
  - feature-gated `#[tauri::command] invoke_command(...)` wrapper behind `tauri-runtime`
  - CLI `invoke` path now routes through the same bridge executor
- Added Sprint 2 canvas marquee selection:
  - drag rectangle on empty canvas area to select entities in bounds
  - visible marquee overlay while dragging
  - selection commit occurs on pointer release and reuses existing selection API path
- Added Sprint 2 tile paint/erase drag stroke support:
  - pointer-drag now paints/erases continuously across crossed grid cells
  - stroke path interpolation fills skipped cells during fast mouse movement
  - pointer-up handling now commits drag/marquee/stroke states independently
- Added Sprint 2 playtest shell loop + tool UX polish:
  - playtest enter/exit controls with pause/resume, step, and speed controls (1x/0.5x/0.25x)
  - HUD now shows mode (Edit/Playtest), active tool, and selection count
  - hotkeys added: `F5` toggle playtest, `Esc` exit playtest, `V/B/E` for Select/Paint/Erase
- Upgraded playtest controls from UI-only to backend runtime state:
  - `EditorRuntime` now owns `PlaytestState` (active/paused/speed/frame)
  - service/invoke/CLI commands added: enter, exit, toggle pause, step frame, set speed
  - editor state payload now includes playtest state for frontend sync
  - frontend `project-api` and `app-state` now route playtest actions through invoke commands
- Added playtest diagnostics overlay scaffolding in shell:
  - overlay toggles for Grid / Collision / IDs in view controls
  - playtest trace toggle in playtest overlay controls
  - canvas now supports grid visibility toggle + entity ID chips + collision-box visualization
- Added playtest tick loop adapter wiring:
  - backend runtime exposes `playtest_tick(delta_ms)` fixed-step advancement path
  - service/invoke/CLI command surface now includes playtest tick endpoint
  - frontend now drives playtest ticking via `requestAnimationFrame` while active and unpaused
- Added first-pass playtest viewport output binding:
  - canvas surface now mounts a profile-sized (160x144) playtest viewport
  - while playtesting, edit layers are hidden and viewport renders tiles/entities per frame
  - diagnostics toggles (grid/ids/collision) now affect viewport rendering directly
- Bound trace toggle to structured playtest event stream scaffold:
  - backend runtime now owns trace enable/disable state and ring-buffered structured trace events
  - new commands available via service/invoke/CLI (`playtest_set_trace`) and included in editor state snapshots
  - frontend trace toggle now controls backend capture and log dock shows recent structured events
- Added playtest frame diagnostics panel:
  - runtime now tracks last tick delta (`ms`) and effective sim steps per tick
  - editor state includes playtest tick diagnostics for frontend display
  - playtest overlay shows frame, tick delta, and steps live
- Added first-pass runtime watch panel data:
  - backend now exposes selected-entity watch data and core boolean watch flags in editor snapshots
  - frontend right panel now renders selected entity runtime summary + core watch flags list
  - watch flags currently include starter playtest state markers (start/key/quest progression)
- Added breakpoint-on-event scaffold wiring:
  - backend runtime now tracks breakpoint kinds (`playtest_tick`, `item_pickup`, `quest_state`) and pauses on hit
  - service/invoke/CLI surface now supports `playtest_set_breakpoints` and returns last breakpoint hit metadata
  - frontend playtest panel now includes breakpoint toggles and breakpoint hit status output
- Added watch panel grouping/filters scaffold:
  - backend runtime now exposes grouped watch buckets for flags, variables, and inventory
  - frontend watch panel now supports filter chips (All/Flags/Vars/Inventory)
  - fallback web path mirrors grouped watch buckets so behavior matches without backend
- Added automated frontend smoke tests (lightweight):
  - introduced Node built-in test runner suites for `app-state` workflows and `project-api` fallback contract checks
  - test coverage now validates map operations, tile editing, playtest lifecycle, breakpoint pauses, and watch bucket payload shape
  - wired `apps/desktop` `npm test` / `npm run test:ui` scripts for quick regression checks
- Added testing documentation baseline:
  - created `docs/testing/Test Strategy.md` with layered test model, required commands, and Playwright upgrade gate criteria
  - created `docs/testing/Frontend Smoke Coverage.md` with explicit scenario-to-test mapping and current gap tracking
- Added living testing operations plan:
  - created `docs/testing/Testing Plan (Living).md` for sprint-by-sprint test planning, risk tracking, and v1 exit criteria
- Added trace dock breakpoint reason chip interactions:
  - trace dock now includes filter chips (`All`, `Breakpoints`, `Ticks`, `Item`, `Quest`)
  - trace event kind chips are clickable to jump/filter by related event kind
  - trace list supports no-match empty state messaging for active filters
- Added QA execution checklist:
  - created `docs/testing/QA Checklist.md` for fast pre-merge/pre-sprint-close quality checks
- Added documentation operations artifacts:
  - created `docs/CHANGELOG.md`, `docs/KNOWN_ISSUES.md`, and `docs/commands/Command Surface.md`
  - created `docs/testing/Flaky Test Log.md` to track future E2E instability if/when it appears
- Added release/automation planning artifacts:
  - added CI workflow `.github/workflows/ci.yml` to run rust checks/tests + frontend smoke/syntax checks
  - created `docs/RELEASE_CHECKLIST.md` with go/no-go quality gates
  - created `docs/testing/Playwright Bootstrap Plan.md` for gate-based browser E2E rollout
- Added Playwright Phase 0 scaffold:
  - added `@playwright/test` dependency and e2e scripts in `apps/desktop/package.json`
  - added `apps/desktop/playwright.config.mjs` and local static runner `apps/desktop/scripts/static-server.mjs`
  - added baseline browser specs in `apps/desktop/tests-e2e/smoke.spec.mjs`
- Expanded Playwright browser coverage:
  - added map move-command E2E assertion (coordinate update)
  - added keyboard shortcut E2E assertion path (`B/E/V`, `F5`, `Esc`)
- Validated browser E2E runtime path:
  - installed local Playwright Chromium browser bundle
  - `npm run test:e2e` now passes with 6/6 scenarios
- Added drag interaction browser E2E coverage:
  - fixed hidden overlay interception with `[hidden] { display: none !important; }` in UI styles
  - added real entity drag flow test and validated passing Playwright run (`8/8`)
- Added viewport visual assertion baseline:
  - created `docs/testing/Viewport Visual Assertion Strategy.md`
  - added Playwright canvas pixel assertion for playtest viewport tile rendering
- Promoted Playwright E2E into CI:
  - CI workflow now installs Playwright Chromium and runs `npm run test:e2e`
  - release/testing docs updated so browser E2E is part of required verification
- Registered `invoke_command` in real Tauri runtime entrypoint path:
  - added dual-mode desktop entrypoint (`CLI` or `Tauri runtime`) in `apps/desktop/src-tauri/src/main.rs`
  - added Tauri runtime build/config scaffolding (`build.rs`, `tauri.conf.json`, optional deps/features)
  - preserved existing CLI command behavior and shared gateway path
  - validated `cargo check -p gcs-desktop --features tauri-runtime` compile path
- Added repo/tooling hardening from architecture review:
  - added root `.gitignore` and `LICENSE`
  - added frontend ESLint/Prettier config + scripts and CI enforcement
  - added `docs/frontend/Type Safety Plan.md` (JSDoc-first, selective TS migration plan)
- Added per-entity watch bucket expansion:
  - runtime now emits selected-entity watch buckets (`watch_selected_flags`, `watch_selected_variables`, `watch_selected_inventory`)
  - frontend watch panel now shows selected and global watch buckets under filter scopes
  - smoke and backend tests updated for selected watch bucket coverage
- Added UI filter helper extraction + smoke coverage:
  - added `apps/desktop/src/ui-debug-helpers.js` for trace and watch filter logic used by UI shell
  - added `apps/desktop/tests/ui-debug-helpers.test.mjs` for deterministic filter behavior coverage
- Added tooling planning artifact:
  - created `docs/tooling/Tool Capability Matrix.md` as running capability/quality/future-proofing tracker
  - seeded with cross-tool UX accelerators, Narrative/Quest scope, and extension strategy notes
- Added playtest debugger planning updates:
  - `Design Doc Final v1.1.txt` now defines Playtest Debugger scope (breakpoints, step controls, watch panel, state diff, trace stream)
  - Tool matrix now includes dedicated Playtest Debugger capability section and related future ideas
- Added lightweight-first planning updates:
  - design doc now includes built-in help/documentation, machine-local performance settings, and media ingest scope (GIF v1, heavier video/AI paths in v1+)
  - tool matrix now includes Help & Docs and Performance/Hardware settings sections plus lightweight implementation notes
- Verification complete: `cargo fmt`, `cargo test -p project-core`, `cargo check`.
- Verification complete: `cargo fmt`, `cargo test`, `cargo check`.
- Upgraded Playwright viewport assertion from single-point pixel check to multi-point scene signature sampling (background/tile/entity) and validated `npm run test:e2e` (`8/8`).
- Added browser E2E multi-tab/session isolation coverage and validated Playwright suite now passes with the new scenario included.
- Added first-pass preview/export parity harness:
  - shared viewport signature model (`apps/desktop/src/viewport-signature.js`)
  - golden scene fixtures (`apps/desktop/tests/fixtures/viewport-golden-scenes.json`)
  - parity test (`apps/desktop/tests/viewport-parity.test.mjs`)
  - Playwright viewport assertion now checks exact expected signature generated from the shared model
- Applied manual-QA-driven usability fixes:
  - responsive shell/layout tuning for narrower browser windows
  - playtest viewport zoom presets (`Fit`, `2x`, `3x`, `4x`) while preserving 160x144 internal render resolution
  - tile brush sweeps now commit as one batch command for single-step undo
  - playtest loop startup adjusted to reduce perceived first-frame delay
- Added desktop-runtime contract coverage at frontend API boundary:
  - `project-api` tests now validate `window.__TAURI__` -> `invoke_command` payload path
  - backend errors in Tauri path are surfaced (no silent fallback)
- Added CI Playwright stability instrumentation:
  - dedicated CI e2e command emits JSON report (`npm run test:e2e:ci`)
  - workflow now uploads Playwright artifacts (`test-results` / `playwright-report`) for run-by-run trend tracking
- Added browser-driven desktop runtime variant E2E:
  - new Playwright spec injects `window.__TAURI__` and validates UI flow executes through `invoke_command`
  - verifies desktop invoke path is exercised from real browser interactions, not only Node-level contract tests
- Added first pass export artifact parity drift checks:
  - new export artifact model (`apps/desktop/src/export-artifact.js`)
  - new file-based parity test (`apps/desktop/tests/export-artifact-parity.test.mjs`)
  - golden scene signatures now validated through persisted export artifacts, not only in-memory compare
- Added pixel-exact export preview artifact parity checks:
  - new export preview runtime artifact page (`apps/desktop/src/export-preview.html`)
  - runtime fixture renderer (`apps/desktop/src/export-preview-runtime.js`)
  - Playwright parity test (`apps/desktop/tests-e2e/export-parity.spec.mjs`) compares full RGBA buffers
- Promoted export parity coverage to packaged artifact path:
  - new builder script (`apps/desktop/scripts/build-export-artifacts.mjs`) emits `apps/desktop/export-artifacts/html5-preview/*`
  - static server now serves `/export-artifacts/*` for browser E2E parity runs
  - e2e scripts now build export artifacts before Playwright execution
- Added native export-core HTML5 preview packaging path:
  - `crates/export-core` now builds preview artifact bundles (`index.html`, `runtime.js`, `scenes.json`)
  - desktop invoke command `export_preview_html5` and CLI `export-preview` now expose native export generation
  - added dispatch and crate test coverage for native export bundle generation
- Switched Playwright parity build path to native export-core output:
  - `apps/desktop` `build:export:preview` now runs `gcs-desktop export-preview ...`
  - CI `test:e2e:ci` now validates packaged artifacts produced by native Rust export path
  - JS artifact builder retained as fallback (`build:export:preview:js`)
- Expanded native export parity scene coverage:
  - export bundle scene set now includes multi-tile/multi-entity and edge-clamp scenarios
  - browser parity test now reads `scenes.json` directly from packaged artifact output
  - parity assertions now track native scene-set growth without test fixture drift
- Added profile-aware native export artifact contract:
  - export-core now supports `game_boy` / `nes` / `snes` profile options
  - native bundle now emits `metadata.json` with `profile`, `mode`, and `scene_count`
  - browser parity tests now validate artifact metadata contract along with pixel parity
- Added export bundle manifest contract:
  - native export now emits `bundle.json` with entrypoint/runtime/scenes/metadata references
  - browser parity tests validate bundle manifest contract across profile variants
- Added Playwright stability metrics automation:
  - new metrics parser script (`apps/desktop/scripts/playwright-metrics.mjs`)
  - CI now emits daily summary markdown from `playwright-report.json`
  - flaky-log daily summary row can be auto-updated from artifact metrics
- Added native Tauri-runtime CI verification path:
  - new CI job `verify-tauri-runtime` on Windows
  - validates `tauri-runtime` feature compile (`cargo check`)
  - runs invoke smoke command under tauri-runtime build and asserts expected payload shape
- Expanded native runtime CI smoke for export profiles:
  - CI now generates NES and SNES export bundles via native binary
  - validates profile-specific `metadata.json` output for both profile variants
- Added profile-specific pixel parity automation:
  - new npm profile parity commands (`test:e2e:export:nes`, `test:e2e:export:snes`)
  - CI now executes NES/SNES browser parity checks against native export artifacts
  - export parity now validates profile viewport contract as part of artifact checks
- Added export assets-manifest contract coverage:
  - native export now emits `assets/manifest.json` and references it from `bundle.json`
  - JS fallback export artifact builder now writes the same manifest contract
  - browser parity test now validates assets-manifest schema/profile/count contract
- Hardened export invoke response contract:
  - `ExportBundleReport` now includes `asset_count` for explicit artifact accounting
  - desktop invoke export dispatch test now asserts `asset_count` and `assets/manifest.json` presence
  - command surface docs updated with assets-manifest output and report count fields
- Added scripting architecture decision and planning alignment:
  - created `docs/ADR-005-scripting-engine.md` (hybrid Event Graph + Rhai strategy)
  - updated Sprint 3/4 scope to include script IR/validation foundation and Event Graph MVP
  - updated architecture/tooling docs with scripting, auto-tiling, and adaptive-audio capability planning
- Added comparative tooling research artifact:
  - created `docs/tooling/Competitive Research Notes.md` with references and differentiated product bets
- Started scripting foundation implementation:
  - added new workspace crate `crates/script-core` with `ScriptGraph` IR + validation report scaffold
  - added baseline unit tests for valid graph and missing-node error reporting
- Added explicit 2D->3D evolution planning artifact:
  - created `docs/roadmap/2D-to-3D Evolution Plan.md` with phased expansion and boundary rules
  - architecture docs now reference future-proofing guardrails while keeping v1 scope 2D-first
- Wired first scripting runtime command through app/backend:
  - added invoke command `script_validate` in `apps/desktop/src-tauri/src/invoke_api.rs`
  - added frontend API `validateScriptGraph(...)` with deterministic fallback behavior
  - added backend + frontend tests for missing-node validation reporting
- Added first scripting UX surface in desktop shell:
  - new Script Lab panel with graph JSON input + Validate action
  - app-state now stores script validation results and emits `script:validated` events
  - Issues Drawer now surfaces script parse/validation errors from Script Lab
- Added browser E2E coverage for Script Lab validation UX:
  - `tests-e2e/smoke.spec.mjs` now asserts invalid graph results appear in summary and Issues Drawer
  - manual QA checklist now includes Script Lab validation scenario and expected outputs
- Added Script Lab template usability flow:
  - built-in templates (`Starter Event`, `Quest Trigger`, `Item Pickup`) with one-click apply + validate
  - custom template save/delete via local storage for reusable script graph snippets
  - browser E2E now covers template apply/save behavior
- Added Script Lab one-click issue autofix path:
  - Issues Drawer now renders `Auto-fix` actions for `missing_source_node` and `missing_target_node`
  - autofix patches graph JSON, re-validates, and clears resolved script issues
  - browser E2E currently verifies auto-fix CTA visibility; click-path hardening is in follow-up
- Incorporated external full-project review actions:
  - added `docs/reviews/Claude Review Action Plan.md` with accepted findings and sprint ownership
  - elevated hardening priorities for script cycle detection, frontend error containment, and runtime test depth
  - added first-5-minutes product UX priorities (starter templates + guided playable path) to planning docs
- Completed hardening item: script graph cycle detection and validation hygiene:
  - `script-core` now detects cycles (`cycle_detected`) via topological validation
  - added validation errors for `empty_node_id`, `duplicate_node_id`, and `duplicate_edge`
  - added unit tests covering cycle and duplicate/empty graph cases
- Completed frontend resilience hardening slice:
  - `event-bus` now isolates handler exceptions so sibling listeners still receive events
  - `app-state` async actions now run through guarded error handling and emit `app:error`
  - `project-api` now uses safe JSON parsing for desktop invoke string responses
  - added frontend tests for error-path behavior (async failure capture, malformed JSON handling, listener isolation)
- Completed S3-G2: Persistent state scope (global vs scene-local):
  - `script-core`: added `StateScope` enum (`Global` default, `Scene`) with `#[serde(default)]` backward compat
  - `SetFlag`, `SetVariable`, `CheckFlag` script behaviors carry scope field; existing graphs default to global
  - `process_event()` now dual-threaded: takes separate `global_state` and `scene_state` mutable refs
  - `editor_runtime`: added `scene_state` and `scene_states: HashMap<SceneId, ScriptState>`
  - scene-local state saves on FadeOut completion and restores on scene entry (or empty default)
  - both global and scene states clear on `enter_playtest()` / `exit_playtest()`
  - `editor_service` snapshot now includes `watch_scene_flags` and `watch_scene_variables`
  - frontend: `watchSceneFlags`, `watchSceneVariables` mapped in `app-state`, typed in `types.js`
  - 4 new Rust scope tests: write-to-scene, read-from-scene, global independence — 214 Rust tests green
- Completed S4-SEC1: Security & Stability Hardening (2026-02-18):
  - Fixed High: `open_project` state bleed — corrupt/unreadable `editor-state.json` now explicitly resets runtime via `load_authored_state(name, [], [])` instead of silently retaining prior session entities/tiles
  - Fixed Medium: export path traversal — removed unconstrained `resolve_source_path`; `collect_authored_asset_hints` now takes `project_dir: Option<&Path>` and uses `resolve_project_asset_path` (project-scoped) for all authored asset path resolution
  - Fixed Medium: `innerHTML` XSS — all 4 dynamic `innerHTML` assignments in `ui-workspace-bootstrap.js` (audio bindings + scene list) replaced with `createElement`/`textContent`/`dataset` DOM construction; 0 lint warnings remaining
  - Fixed Medium: deterministic E2E failure — `watch filter chips swap sections` test reordered so entity creation fires before Script tab switch, resolving `entity:created` inspector tab conflict
  - Updated 3 Rust tests to place authored assets inside `project_dir` (matching new confinement requirement)
  - Validated: 0 typecheck errors, 0 lint warnings, 85 frontend tests green, 214 Rust tests green, 44/44 E2E smoke tests pass
- Completed S4-UX1: UX Polish Pass:
  - toolbar and command buttons now have `title` attributes with keyboard shortcut hints (V/B/E/A/Del/Ctrl+Z/Ctrl+Y/F5)
  - added `A` key binding for Add Entity (was missing from keyboard shortcuts)
  - canvas empty state upgraded: static text replaced with "Add Entity (A)" and "Paint Tile (B)" CTA buttons
    - auto-hides when map has content or during playtest; buttons have `pointer-events: all` within passive overlay
  - added `ui-toast.js`: lightweight toast/snackbar system with `showToast(message, type, duration)` API
    - types: info / success / warning / error; CSS enter/exit transitions; no DOM = no-op guard for tests
    - integrated into: project save, playtest start, export success, and app:error events
  - entity rename-on-create: after Add Entity, inspector tab activates and name `<input>` auto-focuses for rename
    - inspector name input now shows **selected entity's name** (fixed pre-existing bug: was showing projectName)
    - new `renameEntity(id, name)` in `app-state`, `renameMapEntity(id, name)` in `project-api`, `map_rename` backend command
    - backend: `rename_map_entity()` in `editor_runtime` mutates entity name via `entities_mut()`
  - drag-and-drop PNG import: window-level `dragover`/`drop` handler accepts PNG files
    - `FileReader` reads file as data URL → `state.importSprite()` → `import_sprite` Tauri command
    - backend: `sprite_registry: HashMap<String, String>` on `EditorRuntime`; serialized in every snapshot as `sprite_registry`
    - `importSprite()` in `project-api` with fallback; `spriteRegistry` in `app-state` and `types.js`
  - ESLint globals updated: `requestAnimationFrame`, `FileReader`, `Event`, `PointerEvent`, `CustomEvent`
  - added 3 new app-state tests: `renameEntity` name update, blank-name guard, `importSprite` registry storage
  - validated: 0 typecheck errors, 0 lint errors, 85 frontend tests green, 214 Rust tests green
