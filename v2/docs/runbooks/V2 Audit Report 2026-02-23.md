# V2 Audit Report -- 2026-02-23

> Prepared by: Claude (AUDIT-001)
> Scope: Complete audit of all governed docs, legacy source, and V2 implementation state.
> Not a governed doc. Findings should be actioned into governed docs.

---

## 1. Audit Method

All files read word-for-word:
- All 44 docs in `v2/docs/` (governed)
- All ADRs, runbooks, governance, design, contracts, manual, architecture, production, status, performance, assets, security, release docs
- All V2 source: `packages/contracts/src/`, `packages/runtime-web/src/`, `packages/ui-editor/src/`, `packages/core/` (Rust)
- All legacy source (read-only reference): `crates/` (Rust) + `apps/desktop/src/` (JS frontend, 71 files)
- Current test count: 445 TypeScript + 26 Rust = 471 total

---

## 2. Documentation Currency Gaps

These docs are stale or misaligned with what was actually shipped.

### 2.1 MIGRATION.md (Critical)
- **Stale test count**: Shows 80 total (44 Rust + 36 TS). Reality is 471 (26 Rust + 445 TS).
- **Deferred table**: Lists "Sprite/tileset editor" as deferred to Phase 3 -- now shipped as Done (MVP).
- **Deferred table**: Lists "Export/HTML build" deferred to Phase 4 -- EXPORT-PREFLIGHT-001 and EXPORT-BUILD-001 are Done (MVP).
- **Deferred table**: Lists "Multi-scene support" deferred -- still correct.
- **Deferred table**: Lists "Camera system" (viewport + zoom/pan) deferred -- still correct.
- Action: Update test counts. Move Sprite and Export from Deferred to What's Ported.

### 2.2 V2 Production Plan -- Completed Priorities (High)
- **Only lists**: "Onboarding shell MVP" as a completed priority.
- **Missing from Completed**: All of Phase 3 -- Behavior authoring, Visual tokens, Sprite MVP, Tile rules, Effects, Export, Animation anchors, Stabilization slice (UI-SHELL-001/002, hotkeys, dirty-state, context menu, select, undo/redo).
- Action: Expand Completed Priorities section to reflect current state. Current Priority Chain should drop all items already Done.

### 2.3 V2 Professional UX Bar (High)
- **Sprite bar**: Still shows "Planned". SPRITE-EDIT-001, SPRITE-STYLE-001, SPRITE-BRUSH-001 are all Done (MVP).
- **Effects bar**: Still shows "Planned". FX-PRESET-001, FX-FIELD-001 are Done (MVP).
- **Export bar**: Still shows "Planned". EXPORT-PREFLIGHT-001, EXPORT-BUILD-001 are Done (MVP).
- **Animate bar**: Shows "In Progress" -- accurate for full clip editor, but anchor/slot authoring is Done.
- Action: Promote Sprite/Effects/Export to Done. Add note on Animate partial.

### 2.4 V2 UI Blueprint -- Left Rail (Medium)
- **Blueprint defines**: Left rail with Build/Animate/Story/Effects/Test modes.
- **Actual implementation**: Bottom tab bar with 9 tabs (Tasks, Console, Story, Onboarding, Behavior, Sprite, Effects, Export, Animation). No left rail exists.
- This is a design drift. The bottom-tab approach was a pragmatic simplification that was never reconciled back to the Blueprint.
- Action: Either update Blueprint to reflect implemented tab architecture as the V2 layout, or document the deviation explicitly in a Change-of-Plan note.

### 2.5 Behavior Specs.md -- Sprite Section Header (Low)
- **SPRITE-EDIT-001, SPRITE-STYLE-001, SPRITE-BRUSH-001** section still says "Planned (Workspace)" in the header but the spec bodies are complete. Capability matrix correctly shows Done (MVP).
- **Missing spec entries** for: UI-SHELL-001 (tab navigation), UI-SHELL-002 (modal), UI-HOTKEY-001, UI-DIRTY-001, UI-CTX-001, BEHAV-DEBUG-002 (already in specs -- correct).
- Action: Remove "Planned" label from Sprite section header. Add spec stubs for missing stabilization IDs.

### 2.6 V2 Capability Matrix -- Phase 1 Rows (Medium)
- Project create/load/save: "In Progress" -- functionally complete and tested. Should be "Done (MVP)".
- Tile paint/erase: "In Progress" -- functionally complete. Should be "Done (MVP)".
- Entity create/move/delete: "In Progress" -- functionally complete. Should be "Done (MVP)".
- "Schema-driven inspector (slice 1)": "In Progress" -- UI-INSPECT-001 will close this.
- These are holding at "In Progress" because there is no integration test gating them. Once the integration test lands (see Section 5.1), these can flip to Done.

