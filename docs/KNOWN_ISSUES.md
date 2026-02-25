# Known Issues

Last updated: 2026-02-19

## Purpose
- Track active, user-impacting risks that still need mitigation or closure.
- Keep this list focused on current problems; move resolved items to `docs/CHANGELOG.md` and the `Resolved Recently` section.

## How To Use This Doc
1. Current contains open items that can affect development or user workflows.
2. Resolved Recently captures recently closed items for short-term visibility.
3. `Review Follow-ups` contains prioritized external-audit actions that should map to sprint tasks.

## Current
- `P1` Prefab system is currently runtime-session scoped:
  - prefab CRUD + stamping commands are now implemented for desktop invoke and web fallback API paths.
  - prefab library now persists/restores in `editor-state.json` during save/open.
  - authored export now includes flattened per-entity component bags (`snapshot.entity_components`), including prefab-derived defaults.
  - remaining gap: export runtime currently treats component payload as metadata only (no behavior-level runtime application yet).

- `P1` Asset pipeline is still logical-manifest only:
  - invoke authored export now supports minimal sprite ingest/copy via:
    - explicit `assetPath` hints in `editorState.entities[]` / `editorState.tiles[]`
    - convention-based discovery from `projectDir/assets/entities`, `projectDir/assets/tiles`, and `projectDir/assets/sprites`
  - authored export now supports minimal audio ingest/copy via:
    - explicit `assetPath` hints in `editorState.audio[]` / `editorState.audioClips[]`
    - `projectDir/assets/manifest.json` `audio` map entries and `assets[]` entries with `"kind": "audio"` and `audio_*` IDs
    - audio manifest files are resolved only for authored audio IDs referenced in `editorState.audio*` (prevents manifest-wide over-packaging).
    - frontend export API now forwards optional `editorState` payload hints directly to invoke export.
  - when authored/project assets are missing, export now falls back to bundled starter assets first (`assets/starter/*.svg`), then generated placeholders (`assets/generated/*.svg`) to keep exports deterministic.
  - exported runtime now exposes audio bridge controls and gameplay trigger hooks (`playAudioById` / `stopAudioById` / `triggerGameplayEventAudio`) with authored metadata bindings (`metadata.audio_bindings`), but full editor-side Event Graph wiring is still pending.
  - full project-asset-manager integration is still pending (manifest-driven dependency graph with UI tooling and robust path validation policy are not implemented yet).
  - Script Lab now has visual Audio Routing UI (event picker + clip ID input + binding list) in addition to textarea-first workflow. Manual bindings merge with script-graph-inferred bindings at export time.

## Resolved Recently
- Closed playtest stale-response race in app-state (2026-02-19):
  - replaced `exitRequested`-style flow with a phase + session-id stale-response model.
  - `exitPlaytest` now enforces a synchronous `active=false` barrier before awaiting backend completion.

- Fixed S4-SEC1 security issues (2026-02-18):
  - `open_project` state bleed: corrupt `editor-state.json` now resets runtime cleanly instead of retaining prior session state.
  - Export path traversal: authored asset paths are now confined to `project_dir`; external paths are rejected.
  - `innerHTML` XSS: audio binding and scene list rendering replaced with safe DOM construction.
  - Deterministic E2E test failure: `watch filter chips swap sections` test reordered to avoid `entity:created` tab conflict.
- Fixed inspector name input showing `projectName` instead of selected entity name (S4-UX1):
  - `apps/desktop/src/ui-shell-render.js` now shows the selected entity's name in the inspector input, disabled when no single entity is selected.
- Shipped launch-dashboard recent-project baseline hardening:
  - dashboard now persists and renders recent projects from `gcs.dashboard.recent_projects.v1` and supports opening a specific recent item.
  - recent list is recency-sorted by `updatedAt` and capped at 8 entries for predictable first-render behavior.
  - smoke selectors now target `#dashboard-action-open` to avoid ambiguity with recent-item "Open ..." labels.
  - smoke coverage now includes:
    - `dashboard recent projects list can reopen a recent project`
    - `dashboard recent projects list is recency-sorted and capped`
- Closed `RF-2026-02-16-02` core scope (theme/density regression breadth):
  - visual snapshots now cover:
    - default shell baseline
    - light+compact surfaces
    - high-contrast+compact issue semantics
    - responsive mid-width and narrow-width readability baselines
  - reference: `apps/desktop/tests-e2e/visual-shell.spec.mjs` and snapshot set under `apps/desktop/tests-e2e/visual-shell.spec.mjs-snapshots/`.
- Shipped runtime theme/density preference controls (Phase C core wiring):
  - `Theme` + `Density` topbar controls now persist to local storage and apply via `body` data attributes in:
    - `apps/desktop/src/ui-preferences.js`
    - `apps/desktop/src/ui-workspace-bootstrap.js`
    - `apps/desktop/src/ui-shell-elements.js`
    - `apps/desktop/src/ui-shell-bootstrap-elements.js`
    - `apps/desktop/src/styles.css`
  - remaining follow-up is visual-regression breadth across theme/density combinations.
