# Architecture Overview

Last updated: 2026-02-17
Source of truth: `docs/Design Doc Final v1.1.txt`

## Purpose
- Explain how Game Creator Studio is wired today.
- Help contributors add features without breaking core invariants.
- Provide a short map before reading ADRs and deep docs.

## Product Targets (v1-core)
- Beginner-first game creation flow.
- North Star: create and export a playable HTML5 game in under 10 minutes.
- Non-negotiables:
  - Preview behavior must match export behavior.
  - Every edit is undoable.
  - Save/load is crash-safe and migration-safe.
  - Internal profile resolution stays authentic while viewport presentation can scale for readability.

## Long-Term Evolution Constraint
- v1 remains 2D-first, but shared boundaries should stay compatible with future renderer/runtime expansion.
- Reference: `docs/roadmap/2D-to-3D Evolution Plan.md`.

## Tech Stack (v1 Reality)
- **App shell**: Tauri 2.x (desktop); static site with WASM (browser, future)
- **Backend**: Rust (native via Tauri for desktop, compiled to WASM for browser)
- **Frontend**: JavaScript (ES2022 modules) with TypeScript type-checking via JSDoc — no bundler
- **Rendering**: Canvas 2D (sufficient for retro profiles; WebGL reserved for future unconstrained profile)
- **Scripting**: Rhai (Rust-native embedded scripting, sandboxed, WASM-compatible) — see ADR-005
- **ECS**: Custom lightweight component system in engine-core (hecs evaluated, not adopted)

## System Boundaries
- Frontend (`apps/desktop/src`):
  - JavaScript (ES2022 modules) with JSDoc type annotations verified by `tsc --noEmit`.
  - Renders UI and handles interaction.
  - Maintains local UI state shape in `app-state.js`.
  - Sends all authoritative mutations through backend commands.
  - Transport-agnostic: `project-api.js` abstracts Tauri invoke (desktop) vs WASM calls (browser).
- Desktop backend (`apps/desktop/src-tauri/src`):
  - Command dispatch, editor runtime/session, project service layer.
  - Owns authoritative editor state snapshot responses.
- Domain crates (`crates/*`):
  - `command-core`: command stack, undo/redo, context command bus.
  - `engine-core`: map editor command/state primitives, movement, physics, input, collision, components.
  - `project-core`: save/migration/health/recovery logic.
  - `export-core`: HTML5 preview/export artifact generation with profile support.
  - `script-core`: event-graph IR, validation, and runtime execution bridge (ScriptRuntime, ScriptState, ScriptEffect).

## End-to-End Command Flow
1. UI action in `ui-shell.js`.
2. State method in `app-state.js`.
3. API call in `project-api.js`.
4. Tauri bridge command `invoke_command` with JSON payload.
5. `tauri_bridge.rs` -> `command_gateway.rs` -> `invoke_api.rs`.
6. Service/runtime command executes (`editor_service.rs`, `editor_runtime.rs`).
7. Full editor snapshot returned to frontend.
8. UI re-renders from updated snapshot.

## State Ownership Rules
- Backend is authoritative for editor/project/playtest state.
- Frontend snapshot mirrors backend response for rendering.
- Web fallback model exists only when Tauri runtime is unavailable.
- Undo/redo history is owned by command stacks, not by UI components.
- Entry routing should remain explicit and lightweight (`launch_dashboard` -> `editor_workspace`) to avoid mounting heavy editor surfaces on first paint.

## Core Runtime Components
- `EditorRuntime`:
  - Holds map state, playtest state, trace data, watch buckets.
  - Applies map/tile/playtest commands.
- `EditorSession`:
  - Holds active context and context-scoped selection history.
- `ContextCommandBus`:
  - Enforces undo/redo by context (Map/Draw/Story/Animation/Audio).

## Data Safety Path
- Atomic save pattern in `project-core`:
  - write temp -> flush/sync -> rename.
- Backup rotation and recovery state scan are built-in.
- Schema migrations are deterministic and idempotent with rollback snapshots.

## Testing Layers
- Rust unit/integration tests: command correctness and project safety.
- Frontend Node smoke tests: state and API contract behavior.
- Playwright browser E2E: interaction and viewport behavior.
- CI gate runs lint/format/test/e2e for regression protection.

## How To Extend Safely
- Add command shape in `invoke_api.rs` first.
- Implement runtime/service behavior second.
- Add frontend API + app-state path next.
- Update UI shell bindings last.
- Add tests at each layer and update docs in the same change.
- For shared boundaries, avoid hardcoded 2D-only assumptions unless explicitly scoped to v1 tool surfaces.
- For dashboard-first work, keep route transitions and lazy-load boundaries deterministic (no side effects in render-only paths).

## Distribution Model
- **Desktop (primary)**: Tauri installer — native Rust backend, filesystem access, offline-first.
- **Browser (secondary, future)**: same Rust crates compiled to WASM, same JS frontend, no install required.
- Exported games are identical regardless of which version created them.
- Project files (.gcs) are compatible across both versions.

## Current Intentional Gaps
- Script runtime bridge is operational (ScriptRuntime, ScriptState, ScriptEffect, invoke commands, frontend bridge). Rhai host integration and Event Graph visual editor are staged per ADR-005 rollout plan.
- Inspector bridge binary path and high-frequency delta transport are staged; current snapshots are JSON-first (performant at target scale).
- Spatial indexing and high-scale performance optimizations are staged for later sprints.
- Browser (WASM) distribution target is architecturally prepared but not yet built.
- Additional UI decomposition and type-safety tightening continue incrementally as modules evolve.