### 2.7 Parity Gate 4 Timer (Medium)
- Gate 4 states: "v2 smoke test suite green for 1+ week (timer starts 2026-02-20)".
- As of 2026-02-23: 3 days into a 7-day window. Gate 4 cannot pass until 2026-02-27 earliest.
- No action needed -- just monitoring.

### 2.8 V2 Status Snapshot -- UI Editor "In Progress" Block (Low)
- "In Progress" block still lists "manual/guides-driven UX spec implementation" and "deeper animation/story/effects panel behavior" -- these are still correct but the block hasn't been trimmed as things shipped.
- Action: Trim In Progress block to reflect only what is genuinely still in flight.

---

## 3. Legacy Port Candidates -- Status Assessment

### 3.1 project-core (storage.rs) -- Adapt pattern for desktop
- **Source**: `crates/project-core/src/storage.rs` (364 lines)
- **Pattern**: Atomic save (temp file -> fsync -> rename), backup rotation with configurable max, schema version validation, migration runner
- **V2 status**: S1 salvage marked Done, but this was adapted to browser localStorage (TS side). The Rust atomic-save pattern is still unused in V2 Rust code.
- **When relevant**: Desktop adapter (Phase 4). The TS `persistence-store.ts` covers browser. Desktop will need the Rust pattern.
- **Action**: Document in Migration.md. No action needed until runtime-desktop begins.

### 3.2 command-core (batch/context model) -- Done
- **Source**: `crates/command-core/src/lib.rs` (trait-based, BatchCommand, context scoping)
- **V2 status**: S1 salvage marked Done. `beginUndoBatch`/`endUndoBatch` are implemented in ProjectStore. Paint stroke grouping is wired. Fully adapted.
- **Action**: None. Salvage complete.

### 3.3 engine-core/collision.rs -- Done
- **Source**: `crates/engine-core/src/collision.rs` (411 lines, AABB overlap, solid checks, utility API)
- **V2 status**: S1 salvage marked Done. Parity tests added for wall-slide and edge-contact. `gcs-collision` crate has the V2 equivalent.
- **Action**: None. Salvage complete.

### 3.4 export-core -- HIGH VALUE, Not Yet Ported
- **Source**: `crates/export-core/src/lib.rs` (910 lines), `src/assets.rs`, `src/scenes.rs`, `templates/runtime.js`, `templates/index.html`
- **What it does**: Builds a full runnable HTML5 preview artifact -- scene bundling, asset discovery, runtime.js embedding, index.html generation.
- **V2 status**: EXPORT-BUILD-001 produces deterministic JSON artifacts but NOT a runnable HTML5 game. V2 export cannot produce a playable game yet.
- **Gap**: The "What Users Get Early" section of V2 Rebuild Plan says item 6 is "Export a working preview build." Current export is NOT a working preview build -- it is only a canonical JSON snapshot.
- **Action**: Plan export-core port as Phase 4 priority. Target: `buildHtml5PreviewArtifact()` in `runtime-web` consuming V2 project JSON to produce a self-contained HTML5 game file.
- **Complexity**: `runtime.js` template uses V1 APIs. Would need adaptation to V2 PlaytestRunner contracts.

### 3.5 script-core -- Correctly Deferred
- **Source**: `crates/script-core/src/` (graph.rs, runtime.rs)
- **V2 status**: Deferred per ADR-V2-003. Correct.
- **Action**: None until Phase 3+.

### 3.6 Legacy Frontend -- HIGH VALUE items not yet adapted

#### 3.6.1 ui-playtest.js -- Playtest UX patterns
- **Legacy has**: Speed control (1x/0.5x/0.25x), zoom (fit/2x/3x/4x), breakpoint buttons (tick/item/quest), metrics panel (frame count, delta ms, step count, breakpoint info), separate playtest viewport canvas, `PLAYTEST_MAX_DELTA_MS=100` cap, warm-start delay.
- **V2 has**: play/pause/step/interact buttons only. No speed, no zoom, no metrics, no breakpoints.
- **Action**: Port speed control + metrics display as next playtest UX slice. Zoom/pan needs canvas refactor first (camera system).

