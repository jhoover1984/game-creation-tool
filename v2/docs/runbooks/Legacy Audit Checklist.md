# Legacy Audit Checklist

> Use this checklist to evaluate each legacy module/crate for v2 migration.

## Per-Module Assessment

For each legacy crate (`project-core`, `command-core`, `engine-core`,
`export-core`, `script-core`, `gcs-wasm`, `gcs-desktop`):

### 1. Classification
- [ ] **Port**: deterministic, well-tested, clean boundaries
- [ ] **Rewrite**: mixed concerns (UI/runtime/core entangled)
- [ ] **Defer**: high complexity, low immediate value

### 2. Audit Questions
- [ ] What does this module do? (one sentence)
- [ ] Does it have tests? How many pass?
- [ ] Does it depend on UI or runtime state?
- [ ] Does it have clean input/output boundaries?
- [ ] What contracts does it expose?
- [ ] Is the behavior documented?

### 3. If Porting
- [ ] Identify the exact functions/structs to port
- [ ] Write v2 contract types in `packages/contracts/`
- [ ] Write v2 tests BEFORE porting code
- [ ] Port code into appropriate v2 crate
- [ ] Verify tests pass
- [ ] Remove any legacy dependencies

### 4. If Rewriting
- [ ] Document the intended behavior (not the current implementation)
- [ ] Write v2 contract types
- [ ] Write v2 tests from the behavior spec
- [ ] Implement clean in v2 crate
- [ ] Compare outputs against legacy for regression

---

## Legacy Crate Status

| Crate | Classification | Status | Notes |
|-------|---------------|--------|-------|
| `project-core` | **PORT** | PASS Ported | -> `simulation/src/project.rs` (create/save/load) |
| `command-core` | **PORT** | PASS Ported | -> `simulation/src/commands.rs` (undo/redo stack) |
| `engine-core` | **REFERENCE** | PASS Subset ported | Collision, physics, movement split into v2 crates |
| `export-core` | **REFERENCE -> PORT** | Deferred | Phase 4: export pipeline |
| `script-core` | **PORT (deferred)** | Deferred | Phase 3+: Rhai integration (ADR-V2-003) |
| `gcs-wasm` | **REFERENCE -> PARTIAL PORT** | Deferred | Phase 4: WASM parity path |
| `gcs-desktop` | **REFERENCE** | Deferred | Phase 4: Tauri adapter |

## Frontend Assessment

| Module | Classification | Status | Notes |
|--------|---------------|--------|-------|
| `app-state.js` | **REWRITE** | PASS Replaced | -> `@gcs/runtime-web` ProjectStore (TS) |
| `project-api.js` | **PORT** | PASS Replaced | -> `@gcs/runtime-web` CommandBus (TS) |
| UI components | **REWRITE** | PASS MVP done | -> `@gcs/ui-editor` EditorApp + animation-studio |
| Canvas/viewport | **PORT** | Partial | Basic render done, camera/zoom deferred |

## Documentation Assessment

| Doc | Relevant to v2? | Action | Status |
|-----|-----------------|--------|--------|
| ADR-001 runtime boundary | Yes | -> ADR-V2-001 | PASS Done |
| ADR-002 command bus | Yes | -> TS CommandBus | PASS Ported |
| ADR-005 scripting | Yes | -> ADR-V2-003 | PASS Deferred |
| Design Doc v1.2 | Partial | Extract relevant specs | Ongoing |
| Visual Design System | Partial | Reference for UI phase | Deferred |