- Added explicit export-lane UX copy so editor users understand authored vs canonical parity lanes:
  - workspace walkthrough panel now includes lane guidance copy in `apps/desktop/src/index.html` (`#export-lane-hint`)
  - export completion logs now include lane labels in `apps/desktop/src/ui-shell-events.js` (`desktop authored lane` / `web fallback lane`)
- Expanded Draw Studio starter quick-preset surface to gameplay silhouettes:
  - added quick silhouette buttons (`Tree`, `Bush`, `Rock`) while keeping legacy layout presets (`Cluster`, `Line`, `Ring`) for compatibility
  - quick silhouette buttons are wired through:
    - `apps/desktop/src/ui-draw-assist-controls.js`
    - `apps/desktop/src/ui-shell-elements.js`
    - `apps/desktop/src/ui-shell-bootstrap-elements.js`
    - `apps/desktop/src/ui-workspace-bootstrap.js`
  - Draw Seed default preset now resolves to `tree` in `apps/desktop/src/ui-draw-seed.js`
- Promoted perf budget gate from warning mode to strict CI enforcement:
  - `apps/desktop/scripts/playwright-metrics.mjs` now enforces calibrated launch/workspace/playtest budgets from telemetry attachments
  - CI now runs perf metrics summary with `GCS_PERF_BUDGET_STRICT=1` and calibrated thresholds in `.github/workflows/ci.yml`
  - `docs/testing/Flaky Test Log.md` daily summary now records playtest-first-frame/update budgets alongside existing metrics
- Expanded native export parity fixture breadth:
  - `crates/export-core/src/lib.rs` now emits additional profile-aware preview scenes with denser tile maps and dynamic profile-bound corner layouts
  - browser export parity remains pixel-exact against packaged native artifacts with increased scene count
- Closed remaining parity fixture edge-coverage gap:
  - `crates/export-core/src/lib.rs` now uses profile-dynamic edge/corner tile and entity coordinates (no Game Boy-specific hard-coded edge positions)
  - added `profile_bounds_stress_layout` preview scene for profile-bound edge/corner and overflow clamp behavior
  - validated parity across all supported export profiles:
    - `npm run test:e2e:export:gb`
    - `npm run test:e2e:export:nes`
    - `npm run test:e2e:export:snes`
- Expanded playtest responsiveness telemetry probes and smoke coverage:
  - `window.__gcsPerfMetrics` now carries playtest first-frame and last-update delay deltas (`playtestFirstFrameDeltaMs`, `playtestLastMetricUpdateDeltaMs`)
  - playtest overlay now surfaces these values in `#playtest-metric-feedback`
  - Playwright smoke suite now asserts the telemetry probe contract in active playtest (`tests-e2e/smoke.spec.mjs`)
- Expanded Issues Drawer recovery guidance for common runtime failures:
  - added `retry_last_action` user flows for retryable runtime actions in `apps/desktop/src/ui-issues-recovery.js`
  - retained explicit fallback recovery (`reload_editor`) for non-retryable/unsafe actions
  - added unit coverage in `apps/desktop/tests/ui-issues-recovery.test.mjs` for action modeling and retry dispatch behavior
- Expanded direct playtest runtime coverage and behavior consistency:
  - added tests for breakpoint priority, breakpoint-hit reset on reconfiguration, and paused/unpaused accumulator timing in `apps/desktop/src-tauri/src/editor_runtime.rs`
  - aligned runtime breakpoint behavior so tick breakpoints no longer overwrite higher-priority item/quest hits in the same tick
  - cleared stale `last_breakpoint_hit` when breakpoint configuration changes
- Removed export-preview runtime/index duplication across build lanes by introducing canonical shared templates in `crates/export-core/templates` consumed by both Rust `export-core` and `apps/desktop/scripts/build-export-artifacts.mjs`.
- Added explicit schema upper-bound validation in `ProjectManifest::validate()` so unsupported future manifest versions fail fast with upgrade guidance.
- Capped fallback browser-mode undo history in `project-api` and added regression coverage for bounded FIFO behavior.
- Removed skipped browser E2E drag test debt:
  - deleted the legacy `fixme` manual mouse drag case from `apps/desktop/tests-e2e/smoke.spec.mjs`
  - retained deterministic pointer-event drag regression coverage for CI stability.
