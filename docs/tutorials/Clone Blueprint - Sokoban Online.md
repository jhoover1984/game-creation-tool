# Clone Blueprint - Sokoban Online

Last updated: 2026-02-15
Purpose: define a legal-safe, online-reference clone target that is realistic for current sprint scope.

## Target Reference
- Game style: Sokoban (warehouse box-pushing puzzle).
- Core rules source:
  - https://en.wikipedia.org/wiki/Sokoban
  - https://www.sokobanonline.com/help/how-to-play
- Example playable references:
  - https://www.crazygames.com/game/sokoban
  - https://www.games4brains.de/online2.php

## Legal Safety
1. Clone mechanics and interaction rules only.
2. Do not copy specific level layouts, branding, music, or art from proprietary versions.
3. Use internal starter assets and original level designs.

## Why This Is A Strong Fit
1. Works with current tile/entity map pipeline and deterministic playtest loop.
2. Great for no-code graph maturity: movement, collision, push constraints, win conditions.
3. Small scope with high design clarity for onboarding and QA.

## Core Mechanics To Recreate
1. Grid movement (4-direction).
2. Player can push one crate if destination tile is free.
3. Crates cannot be pulled.
4. Walls block player and crate movement.
5. Level completes when all crates rest on goal tiles.
6. Restart and undo should be available.

## Implementation Plan In Game Creator Studio
1. New project:
- Use `Puzzle Starter` template (or `Blank` + puzzle setup).
- Profile: `game_boy` first.

2. Map setup:
- Author walls/floor/goals on a small room grid.
- Place player entity and 2-5 crate entities.

3. Event Graph setup (no-code first):
- `On Input Move` -> `Branch` on direction validity.
- `If next tile empty` -> `Move Player`.
- `If next tile has crate` -> `Branch` on crate-next tile empty:
  - true: `Move Crate`, then `Move Player`
  - false: `Stop`
- After each successful move: `Check Goals Complete`.

4. Win-state logic:
- `If crates_on_goals == crate_count` -> `Set Level Complete` + `Start Dialog/Overlay`.

5. Playtest debugger:
- Breakpoints on `player_move`, `crate_push`, `level_complete`.
- Watch values:
  - `crates_on_goals`
  - `move_count`
  - `last_block_reason`

6. Polish:
- Add starter SFX (`push`, `blocked`, `complete`).
- Add quick level selector for 3 handcrafted levels.

## Acceptance Criteria
1. A first-time user can build and complete one Sokoban level in <= 15 minutes following this doc.
2. No raw script required for base rules.
3. Playtest trace shows clear cause/effect for blocked pushes and completion.
4. Exported HTML5 behavior matches in-editor preview.

## Stretch Goals
1. Move counter and best-score tracker.
2. Undo stack visibility in inspector/history panel.
3. Optional modern puzzle objects (switches/doors) via Event Graph templates.
