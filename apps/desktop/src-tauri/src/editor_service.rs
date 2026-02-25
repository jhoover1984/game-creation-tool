use std::sync::Mutex;

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

use engine_core::{
    AnimationClip, AnimationClipAsset, AnimationComponent, AnimationGraphAsset,
    AnimationTransition, LoopMode, TransitionCondition,
};

use crate::editor_runtime::EditorRuntime;
use crate::editor_session::EditorContext;
use script_core::ScriptGraph;

static RUNTIME: Lazy<Mutex<EditorRuntime>> = Lazy::new(|| Mutex::new(EditorRuntime::default()));

#[cfg(test)]
static TEST_GUARD: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PositionDto {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EntityDto {
    pub id: u64,
    pub name: String,
    pub position: PositionDto,
    #[serde(default)]
    pub components: engine_core::EntityComponents,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sprite_preview: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EditorStateResponse {
    #[serde(rename = "projectName")]
    pub project_name: String,
    pub entities: Vec<EntityDto>,
    pub tiles: Vec<TileDto>,
    pub selection: Vec<u64>,
    pub can_undo: bool,
    pub can_redo: bool,
    pub playtest: PlaytestStateDto,
    pub playtest_trace: Vec<PlaytestTraceEventDto>,
    pub watch_selected_entity: Option<EntityDto>,
    pub watch_flags: Vec<WatchFlagDto>,
    pub watch_variables: Vec<WatchNumberDto>,
    pub watch_inventory: Vec<WatchUnsignedDto>,
    pub watch_scene_flags: Vec<WatchFlagDto>,
    pub watch_scene_variables: Vec<WatchNumberDto>,
    pub watch_selected_flags: Vec<WatchFlagDto>,
    pub watch_selected_variables: Vec<WatchNumberDto>,
    pub watch_selected_inventory: Vec<WatchUnsignedDto>,
    pub playtest_breakpoints: Vec<WatchFlagDto>,
    pub last_breakpoint_hit: Option<PlaytestTraceEventDto>,
    pub script_loaded: bool,
    pub camera_x: f32,
    pub camera_y: f32,
    pub camera_mode: String,
    pub transition_active: bool,
    pub transition_opacity: f32,
    pub tile_previews: std::collections::HashMap<u16, String>,
    pub sprite_registry: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MoveRequest {
    pub id: u64,
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TileDto {
    pub x: i32,
    pub y: i32,
    pub tile_id: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TilePointRequest {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlaytestStateDto {
    pub active: bool,
    pub paused: bool,
    pub speed: f32,
    pub frame: u64,
    pub trace_enabled: bool,
    #[serde(rename = "lastTickDeltaMs")]
    pub last_tick_delta_ms: u32,
    #[serde(rename = "lastTickSteps")]
    pub last_tick_steps: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PlaytestTraceEventDto {
    pub seq: u64,
    pub frame: u64,
    pub kind: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WatchFlagDto {
    pub key: String,
    pub value: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WatchNumberDto {
    pub key: String,
    pub value: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WatchUnsignedDto {
    pub key: String,
    pub value: u32,
}

#[cfg(test)]
pub fn reset_runtime() {
    if let Ok(mut runtime) = RUNTIME.lock() {
        *runtime = EditorRuntime::default();
    }
}

#[cfg(test)]
pub fn test_lock() -> std::sync::MutexGuard<'static, ()> {
    TEST_GUARD.lock().expect("test lock poisoned")
}

pub fn get_editor_state() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| Ok(snapshot(runtime)))
}

pub fn create_map_entity(
    name: String,
    x: i32,
    y: i32,
    prefab_id: Option<String>,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        if let Some(prefab_id) = prefab_id {
            runtime
                .create_map_entity_from_prefab(&prefab_id, x, y, Some(name))
                .map_err(|e| e.to_string())?;
        } else {
            runtime
                .create_map_entity(name, engine_core::Position { x, y })
                .map_err(|e| e.to_string())?;
        }
        Ok(snapshot(runtime))
    })
}

pub fn import_sprite(name: String, data_url: String) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.import_sprite(name, data_url);
        Ok(snapshot(runtime))
    })
}

pub fn rename_map_entity(id: u64, name: String) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .rename_map_entity(id, name)
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn move_map_entity(id: u64, x: i32, y: i32) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .move_map_entity(id, engine_core::Position { x, y })
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn batch_move_map_entities(moves: Vec<MoveRequest>) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        let mapped = moves
            .into_iter()
            .map(|m| (m.id, engine_core::Position { x: m.x, y: m.y }))
            .collect::<Vec<_>>();
        runtime
            .batch_move_map_entities(mapped)
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn delete_map_entities(ids: Vec<u64>) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .delete_map_entities(ids)
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn reset_map() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.reset_map();
        Ok(snapshot(runtime))
    })
}

