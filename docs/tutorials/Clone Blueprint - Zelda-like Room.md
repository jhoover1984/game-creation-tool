# Clone Blueprint - Zelda-like Room

Last updated: 2026-02-15
Purpose: provide a legal-safe, mechanics-first clone target for onboarding and internal quality checks.

## Legal Safety Note
- This blueprint targets gameplay structure and workflow only.
- Do not copy copyrighted names, sprites, tiles, music, dialog, or map layouts 1:1.
- Use original assets (starter packs or custom art) and original naming.

## Target Experience
1. Player can move in a top-down room.
2. One NPC gives dialog.
3. One chest gives a key item.
4. One locked door opens only when key is owned.
5. Player exits room after unlocking/opening door.

## Why This Is A Good First Clone
1. Uses the full v1 North Star loop (map, entities, dialog, inventory, quest flag, playtest, export).
2. Covers common RPG interactions without requiring advanced AI or combat.
3. Fits Game Boy profile constraints cleanly.

## Build Plan In Game Creator Studio
1. Project bootstrap:
- Create new project from `RPG Starter`.
- Profile: `game_boy`.

2. Map authoring:
- Paint one room with collision boundaries.
- Add a door tile region and chest location marker.

3. Entity placement:
- Place `Player` entity.
- Place `NPC` entity near room center.
- Place `Chest` entity.
- Place `Door` entity at room edge.

4. Story setup:
- Add one dialog graph for NPC (`greeting`, `hint about key`).
- Add one line for chest open feedback.

5. Logic graph setup:
- Template `Chest -> Give Item(key)` attached to chest.
- Template `Door -> Require Item(key)` attached to door.
- Add condition branch:
  - If `Has Item(key)` then `Set Door Open` + `Allow Exit`.
  - Else `Show Locked Message`.

6. Playtest/debug:
- Enable breakpoint on `item_pickup` and `interact`.
- Validate watch values: inventory has `key`, door state changes.

7. Export parity:
- Run export preview and parity check.
- Export HTML5 build and verify same behavior.

## Acceptance Criteria
1. Entire loop is completable in under 10 minutes by a first-time user following this doc.
2. No raw script text required for baseline flow.
3. Issues Drawer shows no blockers at export.
4. Playtest trace clearly shows item pickup and door unlock events.

## Stretch Variant (Builder/Pro)
1. Add one enemy patrol with avoidable collision.
2. Add simple quest variable `met_npc_before_open`.
3. Require both conditions:
- `Has Item(key)` and `Flag(met_npc_before_open)`.