- Browser shell now adapts better to smaller window sizes.
- `script-core` validation now enforces cycle detection and catches cyclic graphs.
- Playtest viewport now supports explicit zoom presets for readability while preserving internal profile resolution.
- Paint/erase brush sweeps now undo in a single step instead of one tile at a time.
- Frontend fallback-state leakage risk addressed with test reset hook (`__resetFallbackEditorForTests`).
- Added `.gitignore` to prevent build/dependency artifact pollution.
- Added MIT `LICENSE` file to align declared crate licensing.
- Added ESLint/Prettier baseline tooling for frontend maintainability.
- Fixed hidden playtest overlay interception (`[hidden]` style) that caused pointer-event conflicts in browser E2E.
- Promoted Playwright E2E into CI verification flow.
- Registered Tauri runtime invoke entrypoint path (`invoke_command`) with feature-gated desktop runtime mode.
- Verified `cargo check -p gcs-desktop --features tauri-runtime` succeeds after environment/icon fixes.
- Added pixel-exact Playwright parity test for export preview runtime artifact scenes.
- Added packaged export artifact build-and-serve path for browser E2E parity checks.
- Added native Rust export-core HTML5 preview artifact builder and desktop invoke/CLI command path.
- Added retry-safe editor module lazy-load behavior after transient dynamic-import failures.
- Hardened layout preference reads for restricted-storage contexts (safe fallback on read errors).
- Replaced hard-coded map tile/grid visual sizing with shared `--tile-size` variable wiring.

## Review Follow-ups (2026-02-16)
- `P1` Gameplay systems integration gap:
  - Phase 1 (S2-G0 through S2-G3) **COMPLETE**: tile properties, movement (3 modes), input mapping, velocity/physics, and collision response all wired into `tick_playtest()`. Collision (entity-vs-entity, entity-vs-tile AABB) verified in unit tests. 180+ Rust tests green.
  - Phase 2 (camera, persistent state, prefabs, screen transitions) is next execution priority in Sprint 3.
  - Remaining planned systems: runtime spawning, animation state machine, HUD layer, gizmos, live play editing, timeline foundation — see roadmap.
  - full roadmap: `docs/roadmap/Gameplay Systems Integration Roadmap.md`.
  - track in review ledger: `RF-2026-02-16-12`.
- `P0` Authored export lane parity gap — **CLOSED**:
  - `save_project` now persists editor state (entities, tiles, project name) to `editor-state.json`.
  - `open_project` restores persisted editor state into runtime with clean undo history.
  - export pipeline uses current authored state by default (already worked via `get_editor_state()` fallback; now state survives save/open cycles).
  - track in review ledger: `RF-2026-02-16-04`.
- `P1` Script runtime bridge landed (core scope closed):
  - `script-core` has execution runtime (`ScriptRuntime`, `ScriptState`, `ScriptEffect`) with deterministic event-driven graph traversal.
  - `editor_runtime` integrates `ScriptRuntime` for live playtest execution.
  - invoke API commands (`script_load_graph`, `script_unload_graph`, `script_fire_event`) and frontend bridge (`loadScriptGraph`, `unloadScriptGraph`, `fireScriptEvent`) are shipped.
  - Script Lab now has visual Audio Routing UI (event picker, clip ID input, binding list) for guided audio routing beyond textarea-first surface. Graph authoring UI is still textarea-based.
  - track in review ledger: `RF-2026-02-16-05`.
- `P1` Scene/level system landed (core scope closed):
  - `engine-core::scene` provides `Scene`, `SceneCollection`, `SpawnPoint` types with full CRUD and spawn resolution.
  - `editor_runtime` integrates scene collection with ChangeScene script-effect routing and playtest scene lifecycle.
  - invoke API commands (`scene_add`, `scene_remove`, `scene_set_active`, `scene_list`, `scene_add_spawn_point`) and frontend bridge are shipped.
  - scene-switching UI shipped: left panel scene list with add/remove/switch. Remaining: per-scene entity/tile editing context, scene-aware export pipeline.
  - track in review ledger: `RF-2026-02-16-10`.
- `P1` Collision + components baseline landed (core scope closed):
  - `engine-core::components` provides `CollisionBox`, `SpriteComponent`, `EntityComponents`, `ComponentStore` for entity component bags.
  - `engine-core::collision` provides AABB-based collision detection: entity-vs-entity, entity-vs-tile, and movement-blocking prediction.
  - non-solid entities support trigger-zone pattern (detected in overlap pairs but don't block movement).
  - collision is now wired into `editor_runtime::tick_playtest()` for movement blocking and physics collision response (Phase 1 complete).
  - remaining follow-up: collision diagnostics overlay in frontend, component editing UI.
  - track in review ledger: `RF-2026-02-16-11`.
- `P1` Launch dashboard scaling and returning-user UX:
  - recent-project baseline (sort/cap/open) is shipped; remaining scope is large-list virtualization/windowing policy and stress validation at higher project counts.
  - track in review ledger: `RF-2026-02-16-06`.
- `P1` Visual consistency lock:
  - finalize one icon family and verify profile accents never conflict with semantic warning/error readability.
  - execution path is now centralized in `docs/frontend/UI UX Execution Plan.md`.
  - track in review ledger: `RF-2026-02-16-07`.
- `P1` Theme/density regression completion:
  - closed for current sprint scope; keep visual snapshot matrix expansion as normal maintenance when new UI surfaces are added.
- `P1` Visual-direction reconciliation:
  - align original design-doc visual language with active visual system tokens to avoid future implementation drift.
  - track in review ledger: `RF-2026-02-16-09`.