pub fn undo_map() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.session_mut().set_active_context(EditorContext::Map);
        runtime.undo_active_context().map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn redo_map() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.session_mut().set_active_context(EditorContext::Map);
        runtime.redo_active_context().map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn reselect_map_previous() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.session_mut().set_active_context(EditorContext::Map);
        let _ = runtime.reselect_previous();
        Ok(snapshot(runtime))
    })
}

pub fn select_map_entities(ids: Vec<u64>) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.session_mut().set_active_context(EditorContext::Map);
        let _ = runtime.set_map_selection(ids);
        Ok(snapshot(runtime))
    })
}

pub fn paint_map_tile(x: i32, y: i32, tile_id: u16) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .paint_map_tile(x, y, tile_id)
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn paint_map_tiles(
    points: Vec<TilePointRequest>,
    tile_id: u16,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .paint_map_tiles(points.into_iter().map(|p| (p.x, p.y)).collect(), tile_id)
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn fill_map_tiles(
    x: i32,
    y: i32,
    tile_id: u16,
    canvas_cols: i32,
    canvas_rows: i32,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .fill_map_tiles(x, y, tile_id, canvas_cols, canvas_rows)
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn erase_map_tile(x: i32, y: i32) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.erase_map_tile(x, y).map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn erase_map_tiles(points: Vec<TilePointRequest>) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .erase_map_tiles(points.into_iter().map(|p| (p.x, p.y)).collect())
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn enter_playtest() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.enter_playtest();
        Ok(snapshot(runtime))
    })
}

pub fn exit_playtest() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.exit_playtest();
        Ok(snapshot(runtime))
    })
}

pub fn toggle_playtest_pause() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.toggle_playtest_pause();
        Ok(snapshot(runtime))
    })
}

pub fn step_playtest_frame() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.step_playtest_frame();
        Ok(snapshot(runtime))
    })
}

pub fn set_playtest_speed(speed: f32) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.set_playtest_speed(speed);
        Ok(snapshot(runtime))
    })
}

pub fn set_playtest_trace(enabled: bool) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.set_playtest_trace_enabled(enabled);
        Ok(snapshot(runtime))
    })
}

pub fn set_playtest_breakpoints(kinds: Vec<String>) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.set_playtest_breakpoints(kinds);
        Ok(snapshot(runtime))
    })
}

pub fn playtest_key_down(key: engine_core::KeyCode) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.playtest_key_down(key);
        Ok(snapshot(runtime))
    })
}

pub fn playtest_key_up(key: engine_core::KeyCode) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.playtest_key_up(key);
        Ok(snapshot(runtime))
    })
}

pub fn set_physics_config(
    gravity: f32,
    friction: f32,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.set_physics_config(engine_core::PhysicsConfig { gravity, friction });
        Ok(snapshot(runtime))
    })
}

pub fn set_camera_mode(mode: engine_core::CameraMode) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.set_camera_mode(mode);
        Ok(snapshot(runtime))
    })
}

pub fn set_project_name(name: String) {
    let _ = with_runtime(|runtime| {
        runtime.set_project_name(name);
        Ok(())
    });
}

/// Load persisted editor state (entities + tiles) into the runtime.
/// Called when opening a project that has a saved editor-state.json.
pub fn load_authored_state(
    project_name: String,
    entities: Vec<(String, i32, i32, Option<engine_core::EntityComponents>)>,
    tiles: Vec<(i32, i32, u16)>,
    prefabs: Vec<(String, String, engine_core::EntityComponents)>,
    animation_clip_assets: Vec<AnimationClipAsset>,
    animation_graph_assets: Vec<AnimationGraphAsset>,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.reset_map();
        runtime.set_project_name(project_name);
        let mut prefab_library = engine_core::PrefabLibrary::new();
        for (id, name, default_components) in prefabs {
            prefab_library.insert(
                engine_core::EntityPrefab::new(id, name).with_components(default_components),
            );
        }
        runtime.replace_prefab_library(prefab_library);
        let mut clip_library = engine_core::AnimationClipAssetLibrary::new();
        for clip in animation_clip_assets {
            clip_library.insert(clip);
        }
        let mut graph_library = engine_core::AnimationGraphAssetLibrary::new();
        for graph in animation_graph_assets {
            graph_library.insert(graph);
        }
        runtime.replace_animation_asset_libraries(clip_library, graph_library);
        for (name, x, y, components) in entities {
            if let Ok(id) = runtime.create_map_entity(name, engine_core::Position { x, y }) {
                if let Some(components) = components {
                    let _ = runtime.set_entity_components(id, components);
                }
            }
        }
        for (x, y, tile_id) in tiles {
            let _ = runtime.paint_map_tile(x, y, tile_id);
        }
        // Clear undo history after load so the initial state is clean.
        runtime.reset_undo_history();
        Ok(snapshot(runtime))
    })
}