#### 3.6.2 ui-issues-recovery.js -- Retry action taxonomy
- **Legacy has**: `RETRYABLE_RUNTIME_ACTIONS` map with 13 specific retry actions (Retry Undo, Retry Add Entity, Retry Export Preview, Retry Trace Toggle, etc.) + `ASSISTED_PROFILE_LIMITS` entity caps by platform profile (game_boy=6, nes=10, snes=14).
- **V2 has**: Deterministic auto-fix chains (EDIT_*) but no retry-action pattern for non-deterministic failures.
- **Gap for V2**: When `undo()` or `createEntity()` fails at runtime (not edit-time), V2 emits no structured retry action. Legacy had explicit retry affordance.
- **ASSISTED_PROFILE_LIMITS is interesting**: beginner-mode entity count guardrails tied to platform profile. Worth adding to behavior spec backlog.
- **Action**: Add RETRYABLE_RUNTIME_ACTIONS pattern to Tasks backlog. Add entity-count guardrail spec.

#### 3.6.3 ui-command-bar.js -- Command Palette
- **Legacy has**: A searchable command palette.
- **V2 Blueprint says**: "Command palette entry" in top bar (UI Blueprint, top bar section).
- **V2 status**: Not implemented.
- **Action**: Add to backlog as `UI-CMD-001`. Not blocking current slice.

#### 3.6.4 ui-script-lab.js + ui-script-templates.js -- Script Lab
- **Legacy has**: Rhai script editor with templates.
- **V2 status**: Correctly deferred (ADR-V2-003, BEHAV-CODE-001 is Post-V2).
- **Action**: None until scripting phase.

#### 3.6.5 ui-breakpoints.js -- Breakpoint debugging
- **Legacy has**: Tick/item/quest breakpoints.
- **V2 has**: Behavior debug trace (ring buffer), no breakpoints.
- **Action**: Add to backlog as part of BEHAV-DEBUG series. Not blocking.

#### 3.6.6 Dashboard templates -- Template cards
- **Legacy has**: `ui-dashboard-templates.js` with project templates (top-down, side-scroller, tactics, blank).
- **V2 Dashboard UX Spec says**: Template cards (top-down, side-scroller, tactics, blank) in Start section.
- **V2 status**: Dashboard exists (UI-DASH-001) but has no template cards. Only New/Open/Load buttons.
- **Action**: Add `UI-DASH-003` to backlog for template card support.

#### 3.6.7 ui-draw-assist-controls.js + ui-assisted-guardrail.js
- **Legacy has**: Draw assist UI (guided drawing overlays) + constraint guardrails (entity count by profile).
- **V2 Smart Tooling Spec says**: "Smart Brushes" and "Guided Progression Engine" are planned.
- **Action**: Reference pattern in Smart Tooling spec. Not blocking.

---

## 4. Implementation Gaps vs Specs

Features defined in governed specs that are not yet implemented.

### 4.1 Critical Gaps

#### 4.1.1 End-to-End Integration Test (HIGHEST RISK)
- **No test** exercises the full authoring-to-playtest sequence: `newProject -> paintTile -> createEntity -> play -> step N times -> verify position changed -> save -> load -> verify roundtrip`.
- **Why critical**: All 445 TS tests are unit tests. The vertical slice (parity gate requirement) is only smoke-tested by individual unit tests, not a single integration sequence.
- **Parity Gate 2** gates on simulation tests -- those are unit tests, not integration sequences.
- **Action**: Create `integration-smoke.test.ts` in `runtime-web` or a new package. See Section 5.1 for recommended scope.

#### 4.1.2 Viewport Zoom/Pan
- **Defined in**: V2 UI Blueprint ("Primary canvas/viewport"), V2 2D-in-3D Workflow Spec ("Pixel mode sorting"), Performance Budget (benchmark scenes imply navigation).
- **Legacy has**: `ui-map-viewport.js`, zoom buttons in playtest controller.
- **V2 status**: Canvas renders at fixed scale. No zoom/pan in editor or playtest.
- **Risk**: Hard to use on large maps. Significant UX gap for any real game project.
- **Action**: Add `UI-VIEWPORT-001` (editor zoom/pan) and `UI-VIEWPORT-002` (playtest zoom) to roadmap.

#### 4.1.3 Layer Management UI
- **Defined in**: V2 Behavior Specs UI-SELECT-003 ("layer visible/locked flags checked before hit-test"), V2 UI Blueprint.
- **V2 status**: Layer `visible` and `locked` flags exist in contracts but there is no UI to toggle them.
- **Action**: Add `UI-LAYER-001` to roadmap. Blocks UI-SELECT-003 completion.

#### 4.1.4 Rust/TS Cross-Path Parity Tests
- **Defined in**: `docs/contracts/PARITY_FIXTURE_MATRIX.md` -- requires Rust -> TS serialize -> canonical compare, and TS -> Rust -> canonical compare.
- **V2 status**: Only TS fixture tests exist (`schema-validation.test.ts`). Rust parity harness is marked "In Progress" in Status Snapshot. No cross-path tests exist.
- **Action**: Add `PARITY-001` to backlog. Blocks Gate 5 (Documentation PASS) fully closing.

