# ADR-004: Playtest Debugger Boundary

Status: Accepted
Last updated: 2026-02-15
Purpose: Record playtest debugger boundary, scope tiers, and runtime contract.

## Context
- The product requires a beginner-friendly but powerful playtest workflow.
- Current Sprint 2 shell has playtest controls, speed, pause, and step.
- We need a clear boundary before implementing breakpoints/watch/state-diff features.

## Decision
- Introduce a dedicated **Playtest Debugger** capability layered on top of runtime simulation.
- Debugger data is sourced from authoritative runtime state, never from UI-only mirrors.
- Breakpoints are event-oriented first (interact/trigger/item/quest state), not arbitrary script line breakpoints in v1.
- Trace payloads are structured records (event/source/entity/state_delta), not free-text only logs.
- Watch panel reads deterministic snapshots from runtime bridge paths (binary where hot, JSON fallback where needed).

## Scope Split
- v1 (MVP):
  - event trace stream with filters
  - play/pause/step controls
  - event breakpoints
  - watch panel for key state (flags/vars/inventory/quest states)
  - state-diff summary between steps
- Tier 1.5:
  - assertions/watchpoints surfaced as actionable issues
- Tier 2:
  - rewind/step-back timeline snapshots

## Runtime Contract
- Playtest loop remains fixed-step (60 Hz target).
- Breakpoint hits pause playtest without desyncing editor state.
- Step operations advance deterministic tick(s) and emit trace entries in-order.
- Trace schema is versioned and stable across minor releases.

## Consequences
- Positive:
  - clearer debugging story for beginners and advanced users
  - deterministic state/debug capture aligns with Preview=Export invariant
  - enables future assertions/watchpoints without redesign
- Tradeoffs:
  - additional runtime instrumentation overhead
  - requires careful buffering/backpressure for trace streams

## Follow-ups
- Add trace event model and schema versioning note in scripting/runtime docs.
- Add benchmark budgets for debugger overhead in playtest mode.
- Add integration tests: breakpoint pause, step determinism, watch panel consistency.






