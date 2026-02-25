# Agent State - Cross-Agent Coordination Scratch Pad

> **NOT a governed doc. NOT authoritative. NOT a CI gate.**
> Any decision recorded here that affects behavior, contracts, or roadmap
> MUST also be reflected in the appropriate governed docs:
> - `docs/status/V2 Status Snapshot.md`
> - `docs/architecture/V2 Capability Matrix.md`
> - `docs/roadmap/V2 Rebuild Plan.md` or `docs/production/V2 Production Plan.md`
> - An ADR if architectural.
>
> This file is for handoff notes, session state, and in-flight coordination only.

---

## Active Task
None. Ready for next task.

## Last Completed Work (2026-02-24 -- latest)

- 2026-02-24 [Codex] INTEG-CONTRACT-001 -- Added runtime playable-contract integration lock (`playable-contract.test.ts`) covering starter authored tile state, command-path player speed + undo/redo semantics, movement+interaction tick, and save/load invariants. Final gates clean: `npx tsc --build`, workspace tests (`16 + 147 + 358 = 521`), ASCII.
- 2026-02-24 [Codex] UI-PLAYFLOW-001 -- Shipped playable-loop UX: command-path player speed (`entity:setSpeed`) with undo/redo + save/load parse support, playtest speed consumption (`e.speed ?? 120`), Player Config inspector section for tagged player entities, and onboarding quick-start CTA + dismissible flow hint wired through checklist action delegation. Gates clean: `npx tsc --build`, workspace tests (`16 + 146 + 358 = 520`), ASCII.
- 2026-02-24 [Claude] UI-EMPTY-001 -- Unified empty-state system: added canonical `.empty-state` CSS class (centered, padded, muted italic) to components.css with `.empty-state + button` centering rule; standardized all 8 workspace panels (Tasks, Behavior, Animation, Export, Story, Sprite) from per-panel classes to `.empty-state`; improved copy for discoverability (Tasks: "No diagnostics...", Story: "No story nodes yet...", etc.); updated 5 test assertions. 344 total TS tests, tsc + ASCII clean.

## Last Completed Work (2026-02-22)

- 2026-02-22 [Claude] UI-CTX-001 -- Right-click context menu: ContextMenuController (show/hide/position/click-away/Escape), Delete/Deselect/Properties actions, item visibility by selection state, contextmenu handler on canvas, contextMenu+contextMenuTarget in EditorShellElements, CSS styles. context-menu.test.ts (12 tests). 444 total TS tests, tsc + ASCII clean.

## Last Completed Work (2026-02-23 -- latest)

- 2026-02-24 [Codex] UI-STARTUP-001, UI-LAYOUT-001 -- Updated startup ergonomics to 64x36@16 with deferred first-load viewport fit, enabled fit-to-map upscale (bounded by VIEWPORT_MAX_ZOOM), and moved workspace tabs/panels into a left rail inside `<main>` while preserving `.bottom-tabs` compatibility. Gates clean: `npx tsc --build`, `npm test`, ASCII.
- 2026-02-23 [Claude] AUDIT-001 -- Complete V2 audit: read all 44 governed docs + all legacy source (71 JS files, 6 Rust crates) + all V2 source; produced v2/docs/runbooks/V2 Audit Report 2026-02-23.md with 9 sections covering doc currency gaps, legacy port candidates, implementation gaps, priority order, Rust/TS parity status, and Codex coordination notes.
- 2026-02-24 [Codex] Playable starter-path pass -- Added `Add Player` shell action (centered spawn, `player` tag, solid flag, auto-select) so playtest movement works from visible UI without hidden tag edits. Added focused shell test coverage and updated Status Snapshot test totals to 382 (`16 + 139 + 227`).
- 2026-02-24 [Codex] Playable starter-scene pass -- Added `Add Ground + Player` shell action (paint row `height-2` + spawn/select tagged player above it) for one-click first-playable setup. Added focused shell test coverage and updated Status Snapshot totals to 383 (`16 + 139 + 228`).
- 2026-02-24 [Codex] Playtest HUD strip pass -- Added header HUD with playtest state/tick/player position (`#playtest-hud`), wired HUD updates across play/pause/step/new/load/apply-map flows, and added focused shell HUD test. Re-verified truthful per-workspace test totals: 498 (`16 + 139 + 343`).

