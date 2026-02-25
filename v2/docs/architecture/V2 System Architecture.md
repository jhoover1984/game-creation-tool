# V2 System Architecture

Status: Locked (V2), with explicitly marked Planned sections.

## Purpose
Define the canonical architecture boundaries for V2 so implementation remains modular, deterministic, and upgrade-friendly.

## Pillars (Locked)
1. Data-first primitives:
   - Fields (layered spatial/temporal data)
   - Graphs (relationships, causality, story logic)
   - Recipes (deterministic transforms/generators)
2. Separation of concerns:
   - Simulation is deterministic and headless.
   - Rendering consumes snapshots and does not own gameplay rules.
   - Editor orchestrates authoring workflows and commands.
3. Contract-driven integration:
   - Schemas define shape.
   - Behavior specs define semantics.
   - Fixtures/tests enforce parity.

## Rendering Model (Locked)
V2 is a 2D-first engine with 3D-capable internals:
1. Sprites render as quads in a 3D scene.
2. Orthographic camera is default for V2 workflows.
3. Render modes are policy toggles over shared content:
   - `pixelPerfect2D`
   - `hd2D`
4. This does not imply "free 3D." Future 3D requires content/tooling expansion.

## Coordinate and Transform Policy (Locked)
1. Transforms are stored as 3D-ready values.
2. Up-axis is fixed per engine policy and must not drift.
3. Units are explicit and independent from pixel dimensions.
4. Simulation position data is renderer-agnostic.

## Repository Boundaries (Locked)
1. `packages/core/*` (Rust): simulation/domain.
2. `packages/contracts` (TS + schema): canonical payload/asset formats.
3. `packages/runtime-web`: browser adapter and orchestration.
4. `packages/ui-editor`: UI workflows only.
5. `packages/runtime-desktop`: deferred adapter.

Dependency direction:
`core -> contracts -> runtime adapters -> ui-editor`

## Planned (Post-V2)
1. Advanced rendering passes (deferred lighting variants, richer post).
2. Mesh renderer path and 3D authoring views.
3. Plugin expansion model (after workflow stability).

## Planned Behavior Authoring Architecture (Post-V2)
1. One canonical Behavior IR (intermediate representation) is the source-of-truth for gameplay behaviors.
2. Multiple editor views map to the same IR and must remain round-trip safe:
   - Event Rows view (beginner-first)
   - Node Graph view (power visual editing)
   - Code Blocks view (sandboxed script actions)
3. Selection-set ("picker") semantics are part of the IR execution contract:
   - Conditions filter target sets.
   - Actions execute against the current target set.
4. Behavior execution must remain deterministic and replay-safe:
   - Stable evaluation order
   - Seeded randomness only
   - No wall-clock dependencies
5. Scope guardrail for V2:
   - No separate logic systems per view.
   - No full plugin-level behavior extension before rows-view MVP is stable.

## References
1. `docs/roadmap/V2 Rebuild Plan.md`
2. `docs/architecture/V2 Determinism Spec.md`
3. `docs/contracts/V2 Compatibility Policy.md`
4. `docs/assets/V2 Asset Pipeline Contract.md`