/// Serialize current editor state as a JSON value for persistence.
/// Includes entity script graphs under an `entity_graphs` key (entity_id → ScriptGraph).
pub fn serialize_editor_state() -> Result<serde_json::Value, String> {
    with_runtime(|runtime| {
        let snap = snapshot(runtime);
        let mut value = serde_json::to_value(&snap).map_err(|e| e.to_string())?;
        // Serialize entity graphs with string keys (JSON objects require string keys).
        let graphs_map: std::collections::HashMap<String, &script_core::ScriptGraph> = runtime
            .entity_graphs()
            .iter()
            .map(|(id, g)| (id.to_string(), g))
            .collect();
        let graphs_value = serde_json::to_value(&graphs_map).map_err(|e| e.to_string())?;
        if let serde_json::Value::Object(ref mut map) = value {
            map.insert("entity_graphs".to_string(), graphs_value);
            map.insert(
                "prefabs".to_string(),
                serde_json::to_value(prefab_snapshot(runtime)).map_err(|e| e.to_string())?,
            );
            map.insert(
                "animation_assets".to_string(),
                serde_json::to_value(animation_asset_snapshot(runtime))
                    .map_err(|e| e.to_string())?,
            );
        }
        Ok(value)
    })
}

// ── Component queries ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ComponentsDto {
    pub entity_id: u64,
    pub collision: Option<CollisionBoxDto>,
    pub sprite: Option<SpriteDto>,
    pub has_movement: bool,
    pub has_velocity: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CollisionBoxDto {
    pub offset_x: i32,
    pub offset_y: i32,
    pub width: u32,
    pub height: u32,
    pub solid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SpriteDto {
    pub asset_id: String,
    pub frame: u32,
}

pub fn get_entity_components(entity_id: u64) -> Result<ComponentsDto, String> {
    with_runtime(|runtime| {
        let components = runtime.component_store().get(entity_id);
        Ok(ComponentsDto {
            entity_id,
            collision: components.and_then(|c| {
                c.collision.as_ref().map(|col| CollisionBoxDto {
                    offset_x: col.offset_x,
                    offset_y: col.offset_y,
                    width: col.width,
                    height: col.height,
                    solid: col.solid,
                })
            }),
            sprite: components.and_then(|c| {
                c.sprite.as_ref().map(|s| SpriteDto {
                    asset_id: s.asset_id.clone(),
                    frame: s.frame,
                })
            }),
            has_movement: components.map_or(false, |c| c.movement.is_some()),
            has_velocity: components.map_or(false, |c| c.velocity.is_some()),
        })
    })
}

pub fn set_entity_components(
    entity_id: u64,
    components: engine_core::EntityComponents,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .set_entity_components(entity_id, components)
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn tick_playtest(delta_ms: u32) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        let _ = runtime.tick_playtest(delta_ms);
        Ok(snapshot(runtime))
    })
}

pub fn load_script_graph(graph: &ScriptGraph) -> Result<ScriptLoadResponse, String> {
    with_runtime(|runtime| {
        let report = graph.validate();
        if !report.is_valid() {
            return Err(format!(
                "script graph has {} validation error(s)",
                report.errors.len()
            ));
        }
        let events = runtime.load_script_graph(graph);
        Ok(ScriptLoadResponse {
            registered_events: events,
            state: snapshot(runtime),
        })
    })
}

pub fn unload_script_graph() -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.unload_script_graph();
        Ok(snapshot(runtime))
    })
}

/// Attach a ScriptGraph to a specific entity by numeric ID.
pub fn attach_entity_graph(
    entity_id: engine_core::EntityId,
    graph: script_core::ScriptGraph,
) -> Result<EntityGraphAttachResponse, String> {
    with_runtime(|runtime| {
        let registered = runtime.attach_entity_graph(entity_id, graph)?;
        Ok(EntityGraphAttachResponse {
            entity_id,
            registered_events: registered,
            state: snapshot(runtime),
        })
    })
}

/// Detach and discard any ScriptGraph attached to the given entity.
pub fn detach_entity_graph(entity_id: engine_core::EntityId) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.detach_entity_graph(entity_id);
        Ok(snapshot(runtime))
    })
}

/// Return the authored ScriptGraph for the given entity, if one exists.
pub fn get_entity_graph(entity_id: engine_core::EntityId) -> Result<Option<script_core::ScriptGraph>, String> {
    with_runtime(|runtime| Ok(runtime.get_entity_graph(entity_id).cloned()))
}

/// Return all entity runtime state strings (entity_id → state).
pub fn get_entity_states() -> Result<std::collections::HashMap<engine_core::EntityId, String>, String> {
    with_runtime(|runtime| Ok(runtime.entity_states().clone()))
}

