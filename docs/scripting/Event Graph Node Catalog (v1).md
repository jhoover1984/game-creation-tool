# Event Graph Node Catalog (v1)

Last updated: 2026-02-18
Purpose: define implementation-ready no-code node inventory, typed ports, and minimum behavior contracts.

## Implementation Status Legend
- **Shipped (S4-EG1)**: implemented in `script-core` and wired in `editor_runtime.rs`
- **Planned**: accepted design, not yet implemented

## Shipped in S4-EG1 (2026-02-18)
- `OnInteract` event trigger — fires via `on_interact` key when player presses ActionA near entity
- `HasItem { item_id }` condition — evaluates against inventory parameter (runtime stays stateless)
- `GiveItem { item_id }` action — emits `ScriptEffect::GiveItem`, applied to playtest inventory
- `RemoveItem { item_id }` action — emits `ScriptEffect::RemoveItem`
- `SetEntityState { entity_id, state }` action — emits `ScriptEffect::SetEntityState` ("open"/"locked"/"hidden")
- `ShowMessage { text }` action — emits `ScriptEffect::ShowMessage`, surfaced as "script_message" trace
- Starter templates: Chest (Give Item), Door (Require Item), NPC (Simple Greeting)


## Type System (v1)
- `exec` (flow trigger)
- `bool`
- `number`
- `string`
- `entity_ref`
- `item_ref`
- `quest_ref`
- `map_ref`

Rules:
1. `exec` ports connect only to `exec` ports.
2. Data ports require exact type match in v1.
3. Validator blocks invalid links and unresolved references.

## Event Nodes
1. `event_on_start`
- Outputs: `exec`

2. `event_on_interact`
- Outputs: `exec`, `entity_ref actor`, `entity_ref target`

3. `event_on_trigger_enter`
- Outputs: `exec`, `entity_ref actor`, `string trigger_id`

4. `event_on_trigger_exit`
- Outputs: `exec`, `entity_ref actor`, `string trigger_id`

5. `event_on_item_pickup`
- Outputs: `exec`, `entity_ref actor`, `item_ref item`

6. `event_on_quest_state_change`
- Outputs: `exec`, `quest_ref quest`, `string new_state`

7. `event_on_dialog_choice`
- Outputs: `exec`, `string dialog_id`, `string choice_id`

## Condition Nodes
1. `cond_has_item`
- Inputs: `item_ref item`
- Outputs: `bool`

2. `cond_flag_is`
- Inputs: `string flag_key`, `bool expected`
- Outputs: `bool`

3. `cond_compare_variable`
- Inputs: `string var_key`, `number value`, `string op`
- Outputs: `bool`

4. `cond_quest_stage_is`
- Inputs: `quest_ref quest`, `string stage`
- Outputs: `bool`

5. `cond_entity_in_area`
- Inputs: `entity_ref entity`, `string area_id`
- Outputs: `bool`

6. `cond_random_chance`
- Inputs: `number percent`
- Outputs: `bool`

## Action Nodes
1. `act_set_flag`
- Inputs: `exec`, `string flag_key`, `bool value`
- Outputs: `exec`

2. `act_set_variable`
- Inputs: `exec`, `string var_key`, `number value`
- Outputs: `exec`

3. `act_give_item`
- Inputs: `exec`, `entity_ref actor`, `item_ref item`
- Outputs: `exec`

4. `act_remove_item`
- Inputs: `exec`, `entity_ref actor`, `item_ref item`
- Outputs: `exec`

5. `act_start_dialog`
- Inputs: `exec`, `string dialog_id`
- Outputs: `exec`

6. `act_set_quest_stage`
- Inputs: `exec`, `quest_ref quest`, `string stage`
- Outputs: `exec`

7. `act_move_entity`
- Inputs: `exec`, `entity_ref entity`, `number x`, `number y`
- Outputs: `exec`

8. `act_play_animation`
- Inputs: `exec`, `entity_ref entity`, `string animation_id`
- Outputs: `exec`

9. `act_play_sfx`
- Inputs: `exec`, `string sfx_id`
- Outputs: `exec`

10. `act_load_map`
- Inputs: `exec`, `map_ref map`
- Outputs: `exec`

11. `act_spawn_entity`
- Inputs: `exec`, `string prefab_id`, `number x`, `number y`
- Outputs: `exec`, `entity_ref spawned`

12. `act_despawn_entity`
- Inputs: `exec`, `entity_ref entity`
- Outputs: `exec`

## Flow Nodes
1. `flow_sequence`
- Inputs: `exec in`
- Outputs: `exec out_a`, `exec out_b`, `exec out_c` (expandable)

2. `flow_branch`
- Inputs: `exec in`, `bool condition`
- Outputs: `exec true`, `exec false`

3. `flow_switch`
- Inputs: `exec in`, `string key`
- Outputs: `exec case_*`, `exec default`

4. `flow_delay`
- Inputs: `exec in`, `number milliseconds`
- Outputs: `exec out`

5. `flow_cooldown_gate`
- Inputs: `exec in`, `number milliseconds`
- Outputs: `exec pass`, `exec blocked`

6. `flow_repeat_n`
- Inputs: `exec in`, `number count`
- Outputs: `exec body`, `exec done`

7. `flow_stop`
- Inputs: `exec in`
- Outputs: none

## Template Mappings (v1)
1. `template_chest_open`
- Node chain:
  - `event_on_interact` -> `flow_branch(cond_has_item?)` (optional) -> `act_give_item` -> `act_set_flag(chest_opened)`

2. `template_locked_door`
- Node chain:
  - `event_on_interact` -> `flow_branch(cond_has_item)` -> `act_set_flag(door_open)` / `act_start_dialog(locked_message)`

3. `template_npc_dialog`
- Node chain:
  - `event_on_interact` -> `act_start_dialog`

4. `template_quest_handoff`
- Node chain:
  - `event_on_dialog_choice` -> `act_set_quest_stage` -> `act_set_flag`

5. `template_sokoban_push_rules`
- Node chain:
  - `event_on_move_input` -> `flow_branch`
  - branch A: `cond_next_tile_walkable` -> `act_move_entity(player)`
  - branch B: `cond_next_tile_has_crate` -> `cond_crate_target_free` -> `act_push_crate` -> `act_move_entity(player)`
  - common tail: `act_check_goals_complete` -> `flow_branch` -> `act_set_flag(level_complete)`

## Debug and Validation Requirements
1. Every node instance must have stable `node_id`.
2. Trace entries must include `node_id`, `kind`, and minimal state delta.
3. Breakpoint targeting must support node-level pause.
4. Validation categories:
- Structural (`missing_node`, `duplicate_edge`, `cycle_detected`)
- Type (`port_type_mismatch`)
- Reference (`missing_item_ref`, `missing_dialog_ref`, `missing_map_ref`)
- Runtime safety (`unbounded_repeat`, `delay_negative`, `cooldown_negative`)
