# V2 Capability Matrix

## Purpose
Track what exists, where it runs, how it is tested, and what phase owns it.

## Status Legend
- Done: Shipped and verified in CI.
- In Progress: Implemented but missing a gate.
- Planned: Not started.

| Capability | Phase | Web | Desktop | Tests | Owner | Specs | Status |
|---|---|---|---|---|---|---|---|
| Project create/load/save | Phase 1 | Yes | Deferred | Unit | Runtime Web | BUILD-PROJECT-001 | Done (MVP) |
| Tile paint/erase | Phase 1 | Yes | Deferred | Unit | Runtime Web | BUILD-TILE-001, UI-UNDO-001 | Done (MVP) |
| Entity create/move/delete | Phase 1 | Yes | Deferred | Unit | Runtime Web | BUILD-ENTITY-001, UI-UNDO-002 | Done (MVP) |
| Undo/redo command stack | Phase 1 | Yes | Deferred | Unit | Runtime Web | UI-UNDO-001-004 | Done (MVP) |
| Undo/redo surface (UI buttons + shortcut hints + disabled states) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor | UI-UNDO-001 | Done (MVP) |
| Selection + transform | Phase 1 | Yes | Deferred | UI unit | UI Editor | UI-SELECT-001-004, UI-TRANSFORM-001-003 | In Progress |
| Select tool (explicit tool mode + canvas cursor) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor | UI-SELECT-001 | Done (MVP) |
| Diagnostics + tasks | Phase 1 | Yes | Deferred | Unit | UI Editor + Runtime Web | UI-TASKS-001-003 | Done (MVP) |
| Schema-driven inspector (slice 1) | Phase 1 | Done (MVP) | Deferred | UI unit | UI Editor + Contracts | UI-TRANSFORM-001-003, UI-INSPECT-001 | Done (MVP) |
| Collision (AABB + solids) | Phase 2 | Yes | Deferred | Rust unit | Core Collision | PLAY-COLLISION-001 | Done |
| Movement (grid/free) | Phase 2 | Yes | Deferred | Rust unit + TS unit | Core Simulation | PLAY-MOVEMENT-001 | Done |
| Physics lite | Phase 2 | Yes | Deferred | Rust unit + TS unit | Core Physics | PLAY-PHYSICS-001 | Done |
| Playtest lifecycle | Phase 2 | Yes | Deferred | Rust unit + TS unit | Core Simulation | PLAY-LIFECYCLE-001 | Done |
| Playtest interaction trigger (player -> interactable) | Phase 2 | Yes | Deferred | TS unit + smoke | Runtime Web | PLAY-LIFECYCLE-001 | Done |
| Test mode interaction console feedback | Phase 2 | Yes | Deferred | UI unit | UI Editor | PLAY-LIFECYCLE-001 | Done |
| Animation clips + transitions (MVP) | Phase 3 | Yes | Deferred | Rust unit + TS unit | Core Animation | ANIM-CLIP-001-004 | Done |
| Animation studio basic panel (MVP) | Phase 3 | Partial | Deferred | UI unit | UI Editor | ANIM-CLIP-001-004, ANIM-PANEL-001 | Done |
| Animation anchor/slot authoring panel (MVP) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor + Runtime Web | ANIM-PANEL-001, ANIM-ANCHOR-001-003 | Done (MVP) |
| Story panel graph selection/inspector binding (MVP) | Phase 3 | Yes | Deferred | UI unit | UI Editor | STORY-PANEL-001 | Done |
| Dashboard entry routing + project launch (MVP) | Phase 3 | Yes | Deferred | UI unit | UI Editor | UI-DASH-001 | Done (MVP) |
| Dashboard recent project health badges (MVP) | Phase 3 | Yes | Deferred | UI unit | UI Editor | UI-DASH-002 | Done (MVP) |
| Welcome dashboard + guided checklist (MVP) | Phase 3 | Yes | Deferred | UI unit | UI Editor | UI-ONBOARD-001 | Done (MVP) |
| Onboarding preferences + beginner/pro mode (MVP) | Phase 3 | Yes | Deferred | UI unit | UI Editor | UI-ONBOARD-002, UI-ONBOARD-003 | Done (MVP) |
| Visual token system baseline (theme + density + a11y) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor | UI-VISUAL-001 | Done (MVP) |
| CSS modularization (extraction + density decoupling) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor | UI-VISUAL-002 | Done (MVP) |
| Token compliance lint gate (no prim refs outside tokens.css) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor | UI-VISUAL-003 | Done (MVP) |
| Accessibility normalization (focus/disabled/motion/consistency) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor | UI-VISUAL-004 | Done (MVP) |
| Tab navigation bar (clickable tabs, active state, keyboard focus) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor | UI-SHELL-001 | Done (MVP) |
| Modal/dialog system (confirm, error, focus management) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor | UI-SHELL-002 | Done (MVP) |
| Keyboard shortcuts (Ctrl+Z/Y, S/P/E tool, Space step, Escape modal) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor | UI-HOTKEY-001 | Done (MVP) |
| Dirty-state correctness (snapshot-based, undo/redo/story aware) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor | UI-DIRTY-001 | Done (MVP) |
| Right-click context menu (hit-test select under cursor + Delete/Deselect/Properties, click-away, Escape) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor | UI-CTX-001 | Done (MVP) |
| Sprite workspace MVP (pixel edit + lint + smart brush) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Asset Pipeline | SPRITE-EDIT-001, SPRITE-STYLE-001, SPRITE-BRUSH-001 | Done (MVP) |
| Sprite pixel-safe edit + undo/redo | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor | SPRITE-EDIT-001 | Done (MVP) |
| Sprite pixel buffer persistence (save/load roundtrip) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | SPRITE-PERSIST-001 | Done (MVP) |
| Sprite palette lint + remap | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | SPRITE-STYLE-001 | Done (MVP) |
| Tile rule-based mapping (cardinal adjacency + 2-pass) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | TILE-RULE-001 | Done (MVP) |
| Effects workspace MVP (presets + field coupling) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | FX-PRESET-001, FX-FIELD-001 | Done (MVP) |
| Effects preset apply/clear + intensity + overlay | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | FX-PRESET-001 | Done (MVP) |
| Effects field coupling (deterministic playtest modulation) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | FX-FIELD-001 | Done (MVP) |
| Export workspace MVP (preflight + build panel) | Phase 4 | Done (MVP) | Deferred | Unit | Runtime + UI Editor | EXPORT-PREFLIGHT-001, EXPORT-BUILD-001 | Done (MVP) |
| Export preflight validation + blocking gate | Phase 4 | Done (MVP) | Deferred | Unit | Runtime + UI Editor | EXPORT-PREFLIGHT-001 | Done (MVP) |
| Export deterministic build baseline | Phase 4 | Done (MVP) | Deferred | Unit | Runtime + UI Editor | EXPORT-BUILD-001 | Done (MVP) |
| Animation anchors + slots | Phase 3 | Done (MVP) | Deferred | Unit | Runtime Web + Contracts | ANIM-ANCHOR-001-003 | Done (MVP) |
| Behavior rows MVP (trigger -> conditions -> actions) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | BEHAV-ROW-001 | Done (MVP) |
| Picker/selection-set engine | Phase 3 | Done (MVP) | Deferred | Done (MVP) | Runtime Web + Core Simulation | BEHAV-PICK-001 | Done (MVP) |
| Behavior debug trace ("why did this run/not run") | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | BEHAV-DEBUG-001, BEHAV-DEBUG-002 | Done (MVP) |
| Behavior node graph view | Phase 4 | Planned | Deferred | Planned | UI Editor | BEHAV-GRAPH-001 | Planned |
| Behavior code blocks (sandboxed script action) | Phase 4 | Planned | Deferred | Planned | UI Editor + Runtime Web + Script Runtime | BEHAV-CODE-001 | Planned |
| 2D-in-3D render architecture policy (quads + ortho) | Phase 0 | Policy | Deferred | Doc governance | Architecture | -- | Done |
| Dual render modes (`pixelPerfect2D` / `hd2D`) | Phase 3 | Planned | Deferred | Planned | Runtime Web | UI-VISUAL-001 | Planned |
| Smart brush v1 (scatter/field/tile-safe) | Phase 3 | Done (MVP) | Deferred | Done (MVP) | UI Editor + Runtime Web | SPRITE-BRUSH-001 | Done (MVP) |
| Modular character v1 (slots/anchors/occlusion/bake) | Phase 3 | Planned | Deferred | Planned | Asset + Animation | ANIM-ANCHOR-001-003 | Planned |
| Export baseline | Phase 4 | Planned | Planned | Planned | Runtime | -- | Planned |
| Desktop adapter | Phase 4 | N/A | Planned | Planned | Runtime Desktop | -- | Planned |
| Viewport usability baseline (zoom + pan + fit-to-map + correct hit tests) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor | UI-VIEWPORT-001 | Done (MVP) |
| Startup canvas ergonomics (64x36 default + deferred startup fit + fit upscale) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor | UI-STARTUP-001 | Done (MVP) |
| Left workspace rail layout (tabs/panels inside main) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor | UI-LAYOUT-001 | Done (MVP) |
| Golden integration smoke test (new->tile->entity->play->step->save->load) | Phase 3 | Done (MVP) | Deferred | Integration | Runtime Web | INTEG-001 | Done (MVP) |
| Empty-state CTAs (unified .empty-state class + actionable copy across all 8 workspace panels) | Phase 3 | Done (MVP) | Deferred | UI unit | UI Editor | UI-EMPTY-001 | Done (MVP) |
| Playable loop UX (starter CTA + command-path player speed + guided checklist flow) | Phase 3 | Done (MVP) | Deferred | Unit | UI Editor + Runtime Web + Contracts | UI-PLAYFLOW-001 | Done (MVP) |
| Playable vertical contract lock (movement + interact + speed command + save/load invariants) | Phase 3 | Done (MVP) | Deferred | Integration | Runtime Web | INTEG-CONTRACT-001 | Done (MVP) |

## Rules
1. Any capability status change must update this file in the same PR.
2. A capability is Done only when listed tests are green in CI.
3. Any Deferred capability must include a target phase.
4. A capability marked Done with `(MVP)` and Web = `Partial` means the gate-scoped MVP is complete and tested, but the full surface is not yet shipped. Future work extends, not replaces.