pub fn fire_script_event(event_name: &str) -> Result<ScriptFireEventResponse, String> {
    with_runtime(|runtime| {
        let result = runtime.fire_script_event(event_name);
        Ok(ScriptFireEventResponse {
            effects_count: result.effects.len(),
            nodes_visited: result.nodes_visited,
            state: snapshot(runtime),
        })
    })
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScriptLoadResponse {
    pub registered_events: Vec<String>,
    pub state: EditorStateResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EntityGraphAttachResponse {
    pub entity_id: engine_core::EntityId,
    pub registered_events: Vec<String>,
    pub state: EditorStateResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScriptFireEventResponse {
    pub effects_count: usize,
    pub nodes_visited: Vec<String>,
    pub state: EditorStateResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SceneDto {
    pub id: String,
    pub name: String,
    pub spawn_point_count: usize,
    pub entity_count: usize,
    pub tile_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SpawnPointDto {
    pub name: String,
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SceneListResponse {
    pub scenes: Vec<SceneDto>,
    pub active_scene_id: Option<String>,
    pub active_playtest_scene: Option<String>,
    pub state: EditorStateResponse,
}

// ── Prefab management ────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PrefabDto {
    pub id: String,
    pub name: String,
    pub default_components: engine_core::EntityComponents,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PrefabListResponse {
    pub prefabs: Vec<PrefabDto>,
}

fn prefab_snapshot(runtime: &EditorRuntime) -> PrefabListResponse {
    PrefabListResponse {
        prefabs: runtime
            .prefab_library()
            .list()
            .into_iter()
            .map(|p| PrefabDto {
                id: p.id.clone(),
                name: p.name.clone(),
                default_components: p.default_components.clone(),
            })
            .collect(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnimationAssetListResponse {
    pub clips: Vec<AnimationClipAsset>,
    pub graphs: Vec<AnimationGraphAsset>,
}

fn animation_asset_snapshot(runtime: &EditorRuntime) -> AnimationAssetListResponse {
    AnimationAssetListResponse {
        clips: runtime
            .animation_clip_assets()
            .list()
            .into_iter()
            .cloned()
            .collect(),
        graphs: runtime
            .animation_graph_assets()
            .list()
            .into_iter()
            .cloned()
            .collect(),
    }
}

pub fn animation_asset_list() -> Result<AnimationAssetListResponse, String> {
    with_runtime(|runtime| Ok(animation_asset_snapshot(runtime)))
}

pub fn animation_asset_clip_upsert(
    clip: AnimationClipAsset,
) -> Result<AnimationAssetListResponse, String> {
    with_runtime(|runtime| {
        runtime.animation_clip_asset_upsert(clip);
        Ok(animation_asset_snapshot(runtime))
    })
}

pub fn animation_asset_clip_delete(id: String) -> Result<AnimationAssetListResponse, String> {
    with_runtime(|runtime| {
        runtime.animation_clip_asset_delete(&id)?;
        Ok(animation_asset_snapshot(runtime))
    })
}

pub fn animation_asset_graph_upsert(
    graph: AnimationGraphAsset,
) -> Result<AnimationAssetListResponse, String> {
    with_runtime(|runtime| {
        runtime.animation_graph_asset_upsert(graph);
        Ok(animation_asset_snapshot(runtime))
    })
}

pub fn animation_asset_graph_delete(id: String) -> Result<AnimationAssetListResponse, String> {
    with_runtime(|runtime| {
        runtime.animation_graph_asset_delete(&id)?;
        Ok(animation_asset_snapshot(runtime))
    })
}

pub fn prefab_create(
    id: String,
    name: String,
    components: engine_core::EntityComponents,
) -> Result<PrefabListResponse, String> {
    with_runtime(|runtime| {
        runtime.prefab_create(id, name, components)?;
        Ok(prefab_snapshot(runtime))
    })
}

pub fn prefab_update(
    id: String,
    name: Option<String>,
    components: Option<engine_core::EntityComponents>,
) -> Result<PrefabListResponse, String> {
    with_runtime(|runtime| {
        runtime.prefab_update(&id, name, components)?;
        Ok(prefab_snapshot(runtime))
    })
}

pub fn prefab_list() -> Result<PrefabListResponse, String> {
    with_runtime(|runtime| Ok(prefab_snapshot(runtime)))
}

pub fn prefab_delete(id: String) -> Result<PrefabListResponse, String> {
    with_runtime(|runtime| {
        runtime.prefab_delete(&id)?;
        Ok(prefab_snapshot(runtime))
    })
}

pub fn create_entity_from_prefab(
    prefab_id: String,
    x: i32,
    y: i32,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime
            .create_map_entity_from_prefab(&prefab_id, x, y, None)
            .map_err(|e| e.to_string())?;
        Ok(snapshot(runtime))
    })
}

pub fn spawn_entity(prefab_id: String, x: i32, y: i32) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.spawn_entity_from_prefab_direct(&prefab_id, x, y)?;
        Ok(snapshot(runtime))
    })
}

pub fn despawn_entity(entity_id: u64) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.despawn_entity_direct(entity_id)?;
        Ok(snapshot(runtime))
    })
}

// ── Animation ────────────────────────────────────────────────────────

/// DTO for a single animation clip received from the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationClipDto {
    pub frames: Vec<u16>,
    pub frame_duration_ticks: u32,
    #[serde(default)]
    pub loop_mode: LoopModeDto,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LoopModeDto {
    #[default]
    Loop,
    Once,
    PingPong,
}

/// DTO for a single animation transition rule.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationTransitionDto {
    pub from_state: String,
    pub to_state: String,
    pub condition: AnimationConditionDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnimationBindingResponse {
    pub entity_id: u64,
    pub graph_asset_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum AnimationConditionDto {
    FlagSet { flag: String },
    FlagSetForTicks { flag: String, min_ticks: u32 },
    IntGte { key: String, value: i32 },
    IntLte { key: String, value: i32 },
    IntGt { key: String, value: i32 },
    IntLt { key: String, value: i32 },
    IntEq { key: String, value: i32 },
    IntBetween { key: String, min: i32, max: i32 },
    ClipFinished,
    Never,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnimationBoolParamDto {
    pub key: String,
    pub value: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnimationIntParamDto {
    pub key: String,
    pub value: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnimationTriggerDto {
    pub key: String,
}

impl From<LoopModeDto> for LoopMode {
    fn from(dto: LoopModeDto) -> Self {
        match dto {
            LoopModeDto::Loop => LoopMode::Loop,
            LoopModeDto::Once => LoopMode::Once,
            LoopModeDto::PingPong => LoopMode::PingPong,
        }
    }
}

impl From<AnimationConditionDto> for TransitionCondition {
    fn from(dto: AnimationConditionDto) -> Self {
        match dto {
            AnimationConditionDto::FlagSet { flag } => TransitionCondition::FlagSet { flag },
            AnimationConditionDto::FlagSetForTicks { flag, min_ticks } => {
                TransitionCondition::FlagSetForTicks { flag, min_ticks }
            }
            AnimationConditionDto::IntGte { key, value } => {
                TransitionCondition::IntGte { key, value }
            }
            AnimationConditionDto::IntLte { key, value } => {
                TransitionCondition::IntLte { key, value }
            }
            AnimationConditionDto::IntGt { key, value } => {
                TransitionCondition::IntGt { key, value }
            }
            AnimationConditionDto::IntLt { key, value } => {
                TransitionCondition::IntLt { key, value }
            }
            AnimationConditionDto::IntEq { key, value } => {
                TransitionCondition::IntEq { key, value }
            }
            AnimationConditionDto::IntBetween { key, min, max } => {
                TransitionCondition::IntBetween { key, min, max }
            }
            AnimationConditionDto::ClipFinished => TransitionCondition::ClipFinished,
            AnimationConditionDto::Never => TransitionCondition::Never,
        }
    }
}

/// Add or replace an animation clip on the entity's `AnimationComponent`.
/// Creates the component with the clip as the initial state if it does not exist.
pub fn animation_add_clip(
    entity_id: u64,
    clip_name: String,
    clip_dto: AnimationClipDto,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        let clip = AnimationClip::new(
            clip_dto.frames,
            clip_dto.frame_duration_ticks,
            clip_dto.loop_mode.into(),
        );
        if let Some(anim) = runtime.component_store_mut().animation_mut(entity_id) {
            anim.clips.insert(clip_name, clip);
        } else {
            let anim = AnimationComponent::new(clip_name, clip);
            runtime.component_store_mut().set_animation(entity_id, anim);
        }
        Ok(snapshot(runtime))
    })
}

/// Switch an entity's animation to a named state (clip).
pub fn animation_set_state(
    entity_id: u64,
    state_name: String,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        let anim = runtime
            .component_store_mut()
            .animation_mut(entity_id)
            .ok_or_else(|| format!("entity {entity_id} has no AnimationComponent"))?;
        if !anim.set_state(&state_name) {
            return Err(format!("animation state '{state_name}' not found on entity {entity_id}"));
        }
        Ok(snapshot(runtime))
    })
}

/// Replace all transitions on an entity's animation component.
pub fn animation_set_transitions(
    entity_id: u64,
    transitions: Vec<AnimationTransitionDto>,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        let anim = runtime
            .component_store_mut()
            .animation_mut(entity_id)
            .ok_or_else(|| format!("entity {entity_id} has no AnimationComponent"))?;
        anim.transitions = transitions
            .into_iter()
            .map(|t| AnimationTransition {
                from_state: t.from_state,
                to_state: t.to_state,
                condition: t.condition.into(),
            })
            .collect();
        Ok(snapshot(runtime))
    })
}

