# Legacy Audit Report (2026-02-20)

## Classification Summary

| Module | Classification | Rationale |
|--------|---------------|-----------|
| `project-core` | **PORT** | Clean, 11 tests, no crate deps, mission-critical load/save/migrate |
| `command-core` | **PORT** | Generic undo/redo pattern, 5 tests, zero deps beyond thiserror |
| `script-core` | **PORT** | Small, clean DAG validation + runtime state, deferred for v2 early phases |
| `engine-core` | **REFERENCE** | Core sim logic is solid BUT mixes editor + runtime concerns. Split needed |
| `export-core` | **REFERENCE -> PORT** | 13 tests, well-tested. Extract embedded templates, otherwise ~90% reusable |
| `gcs-wasm` | **REFERENCE -> PARTIAL PORT** | 12 tests, proven browser runtime. Tight coupling to v1 component model |
| `gcs-desktop` | **REFERENCE** | Monolithic service layer (3000+ 1500 LOC). Rewrite for v2 scene architecture |

## Modules to Port Next (Priority Order)

1. **project-core** -> into `v2/packages/core/simulation/src/project.rs` (partially done)
2. **command-core** -> into `v2/packages/core/simulation/src/commands.rs` (partially done)
3. **engine-core simulation subset** (physics, collision, movement, animation, camera) -> already seeded in v2 core crates
4. **export-core** -> defer to Phase 4

## Large File Cleanup Candidates

| File | ~Lines | Action |
|------|--------|--------|
| `editor_service.rs` | ~3000 | Split by domain: map ops, playtest, animation, scene |
| `editor_runtime.rs` | ~1500 | Split: playtest orchestrator, entity mgr, component mgr |
| `export-core/lib.rs` | ~911 | Split: asset discovery, HTML generation, scene building |

## Dead/Orphaned Artifacts

- `editor_session.rs` -- marked `#[allow(dead_code)]`, may be unused. Investigate.
- Root-level `ui-*.js` files are shims to `ui/` subdirectory (not dead, but redundant layer)
- No confirmed dead code elsewhere

## Frontend Classification

| Layer | Classification |
|-------|---------------|
| Core state (`app-state.js`) | REFERENCE -> REWRITE (single-map -> multi-scene) |
| API bridge (`project-api.js`) | PORT with contract updates |
| Canvas rendering | PORT |
| Viewport (zoom/pan) | PORT |
| Map UI (entity list, drawing) | REFERENCE -> REWRITE |
| Animation UI | REFERENCE |
| Playtest controls | PORT |
| Dialogs/UX (toast, prefs, cmd bar) | PORT |
| Tests (29 files) | PORT (update for v2 types) |

## Test Coverage (Legacy)

- **Rust**: ~60 test functions across all crates
- **JavaScript**: 29 test files, ~100+ test cases
- **Overall**: Good coverage, especially project-core and export-core

## Dependency Graph (Clean, No Cycles)

```
project-core     (standalone)
command-core     (standalone)
script-core      (standalone)
engine-core      -> command-core
export-core      (standalone)
gcs-wasm         -> engine-core, command-core, script-core
gcs-desktop      -> ALL
```

