# Legacy Salvage High-ROI Plan

Status: Active (V2 execution runbook)
Last updated: 2026-02-21

## Purpose
Convert legacy audit findings into a strict, limited salvage sequence that accelerates V2 delivery without reintroducing legacy coupling.

## Scope Rule
Only salvage modules that:
1. Directly improve the locked vertical slice or V2 quality gates.
2. Have clean boundaries and existing tests.
3. Can be adapted behind current V2 contracts.

If a candidate fails any of the above, keep it reference-only.

## Highest-ROI Candidates

### 1) `project-core` storage/recovery patterns
- Source:
  - `crates/project-core/src/storage.rs`
- Why:
  - Atomic save + backup rotation + restore + migration snapshot patterns are already robust and test-backed.
- V2 target:
  - Harden project persistence behavior and recovery UX in `runtime-web` and later Rust parity path.
- Classification:
  - Adapt now.

### 2) `command-core` batch/context history model
- Source:
  - `crates/command-core/src/lib.rs`
- Why:
  - Provides deterministic grouped undo/redo and context scoping.
- V2 target:
  - UI command grouping (paint stroke batching, per-surface history) without changing command contracts.
- Classification:
  - Adapt now.

### 3) `engine-core` collision helpers
- Source:
  - `crates/engine-core/src/collision.rs`
- Why:
  - Dense test coverage for overlap, tile/entity blockers, and collision utility behavior.
- V2 target:
  - Improve playtest collision reliability and future deterministic brush constraints.
- Classification:
  - Adapt targeted functions only.

### 4) Legacy issue-recovery action taxonomy
- Source:
  - `apps/desktop/src/ui-issues-recovery.js`
- Why:
  - Mature issue -> action mapping patterns for safe recovery UX.
- V2 target:
  - Expand `DiagnosticStore`/Tasks panel with clearer remediation categories.
- Classification:
  - Adapt patterns only.

### 5) Legacy playtest controller interaction patterns
- Source:
  - `apps/desktop/src/ui-playtest.js`
- Why:
  - Practical control-state and telemetry flow that maps to current Test mode.
- V2 target:
  - Improve test-mode observability and step lifecycle behavior.
- Classification:
  - Adapt patterns only.

## Deferred (Do Not Pull Now)
1. `export-core` full pipeline:
   - Phase 4 integration after export contracts stabilize.
2. `script-core` full runtime:
   - Bring in once scripting phase starts and interaction slice is stable.
3. `gcs-desktop` service surfaces:
   - Reference-only; too coupled for direct salvage.

## Two-Sprint Sequence

### Sprint S1 (Execution)
1. Persistence hardening slice:
   - Add atomic save + backup/restore behavior in V2-compatible path.
   - Add focused tests for save failure/recovery behavior.
2. Command grouping slice:
   - Introduce batch command abstraction for tile stroke grouping.
   - Verify undo/redo granularity against UI behavior specs.
3. Collision utility parity checks:
   - Add utility parity tests for AABB/blocker helpers against current behavior.

Current progress:
1. Persistence hardening slice: Done.
2. Command grouping slice: Done (batch abstraction in `ProjectStore` plus pointer-lifecycle wiring in shell controller).
3. Collision utility parity checks: Done (parity-focused runner tests added for wall slide and edge-contact behavior).

Exit criteria:
1. CI green.
2. Capability/status docs updated.
3. No cross-boundary coupling regressions.

### Sprint S2 (Execution)
1. Tasks recovery taxonomy uplift:
   - Add standardized remediation labels/categories for common editor failures.
2. Test mode telemetry refinement:
   - Expand interaction/movement tick feedback in shell console.
3. Fixture growth:
   - Add one more authored playable fixture that exercises recovery actions.

Current progress:
1. Tasks recovery taxonomy uplift: Done (diagnostic category taxonomy + deterministic task sorting + category display in Tasks tab).
2. Test mode telemetry refinement: Done (tick summary includes entity/interactions counts and position context in shell console).
3. Fixture growth: Done (`recovery_actions.runtime.json` + runtime smoke test for actionable recovery task generation).

Exit criteria:
1. Playable slice remains stable.
2. Recovery flows are actionable in UI.
3. Determinism-sensitive behavior covered by smoke/unit tests.

## Governance Hooks
Every salvage PR must include:
1. Doc References to this runbook + governing architecture/contracts docs.
2. Change-of-Plan log if adaptation deviates from listed target.
3. Capability matrix/status updates in same PR.

## References
1. `docs/runbooks/Legacy Audit Report.md`
2. `docs/runbooks/Legacy Audit Checklist.md`
3. `docs/roadmap/V2 Rebuild Plan.md`
4. `docs/architecture/V2 Capability Matrix.md`
5. `docs/status/V2 Status Snapshot.md`