/// Bind an entity animation component to a reusable graph asset.
pub fn animation_bind_graph(
    entity_id: u64,
    graph_asset_id: String,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.bind_entity_animation_graph(entity_id, graph_asset_id)?;
        Ok(snapshot(runtime))
    })
}

/// Unbind reusable graph asset from an entity animation component.
pub fn animation_unbind_graph(entity_id: u64) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.unbind_entity_animation_graph(entity_id)?;
        Ok(snapshot(runtime))
    })
}

/// Query current graph-asset binding for an entity animation component.
pub fn animation_get_binding(entity_id: u64) -> Result<AnimationBindingResponse, String> {
    with_runtime(|runtime| {
        Ok(AnimationBindingResponse {
            entity_id,
            graph_asset_id: runtime.get_entity_animation_graph_binding(entity_id),
        })
    })
}

/// Set a typed bool animator parameter.
pub fn animation_set_bool_param(
    key: String,
    value: bool,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.set_animation_bool_param(key, value);
        Ok(snapshot(runtime))
    })
}

/// Set a typed int animator parameter.
pub fn animation_set_int_param(
    key: String,
    value: i32,
) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.set_animation_int_param(key, value);
        Ok(snapshot(runtime))
    })
}

/// Fire a one-shot animator trigger.
pub fn animation_fire_trigger(key: String) -> Result<EditorStateResponse, String> {
    with_runtime(|runtime| {
        runtime.fire_animation_trigger(key);
        Ok(snapshot(runtime))
    })
}

