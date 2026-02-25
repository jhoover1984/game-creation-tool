# V2 Determinism Spec

## Purpose
Guarantee replayable simulation results across runs and environments.

## Determinism Invariants
1. Fixed-step simulation for gameplay updates.
2. Stable system order per tick.
3. Stable entity iteration order.
4. Deterministic RNG source (seeded) for gameplay logic.
5. No wall-clock dependent state in simulation.

## Tick Order
1. Input sampling
2. Movement
3. Collision resolution
4. Physics integration
5. Animation step
6. Snapshot publish

## Numeric Rules
1. Use fixed dt for core simulation.
2. Keep floating behavior predictable; avoid mixed precision across paths.
3. If tolerance is required, define per-system epsilon values and test them.

## Replay Contract
A replay record must include:
- initial seed
- simulation config
- ordered input stream by tick

## Validation
1. Golden snapshot tests for N ticks with fixed seed.
2. Rust and TS parity tests must compare deterministic fields.
