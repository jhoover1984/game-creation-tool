# V2 How-To Guides

Status: In Progress  
Purpose: Task-oriented guides mapped to current capability status.

## Build Mode
- `HOW-BUILD-001` Paint/erase tiles
  - Status: In Progress
  - Evidence: `packages/runtime-web/src/project-store.test.ts`
- `HOW-BUILD-002` Create/move/delete entities
  - Status: In Progress
  - Evidence: `packages/runtime-web/src/project-store.test.ts`

## Animate Mode
- `HOW-ANIM-001` Clip playback/transition behavior
  - Status: In Progress
  - Evidence: `packages/runtime-web/src/animation-player.test.ts`
- `HOW-ANIM-002` Studio editing workflows
  - Status: Planned

## Story Mode
- `HOW-STORY-001` Quest graph structural validation
  - Status: In Progress
  - Evidence: `packages/contracts/src/schema-validation.test.ts`
- `HOW-STORY-002` Quest graph semantic validation
  - Status: In Progress
  - Evidence: `packages/contracts/src/semantic-validation.test.ts`
  - Notes: runtime blocks errors, allows warnings.

## Behavior Authoring (Planned)
- `HOW-BEHAV-001` Event rows (Trigger -> Conditions -> Actions)
  - Status: Planned
  - Notes: Beginner-first behavior editing over canonical Behavior IR.
- `HOW-BEHAV-002` Picker/selection-set targeting
  - Status: Planned
  - Notes: Deterministic target filtering (`This Entity`, tag/radius queries, scoped sets).
- `HOW-BEHAV-003` Debug trace ("why it ran/did not run")
  - Status: Planned
  - Notes: Playtest trace for trigger, condition, and action outcomes.

## Effects Mode
- `HOW-FX-001` Lighting/particles/weather authoring
  - Status: Planned

## Test Mode
- `HOW-TEST-001` Play/pause/resume/tick flow
  - Status: In Progress
  - Evidence: `packages/runtime-web/src/playtest-runner.test.ts`

## Export
- `HOW-EXPORT-001` Web export baseline
  - Status: Planned
