# V2 Manual Reference

Status: In Progress  
Purpose: Reference index for schemas, diagnostics, and behavior IDs.

## Primary References
- Capability status: `docs/architecture/V2 Capability Matrix.md`
- Status snapshot: `docs/status/V2 Status Snapshot.md`
- Drift policy: `docs/governance/Documentation Drift Policy.md`
- Schema policy: `docs/contracts/SCHEMA_GUIDELINES.md`
- Semantic policy: `docs/contracts/SEMANTIC_VALIDATION_RULES.md`

## Contract Schemas (Current)
- `packages/contracts/schema/common.v2.json`
- `packages/contracts/schema/project.v2.json`
- `packages/contracts/schema/map.v2.json`
- `packages/contracts/schema/asset.manifest.v2.json`
- `packages/contracts/schema/story.questGraph.v2.json`
- `packages/contracts/schema/story.conditions.v2.json`
- `packages/contracts/schema/story.effects.v2.json`
- `packages/contracts/schema/story.dialogueTruth.v2.json`
- `packages/contracts/schema/entity.prefabOrInstance.v2.json`
- `packages/contracts/schema/entity.component.v2.json`
- `packages/contracts/schema/entity.component.spriteRenderer.v2.json`
- `packages/contracts/schema/entity.component.animator.v2.json`
- `packages/contracts/schema/entity.component.collider2d.v2.json`
- `packages/contracts/schema/animation.clip.v2.json`
- `packages/contracts/schema/render.materialRef.v2.json`

## Fixtures (Current)
- `packages/contracts/fixtures/project_min.v2.json`
- `packages/contracts/fixtures/map_min.v2.json`
- `packages/contracts/fixtures/entity_min.v2.json`
- `packages/contracts/fixtures/animation_clip_walk.v2.json`
- `packages/contracts/fixtures/story_quest_branch.v2.json`

## Semantic Diagnostics (Current)
- Errors:
  - `QUEST_DUPLICATE_NODE_ID`
  - `QUEST_EDGE_FROM_MISSING`
  - `QUEST_EDGE_TO_MISSING`
  - `QUEST_START_NODE_MISSING`
  - `QUEST_START_NODE_MULTIPLE`
- Warnings:
  - `QUEST_NODE_UNREACHABLE`

## Behavior IDs (Current)
- `QS-*` quickstart flows
- `HOW-*` task guides
- `BUILD-*`, `PLAY-*`, `STORY-*` in `docs/manual/Behavior Specs.md`
- `UI-SELECT-*`, `UI-TRANSFORM-*`, `UI-UNDO-*`, `UI-TASKS-*`, `UI-ONBOARD-*`
- `UI-DASH-*`, `UI-VISUAL-*`
- `ANIM-CLIP-*`, `ANIM-ANCHOR-*`, `ANIM-PANEL-*`
- `BEHAV-*`, `SPRITE-*`, `FX-*`, `EXPORT-*`
