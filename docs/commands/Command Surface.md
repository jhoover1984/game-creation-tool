# Command Surface (Desktop Invoke + CLI)

Last updated: 2026-02-19
Source: `apps/desktop/src-tauri/src/invoke_api.rs`, `apps/desktop/src-tauri/src/main.rs`

## Purpose
- Central reference for command names, payloads, and expected behavior.
- Reduce drift between frontend invoke calls and backend dispatch.

## Project Commands
| Command | Payload | Notes |
| --- | --- | --- |
| `open_project` | `{ "projectDir": string, "applyMigrations"?: boolean }` | Opens project and returns manifest/health/migration report. |
| `save_project` | `{ "projectDir": string, "projectName": string }` | Saves project manifest + health info. |
| `project_health` | `{ "projectDir": string }` | Returns project health warnings/limits. |
| `migrate_project` | `{ "projectDir": string }` | Applies migration pipeline and reports results. |
| `export_preview_html5` | `{ "outputDir": string, "projectDir"?: string, "debug"?: boolean, "profile"?: "game_boy" \| "nes" \| "snes", "editorState"?: object }` | Builds native `export-core` HTML5 preview artifact bundle (`index.html`, `runtime.js`, `scenes.json`, `metadata.json`, `bundle.json`, `assets/manifest.json`) and returns export report counts (`scene_count`, `asset_count`). Invoke path exports authored scene data from live editor state by default (or from optional `editorState` override), emits inferred asset refs in `assets/manifest.json`, and renders packaged assets in the shared export runtime when present. Asset resolution order for authored exports: explicit `editorState` asset paths (`entities[]`, `tiles[]`, `audio[]`/`audioClips[]`) -> `projectDir/assets/manifest.json` mappings (`tile_*`, `entity_*`, `audio_*` and `kind: "audio"` entries) for authored IDs -> project filename conventions (`assets/entities`, `assets/tiles`, `assets/sprites`) -> bundled starter-pack assets (`assets/starter/*.svg`) -> generated placeholders (tile/entity only). Optional scripting audio routing can be provided through `editorState.audioBindings` / `editorState.audioEvents[]`, which are normalized into export `metadata.json` (`audio_bindings`) and consumed by runtime `triggerGameplayEventAudio(...)`. |
## Editor State + Map Commands
| Command | Payload | Notes |
| --- | --- | --- |
| `editor_state` | `{}` | Returns entities, tiles, selection, playtest/watch/trace state, including selected-entity watch buckets. |
| `map_create` | `{ "name": string, "x": number, "y": number, "prefabId"?: string }` | Creates entity and selects it. When `prefabId` is provided, prefab default components are applied and `name` acts as optional override. |
| `map_move` | `{ "id": number, "x": number, "y": number }` | Moves one entity. |
| `map_batch_move` | `{ "moves": [{ "id": number, "x": number, "y": number }] }` | Batch movement in single undo entry. |
| `map_select` | `{ "ids": number[] }` | Selects valid entity IDs only. |
| `map_delete` | `{ "ids": number[] }` | Deletes selected entities in batch command. |
| `map_reset` | `{}` | Clears map entities/tiles/selection and resets map undo/redo history. |
| `map_paint_tile` | `{ "x": number, "y": number, "tileId": number }` | Paint tile cell. |
| `map_paint_tiles` | `{ "points": [{ "x": number, "y": number }], "tileId": number }` | Paint many tile cells as one batch command (single undo entry). |
| `map_erase_tile` | `{ "x": number, "y": number }` | Erase tile cell. |
| `map_erase_tiles` | `{ "points": [{ "x": number, "y": number }] }` | Erase many tile cells as one batch command (single undo entry). |
| `map_undo` | `{}` | Undo in map context. |
| `map_redo` | `{}` | Redo in map context. |
| `map_reselect` | `{}` | Restore previous map selection. |
| `map_rename` | `{ "id": number, "name": string }` | Renames an entity by ID. Name must be non-empty. Not undo-able. |
| `import_sprite` | `{ "name": string, "dataUrl": string }` | Stores a PNG data URL in the in-session sprite registry under the given name. Not persisted to disk. |

## Playtest Commands
| Command | Payload | Notes |
| --- | --- | --- |
| `playtest_enter` | `{}` | Enters playtest mode. |
| `playtest_exit` | `{}` | Exits playtest mode and resets runtime playtest state. |
| `playtest_toggle_pause` | `{}` | Toggles paused state when active. |
| `playtest_step` | `{}` | Advances one frame (paused stepping). |
| `playtest_set_speed` | `{ "speed": number }` | Sets simulation speed multiplier. |
| `playtest_tick` | `{ "deltaMs": number }` | Advances fixed-step simulation adapter. |
| `playtest_set_trace` | `{ "enabled": boolean }` | Enables/disables trace capture. |
| `playtest_key_down` | `{ "key": KeyCode }` | Sends key-down event to input state during playtest. KeyCode uses snake_case serde (e.g. `"arrow_right"`, `"key_z"`). |
| `playtest_key_up` | `{ "key": KeyCode }` | Sends key-up event to input state during playtest. |
| `set_physics_config` | `{ "gravity": number, "friction": number }` | Sets global physics configuration (gravity default 0 for top-down, ~0.4 for platformer). |
| `playtest_set_breakpoints` | `{ "kinds": string[] }` | Configures event breakpoint kinds. |

