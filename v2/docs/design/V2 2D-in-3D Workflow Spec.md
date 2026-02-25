# V2 2D-in-3D Workflow Spec

Status: Planned workflow specification aligned with locked architecture policy.

## Purpose
Translate the 2D-in-3D architectural decision into concrete authoring and runtime workflow rules.

## Scope
1. 2D-first authoring remains default.
2. 3D-capable render internals are used for depth, layering, and future extension.
3. Full 3D world authoring remains out of scope for V2.

## Authoring Rules (V2)
1. Users author gameplay primarily on 2D map/canvas surfaces.
2. Entities store 3D-ready transforms, but default manipulation is constrained to 2D workflows.
3. Z/depth controls are optional and collapsed by default.

## Render Policy
1. `pixelPerfect2D` and `hd2D` are policy modes over shared content.
2. Mode switches must not mutate authored game data.
3. Per-content optional material features must fail gracefully when unsupported.
4. Sorting rules must be deterministic and explicit per renderable:
   - Primary: authored layer order
   - Secondary: Y-sort within eligible layer (if enabled)
   - Tertiary: explicit `zBias` override
5. Conflict handling:
   - Warn when incompatible sort options are set simultaneously.
   - Prefer explicit authored override over implicit heuristics.

## UX Requirements
1. Depth/layer conflicts are visible through overlays or diagnostics.
2. Effects and lighting controls expose safe defaults first.
3. Debug overlays (collision/fields/lights) are toggle-based, off by default.
4. Pixel mode sorting and sampling rules must remain stable:
   - integer snapping enabled
   - no subpixel drift caused by depth mode switches

## Determinism Constraints
1. Render mode changes do not alter simulation outputs.
2. Any mode-specific post/effect variation is visual-only and excluded from gameplay state.

## Out of Scope (V2)
1. Perspective-first level editing.
2. Mesh authoring pipelines.
3. Full 3D physics/navigation tooling.
