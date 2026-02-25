# ADR-V2-003: Rhai Scripting -- Phased Integration

## Status
Accepted (2026-02-20)

## Context
v1 chose Rhai as the user-facing scripting language (see legacy ADR-005). Rhai
remains the right choice (pure Rust, WASM-compatible, sandboxed). However,
integrating scripting too early risks:

- Coupling scripts to unstable engine APIs
- Blocking core rebuild on scripting infrastructure
- Breaking scripts when engine contracts change

## Decision
**Retain Rhai** as the long-term scripting language. **Defer integration** until
engine contracts (collision, movement, physics, animation) are stable.

### Phasing
1. **v2 early phases**: No scripting. Use command/event hooks for behavior.
2. **Post-Phase 2**: Define stable scripting API surface from finalized contracts.
3. **Phase 3+**: Introduce Rhai runtime on top of stable engine API.

## Consequences
- Early v2 playtest uses hardcoded behaviors (movement, physics)
- Scripting API designed from stable contracts, not retrofitted
- User-facing scripting documentation deferred
- Legacy Rhai integration code is reference-only