## Last Completed Work (2026-02-23)

- 2026-02-23 [Codex] UI-CTX-001 follow-up -- Fixed right-click target behavior to select entity under cursor before opening context menu; upgraded Properties action to refresh + focus inspector. Added focused shell test for contextmenu hit-test selection.

- 2026-02-23 [Codex] UI-DIRTY-001 follow-up -- Fixed remaining `Apply Map` dirty-state gap by calling `recomputeDirty()` in `btnApplyMap` path; added focused regression test (`dirty-state.test.ts`) proving map apply marks project dirty from a clean baseline; updated Status Snapshot counts/notes.

- 2026-02-22 [Claude] UI-DIRTY-001 -- Dirty-state correctness: snapshot-based recomputeDirty() replacing event-flag; markClean() at init/save/load/new; recomputeDirty() in bus, undo/redo buttons + hotkeys; StoryPanelController onMutate hook for bus-bypassing story edits. dirty-state.test.ts (9 tests). 431 total TS tests, tsc + ASCII clean.
- 2026-02-22 [Claude] UI-HOTKEY-001 -- Keyboard shortcuts: S/P/E switch tool + cursor; Ctrl+Z/Y/Shift+Z undo/redo; Space playtest step; Escape close modal; form-element guard; `keydownTarget` element; `setTool()` helper. hotkey.test.ts (11 tests). 422 total TS tests, tsc + ASCII clean.
- 2026-02-22 [Claude] UI-SHELL-001/002, UI-SELECT-001, UI-UNDO-001 -- Stabilization slice: clickable tab bar with active state + focus, modal/dialog system with focus trap + dirty-gate, select tool + canvas cursor, undo/redo UI buttons with disabled states. 3 new test files (tab-navigation, modal, undo-redo-surface), existing tests updated for new default tool. 411 total TS tests, tsc + ASCII clean.

- 2026-02-22 [Codex] ANIM-PANEL-001 -- Shipped animation anchor/slot authoring panel in UI editor (`animation-panel.ts`, `animation-panel-controller.ts`), wired shell/main/app tabs, added focused UI tests (`animation-panel-controller.test.ts`), and updated governed docs. Gates green: `npx tsc --build`, `npm test`, ASCII check.
- 2026-02-22 [Codex] ANIM-ANCHOR-001/002/003 fix pass -- Patched project load to preserve `EntityDef.slots`, added duplicate guards for anchor frame add + slotName attach in ProjectStore, and added focused regression tests (`project-store.test.ts`, `animation-anchor.test.ts`). Gates green: `npx tsc --build`, `npm test`, ASCII check.
- 2026-02-22 [Claude] ANIM-ANCHOR-001-003 -- Animation anchor + slot attachment system: AnchorKeyframe/SlotAttachment/OcclusionHint types in contracts; animation:anchor:add|move|remove + entity:slot:attach|detach|setOcclusion commands with undo/redo; resolveAnchorPosition/detectCircularAttachment/resolveOcclusionOrder helpers; entity schema + entity_with_slots fixture; clips persisted in ProjectStore; animation-anchor.test.ts (18 tests). 378 total TS tests, tsc + ASCII clean.

