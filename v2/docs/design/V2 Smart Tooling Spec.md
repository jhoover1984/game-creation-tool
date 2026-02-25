# V2 Smart Tooling Spec

Status: Planned (V2 staged), with deterministic constraints locked.

## Purpose
Define smart tooling capabilities that improve speed and quality while preserving deterministic and explainable behavior.

## Core Principles
1. Smart tools must be deterministic for equivalent inputs.
2. Smart tools must preview changes before apply where practical.
3. Smart tools must emit diagnostics and explain outcomes.
4. Smart tools must remain reversible through undo/redo.

## Capability Set

### 1) Unified Lint + Tasks (In Progress)
1. Cross-domain diagnostics model is shared across map/sprite/animation/story/export.
2. Tasks provide severity, cause, and fix action mapping.

### 2) Deterministic Auto-Fix Chains (Planned)
1. Fix actions can execute safe follow-up fixes in deterministic order.
2. Each step logs result and preserves idempotence guarantees.

### 3) Recipe Dry-Run + Diff Preview (Planned)
1. Recipe preview shows exact assets/data to be changed.
2. Apply phase references preview digest for integrity check.
3. Preview digest rules:
   - preview emits stable digest/hash of candidate change-set
   - apply must include matching digest
   - mismatched digest forces re-preview

### 4) Smart Brushes (Planned)
1. Scatter/tile-safe/cluster-aware brush flows are seedable and repeatable.
2. Brush output is constrained by active style/layer rules.

### 5) Guided Progression Engine (Planned)
1. Welcome checklist and tutorial steps bind to actual editor events.
2. Completion state is explicit and non-destructive.

### 6) Explain-Why Surface (Planned)
1. Every non-trivial warning can expose short "why" details.
2. Debug trace can link failed condition/result paths to fixes.

## Constraints
1. No opaque AI mutation without deterministic replay path.
2. No hidden state that bypasses schemas/behavior specs/contracts.
3. Any smart feature must map to capability rows and tests before "Done."