// ── Scene management ────────────────────────────────────────────────

pub fn add_scene(id: String, name: String) -> Result<SceneListResponse, String> {
    with_runtime(|runtime| {
        let scene = engine_core::Scene::new(id, name);
        runtime.add_scene(scene);
        Ok(scene_list_snapshot(runtime))
    })
}

pub fn remove_scene(id: &str) -> Result<SceneListResponse, String> {
    with_runtime(|runtime| {
        runtime.remove_scene(id);
        Ok(scene_list_snapshot(runtime))
    })
}

pub fn set_active_scene(id: &str) -> Result<SceneListResponse, String> {
    with_runtime(|runtime| {
        if !runtime.set_active_scene(id) {
            return Err(format!("scene '{id}' not found"));
        }
        Ok(scene_list_snapshot(runtime))
    })
}

pub fn list_scenes() -> Result<SceneListResponse, String> {
    with_runtime(|runtime| Ok(scene_list_snapshot(runtime)))
}

pub fn add_spawn_point(scene_id: &str, name: String, x: i32, y: i32) -> Result<SceneListResponse, String> {
    with_runtime(|runtime| {
        let scene = runtime
            .scene_collection_mut()
            .get_scene_mut(scene_id)
            .ok_or_else(|| format!("scene '{scene_id}' not found"))?;
        scene.add_spawn_point(name, engine_core::Position { x, y });
        Ok(scene_list_snapshot(runtime))
    })
}

fn scene_list_snapshot(runtime: &EditorRuntime) -> SceneListResponse {
    let collection = runtime.scene_collection();
    let mut scenes: Vec<SceneDto> = collection
        .scenes()
        .values()
        .map(|s| SceneDto {
            id: s.id.clone(),
            name: s.name.clone(),
            spawn_point_count: s.spawn_points.len(),
            entity_count: s.entities.len(),
            tile_count: s.tiles.len(),
        })
        .collect();
    scenes.sort_by(|a, b| a.id.cmp(&b.id));
    SceneListResponse {
        scenes,
        active_scene_id: collection.active_scene_id().map(String::from),
        active_playtest_scene: runtime.active_playtest_scene().map(String::from),
        state: snapshot(runtime),
    }
}

fn with_runtime<T>(f: impl FnOnce(&mut EditorRuntime) -> Result<T, String>) -> Result<T, String> {
    let mut runtime = RUNTIME
        .lock()
        .map_err(|_| "editor runtime lock poisoned".to_string())?;
    f(&mut runtime)
}

