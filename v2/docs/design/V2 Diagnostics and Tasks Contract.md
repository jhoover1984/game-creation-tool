# V2 Diagnostics and Tasks Contract

Status: Locked contract model (V2) for consistency across dashboard, editor, and export.

## Purpose
Define one canonical model for diagnostics and tasks so all surfaces render and resolve issues consistently.

## Diagnostic Model
Required fields:
1. `code`: stable machine ID (e.g., `EDIT_TILE_OUT_OF_BOUNDS`)
2. `severity`: `info` | `warning` | `error` | `fatal`
3. `category`: normalized taxonomy bucket
4. `summary`: user-safe short message
5. `details`: optional technical detail block
6. `location`: target reference (entity/node/asset/map path)
7. `fixes[]`: ordered remediation actions
8. `source`: origin (`editor`, `runtime`, `schema`, `semantic`, `export`)
9. `telemetryKey`: optional anonymized analytics key

## Task Model
Required fields:
1. `id`
2. `diagnosticId`
3. `severity`
4. `category`
5. `label`
6. `targetRef`
7. `fixAction` (optional)

## Ordering Rules
1. Sort by severity (descending), then category (ascending), then label (ascending).
2. Ordering must be deterministic for equivalent diagnostic sets.

## Fix Action Rules
1. Each fix action declares deterministic or non-deterministic behavior.
2. Deterministic fixes execute through command bus and are idempotent.
3. Diagnostic removal occurs only after confirmed success.
4. Non-deterministic fixes route user to the correct editor surface.

## Surface Integration
1. Tasks panel consumes task model directly.
2. Dashboard health badges consume diagnostic severity summary.
3. Export preflight consumes same model for blocking/non-blocking issues.
