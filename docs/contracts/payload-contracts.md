# GCS Payload Contracts

Last updated: 2026-02-20

## Purpose
- Define canonical payload shapes shared across frontend/backend/runtime boundaries.
- Prevent contract drift by making IPC/export fields explicit and versioned.

**Status**: Locked for Sprint S5 (2026-02-19 ->)
**Owner**: Team
**Change process**: Edit this file with rationale + migration note, reference in PR, bump schema version if persisted.

---

## 1. Playtest Snapshot (frontend <-> backend IPC)

Shape returned by every playtest invoke command and consumed by `applyEditorResponse` in `app-state.js`.

### `playtest` object

```json
{
  "active": false,
  "paused": false,
  "speed": 1,
  "frame": 0,
  "trace_enabled": false,
  "last_tick_delta_ms": 0,
  "last_tick_steps": 0
}
```

### Camera fields (top-level in `EditorStateResponse`)

```json
{
  "camera_x": 0.0,
  "camera_y": 0.0,
  "camera_mode": "follow"
}
```

### Telemetry fields (top-level in `EditorStateResponse`)

```json
{
  "first_frame_ms": 0,
  "update_delay_ms": 0
}
```

**Source**: `apps/desktop/src-tauri/src/editor_service.rs` (Rust side), `apps/desktop/src/app-state.js:applyEditorResponse` (JS side).

**Locked fields**: All of the above. Adding new fields is non-breaking (additive). Removing or renaming any field requires this doc to be updated with a migration path.

---

## 2. Export Artifact Schema (authored lane)

### `assets/manifest.json`

```json
{
  "schema_version": 1,
  "asset_count": 4,
  "profile": "game_boy",
  "generated_by": "gcs-export-core",
  "assets": [
    {
      "id": "tile_1",
      "kind": "tile",
      "label": "Tile 1",
      "path": "assets/starter/tile_1.svg",
      "source": "starter_pack://tiles/1"
    }
  ]
}
```

`kind` values: `tile`, `entity_sprite`, `audio_clip`, `generated_sprite`.
`source` prefix conventions: `starter_pack://`, `authored://`, `generated://`.

### `metadata.json`

```json
{
  "schema_version": 1,
  "profile": "game_boy",
  "generated_by": "gcs-export-core",
  "audio_bindings": {}
}
```

### `bundle.json`

Top-level shape:
```json
{
  "entities": [],
  "tiles": [],
  "scenes": []
}
```

Entity entry minimum fields: `id`, `name`, `position: { x, y }`, `components: {}`.
Tile entry minimum fields: `id`, `col`, `row`, `tile_id`.

**Source**: `crates/export-core/src/` (Rust), `apps/desktop/scripts/build-sample-game-01.mjs` (test fixture).

**Locked fields**: `schema_version`, `asset_count`, `assets[].id`, `assets[].kind`, `assets[].path`, `assets[].source`. `metadata.json` top-level keys. `bundle.json` top-level arrays.

### `scenes.json` authored snapshot extension

Authored scenes now include flattened per-entity component bags in `snapshot.entity_components`:

```json
{
  "snapshot": {
    "entities": [
      { "id": 7, "name": "Player", "position": { "x": 24, "y": 32 } }
    ],
    "entity_components": {
      "7": {
        "collision": {
          "offset_x": 0,
          "offset_y": 0,
          "width": 8,
          "height": 8,
          "solid": true
        }
      }
    }
  }
}
```

This is the flattened export path for prefab-derived/default component data in authored export mode.

---

## 3. Flake / test.fixme Registry

Active `test.fixme` entries must be listed here. Format:

| ID | File:line | Owner | Issue | Target Sprint | Reason |
|----|-----------|-------|-------|---------------|--------|
| *(none)* | - | - | - | - | - |

**Policy**: An entry stays in this table until the `test.fixme` is removed. Removing a `test.fixme` without a passing test is not allowed.

---

## 4. Race-Condition Policy (standing rule)

All async playtest mutations in `app-state.js` must use the stale-response guard:

```js
const sid = playtestSessionId;
if (isStalePlaytestResponse(sid)) return state;  // pre-await guard
const response = await apiXxx(...);
if (isStalePlaytestResponse(sid)) return state;  // post-await guard
```