## Scene Commands
| Command | Payload | Notes |
| --- | --- | --- |
| `scene_add` | `{ "id": string, "name": string }` | Creates a new scene with the given ID and display name. |
| `scene_remove` | `{ "id": string }` | Removes a scene by ID. |
| `scene_set_active` | `{ "id": string }` | Sets the active scene for editing/playtest. |
| `scene_list` | `{}` | Returns list of all scenes in the collection. |
| `scene_add_spawn_point` | `{ "sceneId": string, "name": string, "x": number, "y": number }` | Adds a named spawn point to a scene. |

## Prefab Commands
| Command | Payload | Notes |
| --- | --- | --- |
| `prefab_create` | `{ "id": string, "name": string, "components"?: object }` | Creates a prefab in the runtime prefab library. Returns full prefab list. |
| `prefab_update` | `{ "id": string, "name"?: string, "components"?: object }` | Updates prefab name and/or default components. Returns full prefab list. |
| `prefab_list` | `{}` | Returns all prefabs sorted by ID. |
| `prefab_delete` | `{ "id": string }` | Deletes prefab by ID. Returns full prefab list. |
| `prefab_stamp` | `{ "prefabId": string, "x": number, "y": number }` | Spawns an entity instance at position using prefab default components. Returns editor state snapshot. |

## Script Commands
| Command | Payload | Notes |
| --- | --- | --- |
| `script_validate` | `{ "graph": ScriptGraph }` | Validates scripting graph IR and returns deterministic validation report (`errors[]`). |
| `script_load_graph` | `{ "graph": ScriptGraph }` | Loads a script graph into the playtest runtime for live execution. |
| `script_unload_graph` | `{}` | Unloads the current script graph from playtest runtime. |
| `script_fire_event` | `{ "event": string }` | Fires a named event into the script runtime (e.g. `"playtest_tick"`, `"input_action_a"`). |

## Component Commands
| Command | Payload | Notes |
| --- | --- | --- |
| `entity_get_components` | `{ "entityId": number }` | Returns component bag for entity (collision, sprite, movement, velocity, animation). |
| `entity_set_components` | `{ "entityId": number, "components": object }` | Replaces component bag for entity instance (prefab override path). Not undo-able. |

## Animation Commands
| Command | Payload | Notes |
| --- | --- | --- |
| `animation_add_clip` | `{ "entityId": number, "clipName": string, "clip": { "frames": number[], "frame_duration_ticks": number, "loop_mode": "loop" \| "once" \| "ping_pong" } }` | Adds/replaces a named animation clip on an entity. Creates AnimationComponent if absent. |
| `animation_set_state` | `{ "entityId": number, "stateName": string }` | Switches active animation clip, resets playback to frame 0. Returns error if clip does not exist. |
| `animation_set_transitions` | `{ "entityId": number, "transitions": TransitionRule[] }` | Sets transition rules. Each rule: `{ "from_state": string, "to_state": string, "condition": { "kind": "flag_set" \| "flag_set_for_ticks" \| "int_gte" \| "int_lte" \| "int_gt" \| "int_lt" \| "int_eq" \| "int_between" \| "clip_finished" \| "never", "flag"?: string, "min_ticks"?: number, "key"?: string, "value"?: number, "min"?: number, "max"?: number } }`. |
| `animation_bind_graph` | `{ "entityId": number, "graphAssetId": string }` | Binds entity animation to a reusable graph asset. |
| `animation_unbind_graph` | `{ "entityId": number }` | Removes graph-asset binding from entity animation. |
| `animation_get_binding` | `{ "entityId": number }` | Returns current graph-asset binding for entity animation. |
| `animation_set_bool_param` | `{ "key": string, "value": boolean }` | Sets a typed animator bool parameter used by transition evaluation. |
| `animation_set_int_param` | `{ "key": string, "value": number }` | Sets a typed animator int parameter used by integer-threshold transition kinds (`int_gte`, `int_lte`, `int_gt`, `int_lt`, `int_eq`, `int_between`). |
| `animation_fire_trigger` | `{ "key": string }` | Fires a one-shot animator trigger consumed during transition evaluation. |
| `animation_asset_list` | `{}` | Lists reusable animation clip/graph assets. |
| `animation_asset_clip_upsert` | `{ "clip": AnimationClipAsset }` | Creates/updates a reusable clip asset. |
| `animation_asset_clip_delete` | `{ "id": string }` | Deletes a clip asset by id. |
| `animation_asset_graph_upsert` | `{ "graph": AnimationGraphAsset }` | Creates/updates a reusable graph asset. |
| `animation_asset_graph_delete` | `{ "id": string }` | Deletes a graph asset by id. |

## CLI Equivalents
- Main CLI binary supports matching operations via:
  - direct commands (e.g. `map-create`, `playtest-enter`, `playtest-breakpoints`)
  - export command: `gcs-desktop export-preview <output_dir> [--debug] [--profile game_boy|nes|snes]`
  - generic invoke passthrough: `gcs-desktop invoke <command> <json-payload>`
  - note: CLI `export-preview` currently emits canonical parity scenes; invoke `export_preview_html5` emits authored scene output.

## Runtime Registration
- The same `invoke_command` gateway is now registered in Tauri runtime mode (feature `tauri-runtime`) and exposed through the desktop invoke handler.
- Desktop entrypoint behavior:
  1. With `tauri-runtime` feature and no CLI args: boot Tauri app runtime.
  2. With CLI args: run existing CLI command flow.

## Contract Notes
1. Command names are considered compatibility surface for frontend callers.
2. Payload key casing follows frontend JSON (`camelCase`) where defined.
3. New command additions should update this document and add dispatch tests.