- 2026-02-22 [Claude] UI-VISUAL-004 -- Accessibility normalization: :focus-visible expanded (a/textarea/[tabindex]); :disabled centralized with --opacity-disabled token; button:hover guarded :not(:disabled); .dash-recent-card:hover added; inline disabled overrides removed from workspaces.css; visual-accessibility.test.ts (10 tests). 358 total TS tests, tsc + ASCII clean.
- 2026-02-22 [Claude] UI-VISUAL-003 -- Token compliance gate: no --prim-* and no raw hex outside tokens.css; fixed 2 violations (density override + sprite swatch); --accent-highlight alias added; 3 new compliance tests in visual-tokens.test.ts. 348 total TS tests, tsc + ASCII clean.
- 2026-02-22 [Claude] UI-VISUAL-002 Slice B -- Density decoupling: [data-density="dense"] replaces [data-mode="pro"] for spacing overrides, EditorShellController.setDensity() added, app.html default data-density="comfort" wired, visual-density.test.ts (6 new tests). 345 total TS tests, tsc + ASCII clean.
- 2026-02-22 [Claude] UI-VISUAL-002 Slice A -- CSS extraction: 413-line inline style block split into 6 modular stylesheets (tokens/base/layout/components/workspaces/accessibility), app.html reduced to 6 <link> tags, visual-tokens.test.ts updated to read CSS files (all 10 tests green), governed docs updated. 339 total TS tests, tsc + ASCII clean.
- 2026-02-22 [Claude] BEHAV-DEBUG-002 -- Playtest-time guardrail overflow diagnostics: BehaviorEvalOverflow contract, per-step overflow tracking with merge across all trigger passes, BEHAV_ROW_CAP_EXCEEDED + BEHAV_ACTION_CAP_EXCEEDED diagnostics with stable IDs, dedup per (entityId,rowId), exit cleanup, 6 new tests (108 runtime-web total). tsc + ASCII clean.
- 2026-02-22 [Codex] BEHAV-ROW-001/BEHAV-PICK-001/BEHAV-DEBUG-001 expansion -- Added deterministic row/action guardrails and richer action targeting (`this`/`tag`/`radius`) for `set_velocity` and `destroy_self` with focused tests and doc updates.
- 2026-02-22 [Codex] BEHAV-ROW-001/BEHAV-PICK-001/BEHAV-DEBUG-001 expansion -- Added shared deterministic target resolver, `on:proximity` trigger execution, and `entity_in_radius` condition runtime path with focused tests and status/spec updates.
- 2026-02-22 [Codex] BEHAV-ROW-001/BEHAV-PICK-001/BEHAV-DEBUG-001 expansion -- Added runtime `on:interact` + `on:collision` trigger execution and deterministic `set_velocity`/`destroy_self` action execution with focused tests and status/spec updates.
- 2026-02-22 [Codex] EXPORT-BUILD-001 -- Deterministic export build MVP shipped: canonical build artifacts + metadata/provenance report, export panel build summary, focused runtime/UI tests, and governed docs updated.
- 2026-02-22 [Codex] EXPORT-PREFLIGHT-001 -- Export preflight MVP shipped: deterministic preflight evaluator, export panel gating flow, focused runtime/UI tests, and governed docs updated.
- 2026-02-22 [Codex] FX-FIELD-001 -- Field-driven effects coupling shipped: command-path link config with undo/redo + save/load, deterministic `wind.global` sampler, playtest tick overlay modulation, focused tests and docs updated.
- 2026-02-22 [Codex] FX-PRESET-001 -- Effects Workspace MVP verified and closed: contracts/runtime/ui integration complete, `effects-presets.test.ts` (11 tests) passing, docs/status updated, full gates green (`tsc`, `npm test`, ASCII).
- 2026-02-21 [Claude] TILE-RULE-001 -- Tile rule mapping MVP shipped: tile-rule-engine (computeMask/resolveTile/collectNeighborhood), DEMO_RULESET, applyRulePaint() 2-pass algorithm, rule-paint tool wired, TILE diagnostics to DiagnosticStore. 14 new tests, 182 total ui-editor TS green. tsc + ASCII clean.
- 2026-02-21 [Claude] SPRITE-BRUSH-001 -- Smart brush MVP shipped: BrushEngine (expandDab/expandStroke, xorshift32 RNG, position-derived seed), pencil+scatter types, 1/3/5px sizes, toolbar wired, single undo per drag. 8 new tests, 167 total TS green.
- 2026-02-21 [Claude] SPRITE-STYLE-001 -- Sprite palette lint + remap shipped: lintSprite (pure), applyPixelFix (no-undo), Remap toolbar button, SPRITE_COLOR_OUT_OF_PALETTE diagnostic wired to DiagnosticStore. 10 new tests, all green. 251 total TS tests (14 contracts + 78 runtime-web + 159 ui-editor).
- 2026-02-21 [Claude] SPRITE-EDIT-001 -- Sprite pixel-safe edit MVP shipped: SpriteWorkspaceStore, SpritePanelController, renderSpritePanel, 6th editor tab. 239 tests, CI green.
- 2026-02-21 [Claude] UI-VISUAL-001 -- Visual token baseline shipped: two-layer CSS tokens (prim + semantic), pro density overrides, reduced-motion, focus-visible. 229 tests, CI green.
- 2026-02-21 [Claude] BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001 -- Behavior authoring MVP shipped: BehaviorRow IR, TargetSelector picker, BehaviorEvaluator (on:tick + entity_has_tag), debug trace panel, entity:delete undo parity. 219 tests, CI green.
- 2026-02-21 [Claude] UI-ONBOARD-001, UI-DASH-001, UI-DASH-002, UI-ONBOARD-002, UI-ONBOARD-003 -- Onboarding shell MVP shipped: dashboard overlay, checklist controller, preferences store, beginner/pro mode. 192 tests, CI green.
- 2026-02-21 [Codex] Doc cleanup pass: Phase 2 capability matrix rows set to Done (Movement, Physics lite, Playtest lifecycle). Production plan S1 reworded.
- 2026-02-21 [Claude] AGENT_STATE.md + AGENT_GUIDE.md: cross-agent coordination scaffold created.

