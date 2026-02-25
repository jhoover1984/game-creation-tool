# V2 Scripting Sandbox Policy

## Purpose
Keep scripting deterministic and safe.

## Scope
Applies to gameplay scripting runtime and any future plugin execution.

## Baseline Rules
1. Scripts cannot access arbitrary file system or network.
2. Scripts run with CPU/time budget limits.
3. Script API surface is explicit and versioned.
4. Script effects are logged for debugging.

## Determinism
1. No direct wall-clock access from scripts.
2. Randomness only through engine-provided seeded RNG.

## Failure Handling
1. Script errors do not crash editor process.
2. Failed script call reports structured error and can be disabled per-asset.