`exitPlaytest` must remain a hard barrier:
1. Set `playtestPhase = 'exiting'` and increment `playtestSessionId` synchronously.
2. Set `state.playtest.active = false` and emit `playtest:changed` synchronously (before any `await`).
3. Use `try/finally` to reset `playtestPhase = 'idle'`.

Any new async playtest operation added in future slices must follow this pattern before merge.

---

## 5. Prefab Command Payloads (editor-session API)

Prefab payloads are currently editor-session scoped (runtime/invoke/front-end contract), not persisted artifact schema.

### `map_create` prefab extension

Request now supports optional prefab linkage:

```json
{
  "name": "Slime Custom",
  "x": 10,
  "y": 20,
  "prefabId": "enemy_slime"
}
```

Behavior:
- If `prefabId` is omitted, create behaves as normal map entity creation.
- If `prefabId` is present, prefab default components are applied and `name` is treated as an optional override.

### `prefab_list` / prefab list response

```json
{
  "prefabs": [
    {
      "id": "enemy_slime",
      "name": "Slime",
      "default_components": {}
    }
  ]
}
```

### `prefab_create`

Request:
```json
{
  "id": "enemy_slime",
  "name": "Slime",
  "components": {}
}
```

Response: same shape as `prefab_list`.

### `prefab_update`

Request (partial):
```json
{
  "id": "enemy_slime",
  "name": "Green Slime",
  "components": {}
}
```

Response: same shape as `prefab_list`.

### `prefab_delete`

Request:
```json
{
  "id": "enemy_slime"
}
```

Response: same shape as `prefab_list`.

### `prefab_stamp`

Request:
```json
{
  "prefabId": "enemy_slime",
  "x": 12,
  "y": 34
}
```

Response: `EditorStateResponse` snapshot.

### `entity_set_components`

Request:
```json
{
  "entityId": 7,
  "components": {
    "collision": { "offset_x": 0, "offset_y": 0, "width": 8, "height": 8, "solid": true }
  }
}
```

Response: `EditorStateResponse` snapshot.

**Source**: `apps/desktop/src-tauri/src/editor_service.rs`, `apps/desktop/src-tauri/src/invoke_api.rs`, `apps/desktop/src/project-api.js`.

**S5 guidance**: treat command names and listed field names as frozen unless this contract file is updated with migration notes.

---

## 6. Animation Command Payloads

### `animation_add_clip`

Request:
```json
{
  "entityId": 7,
  "clipName": "walk",
  "clip": {
    "frames": [0, 1, 2, 3],
    "frame_duration_ticks": 2,
    "loop_mode": "loop"
  }
}
```

`clip.loop_mode` values: `"loop"`, `"once"`, `"ping_pong"`.

Response: `EditorStateResponse` snapshot.

### `animation_set_state`

Request:
```json
{
  "entityId": 7,
  "stateName": "idle"
}
```

Switches the entity's active animation clip. Resets playback to frame 0. Returns error if clip name does not exist on the entity.

Response: `EditorStateResponse` snapshot.

### `animation_set_transitions`

Request:
```json
{
  "entityId": 7,
  "transitions": [
    {
      "from_state": "walk",
      "to_state": "idle",
      "condition": { "kind": "flag_set", "flag": "is_stopped" }
    },
    {
      "from_state": "idle",
      "to_state": "run",
      "condition": { "kind": "flag_set_for_ticks", "flag": "is_running", "min_ticks": 6 }
    },
    {
      "from_state": "walk",
      "to_state": "run",
      "condition": { "kind": "int_gte", "key": "speed_tier", "value": 2 }
    },
    {
      "from_state": "run",
      "to_state": "walk",
      "condition": { "kind": "int_between", "key": "speed_tier", "min": 1, "max": 2 }
    },
    {
      "from_state": "idle",
      "to_state": "walk",
      "condition": { "kind": "clip_finished" }
    }
  ]
}
```

`condition.kind` values: `"flag_set"` (requires `flag` field), `"flag_set_for_ticks"` (requires `flag` + `min_ticks`), `"int_gte"`/`"int_lte"`/`"int_gt"`/`"int_lt"`/`"int_eq"` (require `key` + `value`), `"int_between"` (requires `key` + `min` + `max`), `"clip_finished"`, `"never"`.

