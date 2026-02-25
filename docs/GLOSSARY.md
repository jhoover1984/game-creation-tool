# Glossary

Last updated: 2026-02-18

Purpose: Provide canonical terminology used across architecture, UX, and workflow docs.

## Key Terms
- North Star flow:
  - The primary outcome for v1-core: a beginner can create and export a playable HTML5 game quickly.
- Preview = Export:
  - Runtime behavior in editor playtest should match exported game behavior.
- Command bus:
  - The mutation system that applies edits as commands and enables undo/redo.
- Context-scoped undo:
  - Undo history is separated by workspace context (Map, Draw, Story, Animation, Audio).
- Editor runtime:
  - Backend module that owns authoritative map/playtest/watch/trace state.
- Editor session:
  - Backend module that tracks active context and selection history.
- Snapshot:
  - Full editor state payload returned from backend to frontend after commands.
- Fallback mode:
  - Browser-only behavior used when Tauri backend is unavailable.
- Atomic save:
  - Save strategy that writes temp data and replaces destination safely.
- Migration:
  - Schema upgrade step that moves older project data to current format.
- Watch panel:
  - Debug UI section showing key runtime flags, variables, and inventory-like values.
- Trace stream:
  - Ordered runtime event log used during playtest debugging.
- Breakpoint-on-event:
  - Playtest pause triggered by specific runtime events (tick/item/quest).
- Golden fixture:
  - Reference project/scene used to detect behavior or output drift.
- Rhai:
  - The scripting language used for game logic. Pure Rust, WASM-compatible, sandboxed by default. See ADR-005.
- Script Graph:
  - The node-based representation of game logic (Event → Condition → Action chains). Authored in Script Lab, compiled by `script-core`.
- Event Graph:
  - The visual front-end layer for the Script Graph; beginner-facing authoring surface. Not yet fully implemented (Sprint 4+ target).
- Profile:
  - A hardware-constraint preset (`GameBoy`, `NES`, `SNES`) that governs canvas size, color palette, tile size, and asset limits for a project.
- Authored Export:
  - Export lane that packages the live editor state (user-created entities, tiles, scripts, audio) as opposed to the canonical fixture lane used for regression testing.
- StateScope:
  - Enum (`Global`, `Scene`) controlling whether a script flag/variable persists across scene transitions (`Global`) or resets on scene change (`Scene`). Added in S3-G2.
- Sprite registry:
  - In-session `HashMap<String, String>` on `EditorRuntime` that stores imported PNG sprites as data URLs. Not persisted to disk; cleared on project open.
- Toast / snackbar:
  - Temporary status notification shown bottom-right of the editor UI. Implemented in `apps/desktop/src/ui-toast.js` via `showToast(message, type, duration)`.
- Authored state:
  - The serialized editor session (entities, tiles, project name) stored in `editor-state.json` alongside `project.json`. Loaded on `open_project` and saved on `save_project`.

