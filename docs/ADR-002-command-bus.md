# ADR-002: Command Bus and Undo Policy

Status: Accepted
Last updated: 2026-02-15
Purpose: Record command bus and undo/redo policy decisions for all state mutations.

- All mutations must route through Command Bus.
- Heavy edits use BatchCommand with compact before/after deltas.
- Undo model: context-scoped stacks + global project settings history.
- Redo defaults: Ctrl+Y (Win/Linux), Cmd+Shift+Z (macOS).