Response: `EditorStateResponse` snapshot.

### `animation_bind_graph`

Request:
```json
{
  "entityId": 7,
  "graphAssetId": "graph_player"
}
```

Binds an entity animation component to a reusable graph asset.

Response: `EditorStateResponse` snapshot.

### `animation_unbind_graph`

Request:
```json
{
  "entityId": 7
}
```

Removes graph-asset binding from the entity animation component.

Response: `EditorStateResponse` snapshot.

### `animation_get_binding`

Request:
```json
{
  "entityId": 7
}
```

Response:
```json
{
  "entity_id": 7,
  "graph_asset_id": "graph_player"
}
```

### `animation_set_bool_param`

Request:
```json
{
  "key": "is_moving",
  "value": true
}
```

Sets a typed animator boolean parameter for transition evaluation.

Response: `EditorStateResponse` snapshot.

### `animation_set_int_param`

Request:
```json
{
  "key": "speed_tier",
  "value": 2
}
```

Sets a typed animator integer parameter.
Used by integer-threshold transitions such as `int_gte`, `int_lte`, `int_gt`, `int_lt`, `int_eq`, and `int_between`.

Response: `EditorStateResponse` snapshot.

### `animation_fire_trigger`

Request:
```json
{
  "key": "jump_pressed"
}
```

Fires a one-shot animator trigger consumed during transition evaluation.

Response: `EditorStateResponse` snapshot.

### `animation_asset_list`

Request:
```json
{}
```

Response:
```json
{
  "clips": [],
  "graphs": []
}
```

### `animation_asset_clip_upsert`

Request:
```json
{
  "clip": {
    "id": "clip_walk",
    "name": "Walk",
    "frames": [0, 1, 2, 3],
    "frame_duration_ticks": 2,
    "loop_mode": "loop",
    "sprite_sheet_id": "sheet_player"
  }
}
```

Response: same shape as `animation_asset_list`.

### `animation_asset_clip_delete`

Request:
```json
{
  "id": "clip_walk"
}
```

Response: same shape as `animation_asset_list`.

### `animation_asset_graph_upsert`

Request:
```json
{
  "graph": {
    "id": "graph_player",
    "name": "Player Graph",
    "states": { "idle": "clip_idle", "walk": "clip_walk" },
    "transitions": [],
    "default_state": "idle"
  }
}
```

Response: same shape as `animation_asset_list`.

### `animation_asset_graph_delete`

Request:
```json
{
  "id": "graph_player"
}
```

Response: same shape as `animation_asset_list`.

**Source**: `apps/desktop/src-tauri/src/editor_service.rs`, `apps/desktop/src-tauri/src/invoke_api.rs`, `apps/desktop/src/project-api.js`.

---

## Changelog

| Date | Change | Sprint |
|------|--------|--------|
| 2026-02-19 | Initial contract lock. Playtest snapshot, export artifact, flake registry, race-condition policy. | S5 |
| 2026-02-19 | issue#1 resolved: `audio_clip` assets now in manifest. `test.fixme` removed from authored-export.spec.mjs. Flake registry cleared. | S5 |
| 2026-02-19 | Added prefab command payload contract (`prefab_create`, `prefab_update`, `prefab_list`, `prefab_delete`, `prefab_stamp`). | S5 |
| 2026-02-19 | Extended `map_create` contract with optional `prefabId` linkage. | S5 |
| 2026-02-19 | Added authored export `scenes.json.snapshot.entity_components` contract for flattened component bags. | S5 |
| 2026-02-19 | Added `entity_set_components` command contract for per-entity component override editing. | S5 |
| 2026-02-19 | Added animation command contracts (`animation_add_clip`, `animation_set_state`, `animation_set_transitions`, `animation_set_bool_param`, `animation_set_int_param`, `animation_fire_trigger`, `animation_asset_list`, `animation_asset_clip_upsert`, `animation_asset_clip_delete`, `animation_asset_graph_upsert`, `animation_asset_graph_delete`). | S5 |