### 4.2 High-Priority Gaps

#### 4.2.1 Animation Clip Editor UI (ANIM-CLIP-001-004)
- **Defined in**: Behavior Specs (all 4 specs Planned). Timeline scrub, keyframe add/remove/move, playback modes, clip create/delete.
- **V2 status**: Animation panel has anchor/slot authoring. No clip timeline, no keyframe editor.
- **Action**: ANIM-CLIP-001 through 004. Phase 3 scope per Rebuild Plan.

#### 4.2.2 Story Graph Editing
- **Defined in**: STORY-PANEL-001 (selection + inspector binding, Done). Structural edit (add/delete nodes/edges) -- no spec ID yet.
- **V2 status**: Can select nodes and edit name/kind. Cannot add nodes, add edges, delete nodes. Graph structure is fixed on load.
- **Action**: Add `STORY-EDIT-001` spec for structural graph editing.

#### 4.2.3 Inspector Quality Pass (UI-INSPECT-001)
- **Status**: Was mid-implementation at context boundary. Sections with `<details>/<summary>` foldouts not yet shipped.
- **Action**: Resume and complete. Planned work is well-defined.

#### 4.2.4 Empty-State CTAs (UI-EMPTY-001)
- **Defined in**: V2 Product UX Spec ("outcome-first workflows"). Each panel should have actionable empty state.
- **V2 status**: Inspector has `<p class="inspector-empty">` but no CTA. Behavior, Animation, Story, Sprite, Export panels not checked.
- **Action**: Part of UI-INSPECT-001 scope + separate pass for other panels.

### 4.3 Medium-Priority Gaps

#### 4.3.1 Multi-Select (UI-SELECT-002, UI-SELECT-003)
- Shift+click and box drag selection not implemented. Only single-entity click selection.
- Entity layer-aware selection (visible/locked) not implemented.

#### 4.3.2 Group Move + Group Undo (UI-TRANSFORM-001 multi, UI-UNDO-003)
- Move multiple selected entities simultaneously not implemented.
- `groupMove` UndoRecord type not implemented.

#### 4.3.3 Undo Stack Limits (UI-UNDO-004)
- Configurable max depth (default 100), FIFO eviction when exceeded -- not implemented.

#### 4.3.4 Sprite Edits Not Persisted
- `SpriteWorkspaceStore` holds pixel buffer in memory but sprite data is NOT saved in project JSON.
- Sprite edits are lost on save/load. This is a gap vs "pixel-safe edit and persist on save/apply" (SPRITE-EDIT-001 spec).

#### 4.3.5 Performance Benchmarks
- `V2 Performance Budget.md` defines targets (sim <= 4ms, render <= 8ms, load <= 1.5s).
- No CI-measured benchmarks exist. Performance is untested.

#### 4.3.6 Dual Render Modes (pixelPerfect2D / hd2D)
- Defined in V2 System Architecture and Capability Matrix as "Planned".
- No implementation. Lower priority but affects long-term asset authoring spec.

#### 4.3.7 Recipe Pipeline v1
- `V2 Production Plan` item 10. Not started. `bakeReport` contract not defined.
- Asset Pipeline Contract references bake stage. Needed before export-core port.

### 4.4 Deferred (Correct -- No Action Needed)

| Item | Status | Gate |
|------|--------|------|
| Rhai scripting (BEHAV-CODE-001) | Correctly deferred (ADR-V2-003) | Phase 3+ |
| Desktop adapter | Correctly deferred (Phase 4) | After parity gates |
| Behavior node graph (BEHAV-GRAPH-001) | Correctly deferred (Post-V2) | Post-V2 |
| Advanced rendering (deferred lighting, 3D mesh) | Correctly deferred | Post-V2 |
| Camera tracks/events | Correctly deferred | Phase 5 |
| Sequencer v1 | Correctly deferred | Phase 5 |
| Full 3D authoring | Correctly deferred | Post-V2 |

---

## 5. Recommended Priority Order

Based on audit findings, impact on parity gates, and "discoverable without docs" acceptance rule:

### 5.1 P0: Integration Smoke Test (Before Anything Else)
**Why**: Biggest risk. No test validates the vertical slice end-to-end.

Recommended `integration-smoke.test.ts` sequence:
```
newProject(name, width, height, tileSize)
-> paintTile(layer, x, y, tileId)
-> createEntity(name, x, y)
-> play()
-> step() x5
-> verify entity position != initial
-> pause()
-> save() -> JSON string
-> newProject() -> load(JSON string)
-> verify entity exists at last known position
-> exit playtest
```

