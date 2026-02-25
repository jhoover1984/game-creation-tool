# V2 Rebuild Plan

> Canonical reference for the GCS v2 rebuild. All decisions here are **locked**
> unless explicitly revised via ADR.

## Strategy

- **Two lanes**: legacy audit/archive (Lane A) + greenfield v2 build (Lane B)
- **Web-first runtime** for development speed; desktop added after parity gates
- **Legacy is reference-only** - not a direct port

## Governance Rule (Always On)

Before implementation, start from `docs/DOCUMENTATION_INDEX.md` and cite governing docs in the task. If a better path is chosen, update docs in the same task (and ADR when architectural).

Canonical design/architecture/production references:
1. `docs/architecture/V2 System Architecture.md`
2. `docs/design/V2 Product UX Spec.md`
3. `docs/design/V2 Visual System.md`
4. `docs/design/V2 UI Blueprint.md`
5. `docs/production/V2 Production Plan.md`

## Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Core language | Rust | Simulation/domain stays in Rust; WASM for web, native for desktop |
| Frontend language | TypeScript (strict) | Stronger contracts than JS+JSDoc at this scale |
| Scripting | Rhai (phased) | Deferred behind stable engine contracts, not dropped |
| Reset scope | `v2/` alongside legacy | Cutover after parity gates |

## Architecture (Hard Boundaries)

```
packages/core/        - Rust crates (simulation/domain only)
  |- math/            - Vec2, Transform2D, AABB
  |- collision/       - AABB overlap, solid checks, query API
  |- physics/         - velocity, gravity, friction, fixed-step
  |- simulation/      - movement modes, playtest lifecycle
  '- animation/       - clip playback, transitions

packages/contracts/   - TypeScript schemas + generated types
packages/runtime-web/ - Browser WASM adapter
packages/runtime-desktop/ - Tauri adapter (deferred)
packages/ui-editor/   - UI panels/workflows only
```

**Dependency rule (one-way):** `core -> contracts -> adapters -> UI`

## Decision Rules for Legacy Reuse

1. **Port** if: deterministic, well-tested, clean boundaries
2. **Rewrite** if: mixed concerns (UI/runtime/core entangled)
3. **Defer** if: high complexity, low immediate value
4. Every imported behavior gets new v2 tests and contracts

## System Build Order

1. Math/transform primitives
2. Collision v1 (AABB overlap, solid tile/entity checks, `wouldCollide`/`resolveMove`)
3. Movement v1 (grid mode, free mode)
4. Physics-lite v1 (velocity, gravity, friction, fixed-step integration)
5. Playtest loop v1 (enter/exit/pause/tick, stale-response guards)
6. Animation runtime v1 (clip playback, loop/once/pingpong, transition conditions)
7. Animation studio UI v1 (minimal clip editor + preview, transition editor)
8. Export/runtime parity v1

## Phases

### Phase 0: Foundation
- Workspace + CI + docs standards
- Contracts package + generation
- ADRs and AI execution guide

### Phase 1: Editor Core MVP
- Project load/save
- Tile/entity authoring
- Undo/redo command bus

### Phase 2: Simulation MVP
- Collision v1
- Movement v1
- Physics-lite v1
- Playtest lifecycle
- Simulation smoke tests

### Phase 3: Animation MVP
- Runtime animation system
- Minimal animation studio
- State transition tests

### Phase 4: Runtime Parity + Export
- WASM parity path
- Desktop wrapper integration
- Snapshot parity tests
- Export pipeline baseline

### Phase 5: Expansion
- State machine studio advanced UI
- Sequencer v1
- Camera tracks/events
- Optional particles integration hooks

## Animation Studio Migration Policy

**MVP set only:**
- Clip model
- Transition schema/validation
- Preview tick behavior
- Simple flipbook panel

**Deferred:**
- Sequencer
- Advanced graph tooling
- Deep polish and nonessential UX effects

## First 30-Day Execution

| Week | Deliverables |
|------|-------------|
| 1 | Legacy audit report, v2 scaffolding + CI + docs rules |
| 2 | Authoring MVP slice |
| 3 | Collision/movement/physics + playtest loop |
| 4 | Animation runtime + minimal studio + smoke coverage |

## What Users Get Early

1. Build a map
2. Add entities
3. Enter playtest
4. Basic movement/collision/physics
5. Assign animation clips and transitions
6. Export a working preview build

## Quality Gates

1. `lint`
2. `typecheck`
3. Unit/integration tests
4. Smoke E2E
5. Contract generation check
6. Parity tests (when desktop enabled)
