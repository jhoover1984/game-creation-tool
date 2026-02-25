# Starter Asset Pack Spec (v1)

Last updated: 2026-02-15
Purpose: define the minimum built-in starter assets and quality bar so new users see recognizable game art immediately.

## Goals
1. A first-time user can start building without drawing from scratch.
2. Starter assets are profile-safe and legally clean.
3. Seeded/generated assets are recognizable at `1x`, and comfortable at `2x`/`4x` preview.

## Scope
- v1 includes baseline packs for:
  - `game_boy`
  - `nes`
  - `snes`
- These are starter packs, not full production packs.

## Pack Contents (Minimum)
Each profile pack ships:
1. Player sprite set:
- `player_idle`
- `player_walk_1`
- `player_walk_2`

2. NPC sprite set:
- `npc_idle`
- `npc_talk`

3. Core environment tiles:
- floor (`floor_plain`)
- wall (`wall_solid`)
- grass (`grass_plain`)
- water (`water_plain`)
- door (`door_closed`, `door_open`)

4. Prop tiles/sprites:
- `tree_small`
- `bush_small`
- `rock_small`
- `crate_small`
- `chest_closed`
- `chest_open`

5. Interaction markers:
- `spawn_marker`
- `trigger_marker`

## Draw Seed Quality Contract
1. Built-in seed presets must map to named silhouettes, not random/noise patterns.
2. Every preset must have a deterministic point list.
3. Presets must be valid in `8x8` draft space and clamp safely on import.
4. Default quick presets should represent useful gameplay props first.

## Implementation Status (Sprint 2)
1. Quick silhouette presets are now exposed in Draw Studio:
- `Tree`
- `Bush`
- `Rock`
2. Legacy layout presets are retained for advanced layout drafting:
- `Cluster`
- `Line`
- `Ring`
3. Default preset fallback has been switched to `tree`.
4. Authored export now uses bundled starter fallback assets (`assets/starter/*.svg`) for known starter IDs before generated placeholders.

## Profile Rules
1. `game_boy`
- 4-shade palette target.
- high-contrast silhouettes only.

2. `nes`
- expanded color budget while keeping strong silhouette readability.

3. `snes`
- richer shading allowed, but starter pack remains intentionally simple.

## Naming and Versioning
1. Asset IDs use stable snake_case names.
2. Pack metadata includes:
- `pack_id`
- `pack_version`
- `profile`
- `asset_count`

3. Pack revisions must be additive or migration-mapped.

## Acceptance Criteria
1. New project templates can spawn with only starter assets and still feel coherent.
2. Draw Seed quick presets create recognizable tree/bush/rock/crate/chest shapes.
3. No starter asset violates active profile constraints.
4. Manual QA can complete first room tutorial without importing external art.
