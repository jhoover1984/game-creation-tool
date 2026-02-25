# v1 -> v2 Migration Guide

## Overview

v2 is a ground-up rebuild of the Game Creation Studio (GCS). v1 remains frozen at tag `legacy-reference` until all 5 parity gates pass, at which point v1 is archived to `archive/v1/`.

## Architecture Changes

| Aspect | v1 | v2 |
|--------|----|----|
| **Frontend lang** | JS + JSDoc | TypeScript (strict) |
| **Core crates** | 7 (monolithic service) | 5 focused crates (math, collision, physics, simulation, animation) |
| **Command bus** | `command-core` Rust crate | TS `CommandBus` + Rust `CommandStack` |
| **Playtest runtime** | `engine-core` + `gcs-wasm` | `PlaytestWorld` (Rust) + `PlaytestRunner` (TS) |
| **Animation** | `engine-core` embedded | Standalone `gcs-animation` crate + TS `AnimationPlayer` |
| **Scripting** | Rhai integrated | Rhai deferred (ADR-V2-003) |
| **Editor service** | 3000+ LOC monolith | Split by domain (not yet extracted) |

## What's Ported

### Rust Core
- **Project create/save/load** -- `simulation/src/project.rs` (from `project-core`)
- **Command stack + undo/redo** -- `simulation/src/commands.rs` (from `command-core`)
- **AABB collision** -- `collision/src/query.rs` + `tilemap.rs` (from `engine-core` subset)
- **Physics-lite** -- `physics/src/lib.rs` (gravity, friction, velocity integration)
- **Movement modes** -- `simulation/src/movement.rs` (grid + free)
- **Playtest lifecycle** -- `simulation/src/playtest.rs` + `world.rs`
- **Animation clips** -- `animation/src/clip.rs` (loop/once/pingpong)
- **Animation transitions** -- `animation/src/transition.rs` + `state_machine.rs`

### TypeScript
- **Contracts** -- `@gcs/contracts` defines all cross-boundary types
- **ProjectStore** -- project state, tile painting, entity CRUD, undo/redo
- **PlaytestRunner** -- simulation mirror (input -> movement -> collision -> physics)
- **AnimationPlayer** -- clip playback + transition evaluation
- **EditorApp** -- canvas rendering, tool system, command dispatch
- **Animation Studio** -- clip editor, timeline, transition management
- **Behavior authoring** -- BehaviorEvaluator, BehaviorPanelController, debug trace (BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001/002)
- **Sprite workspace** -- SpriteWorkspaceStore, SpritePanelController, palette lint, smart brush (SPRITE-EDIT-001, SPRITE-STYLE-001, SPRITE-BRUSH-001)
- **Effects workspace** -- effects presets + field coupling with undo/redo (FX-PRESET-001, FX-FIELD-001)
- **Export workspace** -- preflight validation + deterministic build baseline (EXPORT-PREFLIGHT-001, EXPORT-BUILD-001)
- **Stabilization shell** -- tab nav, modal/dialog, keyboard shortcuts, dirty-state, context menu (UI-SHELL-001/002, UI-HOTKEY-001, UI-DIRTY-001, UI-CTX-001)
- **Animation anchors/slots** -- anchor keyframes, slot attachment, occlusion hints (ANIM-ANCHOR-001-003)
- **Tile rule mapping** -- cardinal adjacency 2-pass engine (TILE-RULE-001)
- **Visual token system** -- CSS modularization, density decoupling, token compliance (UI-VISUAL-001-004)
- **Onboarding/dashboard** -- welcome dashboard, checklist, preferences (UI-DASH-001/002, UI-ONBOARD-001-003)

## What's Deferred

| Feature | Reason | Target Phase |
|---------|--------|-------------|
| **Rhai scripting** | Engine contracts not stable yet (ADR-V2-003) | Phase 3+ |
| **Export HTML5 runtime** | Full playable HTML5 output; preflight+build baseline shipped | Phase 4 |
| **Multi-scene support** | Needs scene graph architecture | Phase 3 |
| **Camera zoom/pan** | Viewport usability MVP in progress (UI-VIEWPORT-001) | Phase 3 |

## What's Dropped

| Feature | Reason |
|---------|--------|
| **JS+JSDoc frontend** | Replaced by TypeScript strict |
| **Monolithic editor_service.rs** | Split by domain in v2 |
| **editor_session.rs** | Was dead code in v1 |

## Test Coverage

| Layer | v1 | v2 |
|-------|----|----|
| Rust tests | ~60 | 26 |
| TS/JS tests | ~100+ | 445 |
| Total | ~160 | 471 |

v2 tests are more focused (unit + integration smoke tests). v1 had broader but less structured coverage.

## How to Run

```bash
# Rust
cd v2 && cargo test --workspace
cd v2 && cargo clippy --workspace -- -D warnings

# TypeScript
cd v2 && npm install
cd v2 && npm run typecheck
cd v2 && npm run test --workspaces --if-present
```

## Key Decisions

- **ADR-V2-001**: Rust core + WASM for browser
- **ADR-V2-002**: TypeScript strict for frontend
- **ADR-V2-003**: Rhai scripting deferred until engine stabilizes