### 5.2 P0: Documentation Sync (Parallel with P0 above)
1. Update `MIGRATION.md` test counts (80 -> 471).
2. Update `V2 Production Plan` Completed Priorities.
3. Update `V2 Professional UX Bar` Sprite/Effects/Export to Done.
4. Clarify `V2 UI Blueprint` left-rail vs actual bottom-tab implementation.
5. Add spec stubs to `Behavior Specs.md` for UI-SHELL-001/002, UI-HOTKEY-001, UI-DIRTY-001, UI-CTX-001.
6. Flip Phase 1 Capability Matrix rows from "In Progress" to "Done (MVP)".

### 5.3 P1: Inspector Quality Pass (UI-INSPECT-001)
- Section grouping with `<details>/<summary>` foldouts. Work was in progress at context boundary.
- Transform/Visual/Metadata sections. Add `id` readOnly field to schema.

### 5.4 P1: Sprite Persistence Fix
- Sprite edits in `SpriteWorkspaceStore` must round-trip through project save/load.
- Currently lost on save. This is a correctness gap, not a feature gap.

### 5.5 P2: Playtest UX Slice (from legacy ui-playtest.js patterns)
- Speed control (1x/0.5x/0.25x) with `PLAYTEST_MAX_DELTA_MS` cap
- Frame metrics panel (tick count, delta ms)
- These are directly portable from the legacy controller pattern.

### 5.6 P2: Viewport Zoom/Pan (UI-VIEWPORT-001)
- Critical for usability on real-size maps. Currently only pixel-perfect fixed scale.
- Needed before advanced authoring workflows are testable by real users.

### 5.7 P3: Remaining Behavior Specs
- Story graph editing (STORY-EDIT-001: add/delete nodes/edges)
- Animation clip editor (ANIM-CLIP-001-004: timeline, keyframes)
- Multi-select + group move (UI-SELECT-002, UI-TRANSFORM-001)

### 5.8 Phase 4: export-core Port
- Port `build_html5_preview_artifact()` to produce a runnable HTML5 game.
- Adapt `templates/runtime.js` to V2 PlaytestRunner contracts.
- This closes the "Export a working preview build" user-facing promise.

---

## 6. Rust/TS Contract Parity Status

| Contract | TS Fixture | Rust Test | Cross-Path | Status |
|----------|-----------|-----------|------------|--------|
| project_min.v2.json | Yes | Partial | No | Gap |
| map_min.v2.json | Yes | Partial | No | Gap |
| animation_clip_walk.v2.json | Yes | Yes (Rust unit) | No | Gap |
| entity_min.v2.json | Yes | Partial | No | Gap |
| story_quest_branch.v2.json | Yes | Partial | No | Gap |
| entity_with_slots.v2.json | Yes | No | No | Gap |

Cross-path parity tests (Rust serialize -> TS parse and vice versa) are defined in PARITY_FIXTURE_MATRIX.md but not yet implemented. This is required for Parity Gate 5 to fully close.

---

## 7. Architecture Alignment

The three hard rules (dependency direction, contract boundary, no simulation in UI) are correctly followed:
- `gcs-math -> gcs-collision -> gcs-physics -> gcs-simulation` -- correct
- `gcs-animation` standalone -- correct
- `@gcs/contracts` is the sole cross-boundary type definition -- correct
- No UI logic in runtime-web -- correct
- No simulation logic in ui-editor -- correct

One concern: `EditorApp` in `ui-editor` is growing large. File size rule says <= 400 lines; `editor-app.ts` should be checked. If over limit, schedule extraction.

---

## 8. Codex Coordination Note

This audit was a read-only task. No code was modified. If Codex is working concurrently, recommended non-overlapping split:
- Claude: UI-INSPECT-001, sprite persistence fix, doc sync tasks.
- Codex: integration smoke test, Rust parity harness, playtest UX slice.

Avoid both agents touching: `editor-shell-controller.ts`, `project-store.ts`, `editor-app.ts` simultaneously.

---

## 9. Summary Table

| Category | Count | Priority |
|----------|-------|----------|
| Stale docs | 8 items | P0 |
| Missing integration test | 1 | P0 |
| Implementation gaps (critical) | 4 | P0-P1 |
| Implementation gaps (high) | 5 | P1-P2 |
| Implementation gaps (medium) | 7 | P2-P3 |
| Correctly deferred | 8 | No action |
| Legacy ports remaining | 3 | Phase 4 |
| Fully aligned | All architecture rules, ADRs, Phase 2 simulation | -- |
