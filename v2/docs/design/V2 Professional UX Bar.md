# V2 Professional UX Bar

Status: Locked quality bar (V2), with explicit Planned extensions.

## Purpose
Define the minimum professional UX standard for each major surface so implementation quality is consistent and testable.

## Global Bar (Locked)
1. Actions must be discoverable, reversible, and stateful.
2. Errors must be actionable and mapped to Tasks when possible.
3. Loading and command results must produce visible feedback.
4. Keyboard and pointer flows must both be supported for core workflows.
5. Beginner surface defaults must remain uncluttered; advanced controls are collapsed.

## Workspace Bars

### Build (Locked)
1. Tile/entity interactions have immediate visual feedback.
2. Selection and transform behaviors are predictable and undoable.
3. Layer state (visible/locked) is respected in interaction and rendering.

### Sprite (Done MVP -- 2026-02-21)
1. Pixel-safe editing is available as one toggle. (SPRITE-EDIT-001)
2. Palette/style lint is integrated into task workflows. (SPRITE-STYLE-001)
3. Smart brush behavior is deterministic and previewable. (SPRITE-BRUSH-001)

### Animate (In Progress)
1. Clip metadata edit loop is visible and test-backed. (anchor/slot authoring done; full clip timeline planned)
2. Timeline state and preview state never silently desync.
3. Anchor and marker edits are validated with clear feedback. (ANIM-ANCHOR-001-003 done)

### Story (In Progress)
1. Node selection and inspector editing are stable and explicit. (STORY-PANEL-001 done)
2. Semantic issues are surfaced as warnings/errors with fix guidance. (structural editing planned)

### Effects (Done MVP -- 2026-02-22)
1. Presets apply atomically and can be undone. (FX-PRESET-001)
2. Field-driven links are explicit and validated. (FX-FIELD-001)

### Export (Done MVP -- 2026-02-22)
1. Preflight issues are shown before build starts. (EXPORT-PREFLIGHT-001)
2. Build output and provenance are visible in one flow. (EXPORT-BUILD-001)

## Acceptance Policy
1. A workspace is not "Done" unless its UX bar items are represented in behavior specs and capability matrix rows.
2. Any exception must be documented in status snapshot with risk notes.
3. Each workspace bar item must map to at least:
   - one behavior spec ID
   - one capability matrix row
   - one focused test (unit or integration)
