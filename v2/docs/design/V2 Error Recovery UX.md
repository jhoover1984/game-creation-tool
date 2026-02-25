# V2 Error and Recovery UX

## Purpose
Provide consistent error handling that is actionable for users.

## Display Model
1. User-safe message (short and clear).
2. Technical details panel (expandable).
3. Recovery actions (retry, reset scope, report).

## Error Levels
- Info: non-blocking.
- Warning: degraded but usable.
- Error: operation failed; recoverable.
- Fatal: workspace cannot continue without reset.

## Required Behavior
1. No raw stack traces in primary UI text.
2. Preserve unsaved data when possible.
3. Errors emitted in a unified event channel.
4. Every recoverable error includes at least one action.
5. Every diagnostic is assigned a recovery taxonomy category (`topology`, `reference`, `bounds`, `workflow`, `validation`, `runtime`, `interaction`, `persistence`, `unknown`).
6. Tasks are sorted deterministically by severity, then category, then label.

## Telemetry
Capture anonymized error code and context key, not private content.
