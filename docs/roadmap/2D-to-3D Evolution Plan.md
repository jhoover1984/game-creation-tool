# 2D-to-3D Evolution Plan

Last updated: 2026-02-20
Purpose: define how we keep current 2D momentum while preserving a clean path to future 3D support.

## Current Reality
- The tool is intentionally 2D-first in v1.
- Current runtime/editor surfaces are optimized for tilemaps, sprites, and retro-profile constraints.
- Architecture is modular enough to evolve, but not yet 3D-ready by default.

## Guiding Principles
1. Do not slow v1 North Star delivery for speculative 3D features.
2. Keep engine APIs semantic and gameplay-driven, not renderer-specific.
3. Avoid irreversible 2D-only assumptions in shared project/schema boundaries.
4. Preserve deterministic playtest/export behavior across any future rendering mode.

## What We Keep 2D-Specific in v1
- Tilemap workflows and profile constraints.
- Pixel-art-first draw/animation paths.
- 2D viewport and canvas interaction model.

## What We Future-Proof Now
1. Data model boundaries:
- Keep project-level entities/components generic where feasible.
- Avoid embedding renderer-specific fields in core project manifests.

2. Runtime boundaries:
- Keep simulation logic separated from presentation logic.
- Prepare renderer interface contracts so multiple backends can exist later.

3. Scripting boundaries:
- Expose gameplay actions through semantic APIs (`spawn_entity`, `set_stat`, `play_animation`) rather than raw 2D commands.
- Compile graph/script logic into runtime IR independent of rendering dimension.

4. Export boundaries:
- Keep export packaging schema extensible via versioned manifests and capability flags.

## Proposed Phased Expansion
### Phase A (v1.x): 2.5D readiness
- Add optional depth ordering and layered parallax conventions.
- Keep assets 2D while exercising generalized transform and camera abstractions.

### Phase B (v2): hybrid runtime
- Add 3D scene/profile capability flag.
- Introduce separate 3D renderer backend while reusing core simulation/scripting/project systems.
- Add migration tooling for projects that opt into 3D capabilities.

### Phase C (v2+): native 3D authoring tools
- 3D viewport tooling and manipulators.
- 3D asset pipeline and physics/lighting toolchain extensions.

## Risks To Avoid
1. Premature abstraction that slows current feature delivery.
2. Mixing simulation and rendering concerns in command surfaces.
3. Forked logic paths where 2D and 3D behavior diverge unexpectedly.

## Near-Term Actions (During v1 Work)
1. Add capability flags to profile/project metadata design (planned, not runtime-enforced yet).
2. Keep new scripting/runtime APIs dimension-agnostic by default.
3. Add architecture checks in code review: "Does this change hardcode 2D into shared boundaries?"
4. Build animation systems with renderer-agnostic state machine data (clips/graphs/params decoupled from draw backend).
5. Keep sequencer camera tracks semantic (`position`, `zoom`, `shake`) so they map cleanly to future 3D camera controllers.
6. Ship beginner-first animation documentation in parallel with implementation to reduce feature debt.
