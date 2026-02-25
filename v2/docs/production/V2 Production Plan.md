# V2 Production Plan

Status: Locked for V2 execution sequencing; scope expansions must update this file.

## Objective
Ship a usable, deterministic V2 vertical slice with disciplined scope and test-backed iteration.

## Execution Rules (Locked)
1. Thin vertical slices over broad partial subsystems.
2. Behavior, schema, and UI changes ship together.
3. No slice is "done" without editor affordance + test coverage.

## Completed Priorities
- Onboarding shell MVP (`UI-DASH-001/002`, `UI-ONBOARD-001-003`) -- Done (MVP), 2026-02-21.
- Visual token system + CSS modularization + accessibility (`UI-VISUAL-001-004`) -- Done (MVP), 2026-02-22.
- Behavior authoring MVP (`BEHAV-ROW-001`, `BEHAV-PICK-001`, `BEHAV-DEBUG-001/002`) -- Done (MVP), 2026-02-21/22.
- Sprite workspace MVP (`SPRITE-EDIT-001`, `SPRITE-STYLE-001`, `SPRITE-BRUSH-001`) -- Done (MVP), 2026-02-21.
- Tile rule mapping (`TILE-RULE-001`) -- Done (MVP), 2026-02-21.
- Effects workspace MVP (`FX-PRESET-001`, `FX-FIELD-001`) -- Done (MVP), 2026-02-22.
- Export workspace MVP (`EXPORT-PREFLIGHT-001`, `EXPORT-BUILD-001`) -- Done (MVP), 2026-02-22.
- Animation anchors/slots (`ANIM-ANCHOR-001-003`) -- Done (MVP), 2026-02-22.
- Stabilization shell (`UI-SHELL-001/002`, `UI-SELECT-001`, `UI-UNDO-001`, `UI-HOTKEY-001`, `UI-DIRTY-001`, `UI-CTX-001`) -- Done (MVP), 2026-02-22/23.
- Legacy salvage S1+S2 (persistence patterns, batch undo, collision parity, diagnostics taxonomy) -- Done, 2026-02-21.

## Current Priority Chain (Locked)
1. Golden playable integration smoke test (INTEG-001): new project -> tile -> entity -> play -> step -> verify -> save -> load.
2. Inspector quality pass (`UI-INSPECT-001`): section foldouts, id field, empty-state CTA.
3. Sprite persistence fix (`SPRITE-PERSIST-001`): sprite pixel buffer must round-trip save/load.
4. Viewport usability baseline (`UI-VIEWPORT-001`): mouse-wheel zoom, pan, fit-to-map, zoom-reset, correct hit tests.
5. Modular character v1 (slot UX polish + occlusion preview + bake pipeline integration).
6. Recipe pipeline v1 (`recipe` + `bakeReport` contracts).

## Deferred (Explicit)
1. GPU mega-simulation patterns.
2. Full advanced deferred rendering stack.
3. Full 3D authoring/editor surfaces.
4. Plugin ecosystem expansion.

## Quality Gates (Locked)
1. Lint + typecheck + tests pass in CI.
2. Status/capability docs updated for behavior changes.
3. Contract changes include fixture updates.
4. Determinism-sensitive behavior includes parity/golden checks where applicable.

## Definition of Done (Per Slice)
1. Implemented and usable in editor UI.
2. Covered by at least one focused test.
3. Documented in behavior/manual/capability status as needed.
4. Compatible with governance and compatibility policies.
5. Mapped to explicit capability row(s) and spec ID(s) before status is marked Done.

## Workspace Rollout Policy (Locked)
1. Each workspace ships as an MVP slice before advanced controls.
2. Beginner-first defaults are required; advanced controls remain collapsed.
3. Smart tooling features must remain deterministic and explainable (preview or trace required).
4. Planned Post-V2 views (graph/code behavior editing) do not block V2 rows/picker/trace MVP.

## References
1. `docs/roadmap/V2 Rebuild Plan.md`
2. `docs/status/V2 Status Snapshot.md`
3. `docs/architecture/V2 Capability Matrix.md`
4. `docs/governance/Documentation Drift Policy.md`
5. `docs/design/V2 Professional UX Bar.md`
6. `docs/design/V2 Smart Tooling Spec.md`
7. `docs/design/V2 2D-in-3D Workflow Spec.md`
