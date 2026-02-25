# V2 Product UX Spec

Status: Locked (V2 UX core), with Planned sections marked.

## Product Goal
Enable users to build a playable 2D game slice quickly while preserving headroom for advanced workflows.

## Core UX Principles (Locked)
1. Progressive disclosure:
   - Basic controls visible by default.
   - Advanced options behind foldouts/command palette.
2. One layout, many modes:
   - Stable shell.
   - Tool behavior changes by mode, not window sprawl.
3. Outcome-first workflows:
   - Users choose "what to accomplish" (recipes/tasks), not low-level mechanics first.
4. Always playable:
   - Play-in-editor is first-class.

## Primary Workflows (Locked)
1. Build: map + entities + fields.
2. Animate: clips + anchors + events + occlusion helpers.
3. Story: quest graph + deterministic dialogue variants.
4. Effects: basic lighting/particles/weather presets.
5. Test: play/pause/step/debug overlays.

## UX Constraints (Locked)
1. Keep one canvas, one inspector, bottom utility tabs.
2. Keep tasks actionable and repair-oriented.
3. Keep user-facing controls minimal per view.

## Beginner Mode Contract (Locked for V2)
1. Beginner mode defaults:
   - advanced sections collapsed
   - recommendation prompts enabled
   - guided checklist visible when available
2. Pro mode defaults:
   - full surface visibility
   - reduced recommendations
3. Switching modes must be non-destructive and immediate.

## Planned (Post-V2)
1. Advanced sequencing across animation/story/effects timelines.
2. Deep style-authoring and high-complexity automation surfaces.
3. Behavior authoring multi-view workflow over one canonical model:
   - Event Rows (default)
   - Node Graph (power users)
   - Code Blocks (sandboxed)

## References
1. `docs/design/V2 UI Blueprint.md`
2. `docs/design/V2 Professional UX Bar.md`
3. `docs/design/V2 Smart Tooling Spec.md`
4. `docs/design/V2 Dashboard UX Spec.md`
5. `docs/design/V2 Onboarding Spec.md`
6. `docs/design/V2 Diagnostics and Tasks Contract.md`
7. `docs/manual/Quickstart.md`
8. `docs/manual/How-To Guides.md`
9. `docs/manual/Behavior Specs.md`