## Phase 3 Priority Chain (Active)

Completed (all Done MVP):
- `UI-ONBOARD-001`, `UI-DASH-001`, `UI-DASH-002`, `UI-ONBOARD-002`, `UI-ONBOARD-003`
- `BEHAV-ROW-001`, `BEHAV-PICK-001`, `BEHAV-DEBUG-001`, `BEHAV-DEBUG-002`
- `UI-VISUAL-001`
- `SPRITE-EDIT-001`, `SPRITE-STYLE-001`, `SPRITE-BRUSH-001`
- `TILE-RULE-001`

Remaining (execute in order):
1. Harden cross-workspace diagnostics with deeper runtime/edit-time coverage beyond current `EDIT_*` and behavior guardrail paths
2. Behavior node graph view (`BEHAV-GRAPH-001`) and code blocks (`BEHAV-CODE-001`)
3. Modular character path follow-up (slot UX polish + occlusion preview + bake pipeline integration)

Each slice requires before marking Done:
- Behavior spec coverage confirmed (or added to `docs/manual/Behavior Specs.md`)
- Capability matrix row status updated
- At least one focused test
- Status Snapshot updated if priority/state changes

## Known Blockers / Risks

None currently.

## Handoff Notes

_Use this section to leave notes for the next agent session._

---

## Update Protocol

Start-of-task write is MANDATORY. End-of-task write is cleanup.

### Before touching any file, write:
```
## Active Task
Spec IDs: <e.g. UI-ONBOARD-001, UI-DASH-001>
Scope files: <list files you will touch>
Non-goals: <explicit list of what you will NOT do>
Acceptance: <how to verify success>
Agent: <Claude | Codex>
Started: <date>
```

### After finishing, replace Active Task with one line:
```
## Active Task
None. Ready for next task.
```
And prepend to Last Completed Work:
```
- <date> [<Agent>] <spec IDs> -- <one-line outcome>
```
Then update governed docs (Status Snapshot + Capability Matrix as needed).

### If interrupted mid-task:
Leave the Active Task block intact with a "Stopped at:" note so the next agent
can resume without re-reading all touched files.

### Fault tolerance rule:
If Active Task block is populated when you start a session, read it and the
listed scope files before doing anything else. Do not assume it is stale.

---

## Claude memory path (not accessible to Codex):
`C:\Users\cresc\.claude\projects\c--Users-cresc-Desktop-Projects-Game-Creation-Tool\memory\MEMORY.md`