fn snapshot(runtime: &EditorRuntime) -> EditorStateResponse {
    let mut entities = runtime
        .map_entities()
        .values()
        .enumerate()
        .map(|(idx, entity)| EntityDto {
            id: entity.id,
            name: entity.name.clone(),
            position: PositionDto {
                x: entity.position.x,
                y: entity.position.y,
            },
            components: runtime
                .component_store()
                .get(entity.id)
                .cloned()
                .unwrap_or_default(),
            sprite_preview: Some(engine_core::generate_entity_svg(idx, &entity.name)),
        })
        .collect::<Vec<_>>();
    entities.sort_by_key(|e| e.id);

    let selection = runtime.session().current_selection().to_vec();
    let mut tiles = runtime
        .map_tiles()
        .iter()
        .map(|((x, y), tile_id)| TileDto {
            x: *x,
            y: *y,
            tile_id: *tile_id,
        })
        .collect::<Vec<_>>();
    tiles.sort_by_key(|t| (t.y, t.x, t.tile_id));

    let tile_previews: std::collections::HashMap<u16, String> = tiles
        .iter()
        .map(|t| t.tile_id)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .map(|id| (id, engine_core::generate_tile_svg(id)))
        .collect();

    let playtest_trace = runtime
        .playtest_trace()
        .iter()
        .map(|event| PlaytestTraceEventDto {
            seq: event.seq,
            frame: event.frame,
            kind: event.kind.clone(),
            message: event.message.clone(),
        })
        .collect::<Vec<_>>();
    let watch_selected_entity = runtime.selected_entity().map(|entity| EntityDto {
        id: entity.id,
        name: entity.name.clone(),
        position: PositionDto {
            x: entity.position.x,
            y: entity.position.y,
        },
        components: runtime
            .component_store()
            .get(entity.id)
            .cloned()
            .unwrap_or_default(),
        sprite_preview: None,
    });
    let mut watch_flags = runtime
        .core_watch_flags()
        .iter()
        .map(|(key, value)| WatchFlagDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    watch_flags.sort_by(|a, b| a.key.cmp(&b.key));
    let mut watch_variables = runtime
        .core_watch_variables()
        .iter()
        .map(|(key, value)| WatchNumberDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    watch_variables.sort_by(|a, b| a.key.cmp(&b.key));
    let mut watch_inventory = runtime
        .core_watch_inventory()
        .iter()
        .map(|(key, value)| WatchUnsignedDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    watch_inventory.sort_by(|a, b| a.key.cmp(&b.key));
    let mut watch_scene_flags = runtime
        .scene_state()
        .flags
        .iter()
        .map(|(key, value)| WatchFlagDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    watch_scene_flags.sort_by(|a, b| a.key.cmp(&b.key));
    let mut watch_scene_variables = runtime
        .scene_state()
        .variables
        .iter()
        .map(|(key, value)| WatchNumberDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    watch_scene_variables.sort_by(|a, b| a.key.cmp(&b.key));
    let mut watch_selected_flags = runtime
        .selected_entity_watch_flags()
        .iter()
        .map(|(key, value)| WatchFlagDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    watch_selected_flags.sort_by(|a, b| a.key.cmp(&b.key));
    let mut watch_selected_variables = runtime
        .selected_entity_watch_variables()
        .iter()
        .map(|(key, value)| WatchNumberDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    watch_selected_variables.sort_by(|a, b| a.key.cmp(&b.key));
    let mut watch_selected_inventory = runtime
        .selected_entity_watch_inventory()
        .iter()
        .map(|(key, value)| WatchUnsignedDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    watch_selected_inventory.sort_by(|a, b| a.key.cmp(&b.key));
    let mut playtest_breakpoints = runtime
        .playtest_breakpoints()
        .iter()
        .map(|(key, value)| WatchFlagDto {
            key: key.clone(),
            value: *value,
        })
        .collect::<Vec<_>>();
    playtest_breakpoints.sort_by(|a, b| a.key.cmp(&b.key));
    let last_breakpoint_hit = runtime
        .last_breakpoint_hit()
        .map(|event| PlaytestTraceEventDto {
            seq: event.seq,
            frame: event.frame,
            kind: event.kind.clone(),
            message: event.message.clone(),
        });

    EditorStateResponse {
        project_name: runtime.project_name().to_string(),
        entities,
        tiles,
        selection,
        can_undo: runtime.map_can_undo(),
        can_redo: runtime.map_can_redo(),
        playtest: PlaytestStateDto {
            active: runtime.playtest_state().active,
            paused: runtime.playtest_state().paused,
            speed: runtime.playtest_state().speed,
            frame: runtime.playtest_state().frame,
            trace_enabled: runtime.playtest_state().trace_enabled,
            last_tick_delta_ms: runtime.playtest_state().last_tick_delta_ms,
            last_tick_steps: runtime.playtest_state().last_tick_steps,
        },
        playtest_trace,
        watch_selected_entity,
        watch_flags,
        watch_variables,
        watch_inventory,
        watch_scene_flags,
        watch_scene_variables,
        watch_selected_flags,
        watch_selected_variables,
        watch_selected_inventory,
        playtest_breakpoints,
        last_breakpoint_hit,
        script_loaded: runtime.has_script_graph(),
        camera_x: runtime.camera_state().x,
        camera_y: runtime.camera_state().y,
        camera_mode: serde_json::to_value(&runtime.camera_state().mode)
            .ok()
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "follow".to_string()),
        transition_active: runtime.transition_state().active,
        transition_opacity: runtime.transition_state().opacity(),
        tile_previews,
        sprite_registry: runtime.sprite_registry().clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn editor_service_supports_create_move_undo_redo() {
        let _guard = test_lock();
        reset_runtime();

        let state =
            create_map_entity("Player".to_string(), 2, 3, None).expect("create");
        assert_eq!(state.entities.len(), 1);
        let id = state.entities[0].id;
        assert_eq!(state.selection, vec![id]);

        let moved = move_map_entity(id, 9, 9).expect("move");
        assert_eq!(moved.entities[0].position, PositionDto { x: 9, y: 9 });

        let undone = undo_map().expect("undo");
        assert_eq!(undone.entities[0].position, PositionDto { x: 2, y: 3 });

        let redone = redo_map().expect("redo");
        assert_eq!(redone.entities[0].position, PositionDto { x: 9, y: 9 });
    }

    #[test]
    fn editor_service_select_entities_filters_invalid_ids() {
        let _guard = test_lock();
        reset_runtime();
        let state =
            create_map_entity("Player".to_string(), 2, 3, None).expect("create");
        let valid = state.entities[0].id;

        let selected = select_map_entities(vec![valid, 999_999]).expect("select");
        assert_eq!(selected.selection, vec![valid]);
    }

    #[test]
    fn editor_service_delete_entities_supports_undo() {
        let _guard = test_lock();
        reset_runtime();

        let first = create_map_entity("A".to_string(), 0, 0, None).expect("create A");
        let a = first.entities[0].id;
        let second = create_map_entity("B".to_string(), 8, 0, None).expect("create B");
        let b = second
            .entities
            .iter()
            .find(|entity| entity.id != a)
            .map(|entity| entity.id)
            .expect("B id");

        let deleted = delete_map_entities(vec![a, b]).expect("delete");
        assert!(deleted.entities.is_empty());
        assert!(deleted.selection.is_empty());

        let restored = undo_map().expect("undo delete");
        assert_eq!(restored.entities.len(), 2);
    }

    #[test]
    fn editor_service_map_reset_clears_entities_tiles_and_history() {
        let _guard = test_lock();
        reset_runtime();

        let created =
            create_map_entity("Starter".to_string(), 8, 12, None).expect("create");
        assert_eq!(created.entities.len(), 1);
        let painted = paint_map_tile(2, 3, 1).expect("paint");
        assert_eq!(painted.tiles.len(), 1);
        assert!(painted.can_undo);

        let reset = reset_map().expect("reset");
        assert!(reset.entities.is_empty());
        assert!(reset.tiles.is_empty());
        assert!(reset.selection.is_empty());
        assert!(!reset.can_undo);
        assert!(!reset.can_redo);
    }

    #[test]
    fn editor_service_paint_erase_tile_supports_undo() {
        let _guard = test_lock();
        reset_runtime();

        let painted = paint_map_tile(2, 3, 1).expect("paint");
        assert_eq!(
            painted.tiles,
            vec![TileDto {
                x: 2,
                y: 3,
                tile_id: 1
            }]
        );

        let erased = erase_map_tile(2, 3).expect("erase");
        assert!(erased.tiles.is_empty());

        let restored = undo_map().expect("undo erase");
        assert_eq!(
            restored.tiles,
            vec![TileDto {
                x: 2,
                y: 3,
                tile_id: 1
            }]
        );
    }

    #[test]
    fn editor_service_paint_tile_batch_undoes_in_single_step() {
        let _guard = test_lock();
        reset_runtime();

        let painted = paint_map_tiles(
            vec![
                TilePointRequest { x: 1, y: 1 },
                TilePointRequest { x: 2, y: 1 },
                TilePointRequest { x: 3, y: 1 },
            ],
            1,
        )
        .expect("paint batch");
        assert_eq!(painted.tiles.len(), 3);

        let undone = undo_map().expect("undo batch");
        assert!(undone.tiles.is_empty());
    }

    #[test]
    fn editor_service_playtest_lifecycle_roundtrip() {
        let _guard = test_lock();
        reset_runtime();

        let started = enter_playtest().expect("enter playtest");
        assert!(started.playtest.active);

        let sped = set_playtest_speed(0.5).expect("speed");
        assert_eq!(sped.playtest.speed, 0.5);

        let paused = toggle_playtest_pause().expect("pause");
        assert!(paused.playtest.paused);

        let stepped = step_playtest_frame().expect("step");
        assert_eq!(stepped.playtest.frame, 1);

        let stopped = exit_playtest().expect("exit");
        assert!(!stopped.playtest.active);
    }

    #[test]
    fn editor_service_tick_playtest_advances_frame() {
        let _guard = test_lock();
        reset_runtime();

        let _ = enter_playtest().expect("enter");
        let ticked = tick_playtest(1000).expect("tick");
        assert!(ticked.playtest.frame >= 59);
    }

    #[test]
    fn editor_service_trace_toggle_emits_trace_records() {
        let _guard = test_lock();
        reset_runtime();

        let _ = enter_playtest().expect("enter");
        let traced = set_playtest_trace(true).expect("enable trace");
        assert!(traced.playtest.trace_enabled);

        let ticked = tick_playtest(250).expect("tick");
        assert!(!ticked.playtest_trace.is_empty());
    }

    #[test]
    fn editor_service_breakpoints_pause_playtest_on_event() {
        let _guard = test_lock();
        reset_runtime();

        let created =
            create_map_entity("Watcher".to_string(), 4, 4, None).expect("create");
        let selected_id = created.entities[0].id;
        let _ = select_map_entities(vec![selected_id]).expect("select");
        let _ = enter_playtest().expect("enter");
        let _ = set_playtest_breakpoints(vec!["item_pickup".to_string()]).expect("breakpoints");

        let ticked = tick_playtest(3000).expect("tick");
        assert!(ticked.playtest.paused);
        assert!(ticked
            .last_breakpoint_hit
            .as_ref()
            .map(|hit| hit.kind.starts_with("breakpoint:"))
            .unwrap_or(false));
        assert!(!ticked.watch_variables.is_empty());
        assert!(!ticked.watch_inventory.is_empty());
        assert!(!ticked.watch_selected_flags.is_empty());
        assert!(!ticked.watch_selected_variables.is_empty());
        assert!(!ticked.watch_selected_inventory.is_empty());
    }
}
