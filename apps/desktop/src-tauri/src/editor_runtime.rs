use std::collections::{HashMap, VecDeque};

use command_core::{BatchCommand, CommandError, ContextCommandBus};
use engine_core::{
    step_animations_with_params, update_camera,
    AnimationClip, AnimationComponent,
    AnimationClipAsset, AnimationClipAssetLibrary, AnimationGraphAsset,
    AnimationGraphAssetLibrary, AnimatorParameters,
    CameraMode, CameraState, ComponentStore, CreateEntityCommand, DeleteEntityCommand, Entity,
    EntityComponents, EntityId, EntityPrefab, EraseTileCommand, InputAction, InputMapping,
    InputState, KeyCode, MapEditorState, MoveEntityCommand, PaintTileCommand, PhysicsConfig,
    Position, PrefabLibrary, Scene, SceneCollection, SceneId, TileId, TransitionEffect,
    TransitionState,
};
use script_core::{ScriptEffect, ScriptGraph, ScriptRuntime, ScriptState, ScriptTickResult, StateScope};

use crate::editor_session::{EditorContext, EditorSession};
use crate::playtest_animation_events::{
    derive_runtime_animation_actions, RuntimeAnimationAction,
};
use crate::playtest_progress::{apply_playtest_progress, ITEM_PICKUP_FRAME_THRESHOLD};
use crate::playtest_step_systems::{process_entity_movement_step, process_entity_physics_step};
use crate::playtest_tick_orchestrator::run_fixed_step_accumulator;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PlaytestState {
    pub active: bool,
    pub paused: bool,
    pub speed: f32,
    pub frame: u64,
    pub trace_enabled: bool,
    pub last_tick_delta_ms: u32,
    pub last_tick_steps: u64,
}

impl Default for PlaytestState {
    fn default() -> Self {
        Self {
            active: false,
            paused: false,
            speed: 1.0,
            frame: 0,
            trace_enabled: false,
            last_tick_delta_ms: 0,
            last_tick_steps: 0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlaytestTraceEvent {
    pub seq: u64,
    pub frame: u64,
    pub kind: String,
    pub message: String,
}

pub struct EditorRuntime {
    session: EditorSession,
    map_state: MapEditorState,
    map_command_bus: ContextCommandBus<MapEditorState, EditorContext>,
    playtest: PlaytestState,
    playtest_accumulator_ms: f64,
    playtest_trace: VecDeque<PlaytestTraceEvent>,
    playtest_trace_seq: u64,
    playtest_breakpoints: HashMap<String, bool>,
    last_breakpoint_hit: Option<PlaytestTraceEvent>,
    core_watch_flags: HashMap<String, bool>,
    core_watch_variables: HashMap<String, i64>,
    core_watch_inventory: HashMap<String, u32>,
    script_runtime: Option<ScriptRuntime>,
    script_state: ScriptState,
    scene_state: ScriptState,
    scene_states: HashMap<String, ScriptState>,
    /// Per-entity compiled script runtimes, keyed by EntityId.
    entity_script_runtimes: HashMap<EntityId, ScriptRuntime>,
    /// Per-entity authored ScriptGraph, kept for persistence and re-compilation.
    entity_script_graphs: HashMap<EntityId, script_core::ScriptGraph>,
    /// Runtime state strings per entity (e.g. "open", "locked", "hidden").
    entity_states: HashMap<EntityId, String>,
    /// Archived per-entity component state for undo/redo restoration.
    archived_components: HashMap<EntityId, EntityComponents>,
    /// Archived per-entity script graphs for undo/redo restoration.
    archived_entity_script_graphs: HashMap<EntityId, script_core::ScriptGraph>,
    /// Archived per-entity runtime state strings for undo/redo restoration.
    archived_entity_states: HashMap<EntityId, String>,
    scene_collection: SceneCollection,
    active_playtest_scene: Option<SceneId>,
    /// Entities created by script spawn effects during playtest. Cleared on exit.
    spawned_entity_pool: Vec<EntityId>,
    component_store: ComponentStore,
    input_state: InputState,
    input_mapping: InputMapping,
    physics_config: PhysicsConfig,
    camera_state: CameraState,
    transition_state: TransitionState,
    pending_scene_transition: Option<(SceneId, Option<String>)>,
    animator_params: AnimatorParameters,
    animation_clip_assets: AnimationClipAssetLibrary,
    animation_graph_assets: AnimationGraphAssetLibrary,
    prefab_library: PrefabLibrary,
    project_name: String,
    sprite_registry: HashMap<String, String>,
}

impl Default for EditorRuntime {
    fn default() -> Self {
        Self {
            session: EditorSession::default(),
            map_state: MapEditorState::default(),
            map_command_bus: ContextCommandBus::default(),
            playtest: PlaytestState::default(),
            playtest_accumulator_ms: 0.0,
            playtest_trace: VecDeque::new(),
            playtest_trace_seq: 0,
            playtest_breakpoints: default_breakpoints(),
            last_breakpoint_hit: None,
            core_watch_flags: default_watch_flags(),
            core_watch_variables: default_watch_variables(),
            core_watch_inventory: default_watch_inventory(),
            script_runtime: None,
            script_state: ScriptState::default(),
            scene_state: ScriptState::default(),
            scene_states: HashMap::new(),
            entity_script_runtimes: HashMap::new(),
            entity_script_graphs: HashMap::new(),
            entity_states: HashMap::new(),
            archived_components: HashMap::new(),
            archived_entity_script_graphs: HashMap::new(),
            archived_entity_states: HashMap::new(),
            scene_collection: SceneCollection::new(),
            active_playtest_scene: None,
            spawned_entity_pool: Vec::new(),
            component_store: ComponentStore::new(),
            input_state: InputState::new(),
            input_mapping: InputMapping::default(),
            physics_config: PhysicsConfig::default(),
            camera_state: CameraState::default(),
            transition_state: TransitionState::default(),
            pending_scene_transition: None,
            animator_params: AnimatorParameters::default(),
            animation_clip_assets: AnimationClipAssetLibrary::new(),
            animation_graph_assets: AnimationGraphAssetLibrary::new(),
            prefab_library: PrefabLibrary::new(),
            project_name: String::from("New Project"),
            sprite_registry: HashMap::new(),
        }
    }
}

impl EditorRuntime {
    pub fn session(&self) -> &EditorSession {
        &self.session
    }

    pub fn session_mut(&mut self) -> &mut EditorSession {
        &mut self.session
    }

    pub fn create_map_entity(
        &mut self,
        name: impl Into<String>,
        position: Position,
    ) -> Result<EntityId, CommandError> {
        self.map_command_bus.execute_in_context(
            EditorContext::Map,
            &mut self.map_state,
            Box::new(CreateEntityCommand::new(name, position)),
        )?;

        let created_id = self
            .map_state
            .entities()
            .keys()
            .max()
            .copied()
            .ok_or_else(|| CommandError::Failed("entity creation did not persist".to_string()))?;
        self.session.set_active_context(EditorContext::Map);
        self.session.set_selection(vec![created_id]);
        Ok(created_id)
    }

    pub fn move_map_entity(
        &mut self,
        entity_id: EntityId,
        to: Position,
    ) -> Result<(), CommandError> {
        self.map_command_bus.execute_in_context(
            EditorContext::Map,
            &mut self.map_state,
            Box::new(MoveEntityCommand::new(entity_id, to)),
        )?;
        self.session.set_active_context(EditorContext::Map);
        self.session.set_selection(vec![entity_id]);
        Ok(())
    }

    pub fn batch_move_map_entities(
        &mut self,
        moves: Vec<(EntityId, Position)>,
    ) -> Result<(), CommandError> {
        let mut batch = BatchCommand::new("batch_move_map_entities");
        let mut selected = Vec::new();
        for (entity_id, to) in moves {
            selected.push(entity_id);
            batch.push(Box::new(MoveEntityCommand::new(entity_id, to)));
        }
        self.map_command_bus.execute_in_context(
            EditorContext::Map,
            &mut self.map_state,
            Box::new(batch),
        )?;
        self.session.set_active_context(EditorContext::Map);
        self.session.set_selection(selected);
        Ok(())
    }

    pub fn rename_map_entity(
        &mut self,
        entity_id: EntityId,
        name: impl Into<String>,
    ) -> Result<(), CommandError> {
        let entities = self.map_state.entities_mut();
        let entity = entities
            .get_mut(&entity_id)
            .ok_or_else(|| CommandError::Failed(format!("entity {} not found", entity_id)))?;
        entity.name = name.into();
        Ok(())
    }

    /// Replace the component bag for an entity instance.
    /// This is the per-entity override path for prefab-derived entities.
    pub fn set_entity_components(
        &mut self,
        entity_id: EntityId,
        components: EntityComponents,
    ) -> Result<(), CommandError> {
        if !self.map_state.entities().contains_key(&entity_id) {
            return Err(CommandError::Failed(format!(
                "entity {} was not found",
                entity_id
            )));
        }

        if components == EntityComponents::default() {
            self.component_store.remove(entity_id);
            self.archived_components.remove(&entity_id);
        } else {
            self.component_store.set(entity_id, components.clone());
            self.archived_components.insert(entity_id, components);
        }
        Ok(())
    }

    pub fn import_sprite(&mut self, name: String, data_url: String) {
        self.sprite_registry.insert(name, data_url);
    }

    pub fn sprite_registry(&self) -> &HashMap<String, String> {
        &self.sprite_registry
    }

    pub fn delete_map_entities(&mut self, ids: Vec<EntityId>) -> Result<(), CommandError> {
        let normalized = self.normalize_ids(ids);
        if normalized.is_empty() {
            return Ok(());
        }

        let mut batch = BatchCommand::new("delete_map_entities");
        for entity_id in normalized {
            batch.push(Box::new(DeleteEntityCommand::new(entity_id)));
        }
        self.map_command_bus.execute_in_context(
            EditorContext::Map,
            &mut self.map_state,
            Box::new(batch),
        )?;
        self.session.set_active_context(EditorContext::Map);
        self.session.set_selection(Vec::new());
        self.sync_entity_runtime_state();
        Ok(())
    }

    pub fn undo_active_context(&mut self) -> Result<(), CommandError> {
        let context = self.session.active_context();
        self.map_command_bus
            .undo_in_context(&context, &mut self.map_state)?;
        self.normalize_map_selection();
        self.sync_entity_runtime_state();
        Ok(())
    }

    pub fn redo_active_context(&mut self) -> Result<(), CommandError> {
        let context = self.session.active_context();
        self.map_command_bus
            .redo_in_context(&context, &mut self.map_state)?;
        self.normalize_map_selection();
        self.sync_entity_runtime_state();
        Ok(())
    }

    pub fn reselect_previous(&mut self) -> Option<Vec<EntityId>> {
        let _ = self.session.reselect_previous();
        self.normalize_map_selection();
        let selection = self.session.current_selection().to_vec();
        if selection.is_empty() {
            return None;
        }
        Some(selection)
    }

    pub fn map_entities(&self) -> &HashMap<EntityId, Entity> {
        self.map_state.entities()
    }

    pub fn map_tiles(&self) -> &HashMap<(i32, i32), TileId> {
        self.map_state.tiles()
    }

    pub fn map_can_undo(&self) -> bool {
        self.map_command_bus.context_undo_len(&EditorContext::Map) > 0
    }

    pub fn map_can_redo(&self) -> bool {
        self.map_command_bus.context_redo_len(&EditorContext::Map) > 0
    }

    pub fn reset_map(&mut self) {
        self.map_state = MapEditorState::default();
        self.map_command_bus = ContextCommandBus::default();
        self.session.set_active_context(EditorContext::Map);
        self.session.set_selection(Vec::new());
        self.component_store = ComponentStore::new();
        self.entity_script_runtimes.clear();
        self.entity_script_graphs.clear();
        self.entity_states.clear();
        self.archived_components.clear();
        self.archived_entity_script_graphs.clear();
        self.archived_entity_states.clear();
    }

    /// Clear undo/redo history without touching map state.
    /// Used after loading persisted state so the load isn't undoable.
    pub fn reset_undo_history(&mut self) {
        self.map_command_bus = ContextCommandBus::default();
        // No command history means old entity IDs can no longer be restored.
        self.archived_components.clear();
        self.archived_entity_script_graphs.clear();
        self.archived_entity_states.clear();
    }

    pub fn set_map_selection(&mut self, ids: Vec<EntityId>) -> Vec<EntityId> {
        self.session.set_active_context(EditorContext::Map);
        let normalized = self.normalize_ids(ids);
        self.session.set_selection(normalized.clone());
        normalized
    }

    pub fn paint_map_tile(&mut self, x: i32, y: i32, tile_id: TileId) -> Result<(), CommandError> {
        self.map_command_bus.execute_in_context(
            EditorContext::Map,
            &mut self.map_state,
            Box::new(PaintTileCommand::new(x, y, tile_id)),
        )?;
        self.session.set_active_context(EditorContext::Map);
        Ok(())
    }

    pub fn paint_map_tiles(
        &mut self,
        points: Vec<(i32, i32)>,
        tile_id: TileId,
    ) -> Result<(), CommandError> {
        if points.is_empty() {
            return Ok(());
        }
        let mut seen = std::collections::HashSet::new();
        let mut batch = BatchCommand::new("paint_map_tiles");
        for (x, y) in points {
            if seen.insert((x, y)) {
                batch.push(Box::new(PaintTileCommand::new(x, y, tile_id)));
            }
        }
        self.map_command_bus.execute_in_context(
            EditorContext::Map,
            &mut self.map_state,
            Box::new(batch),
        )?;
        self.session.set_active_context(EditorContext::Map);
        Ok(())
    }

    pub fn erase_map_tile(&mut self, x: i32, y: i32) -> Result<(), CommandError> {
        self.map_command_bus.execute_in_context(
            EditorContext::Map,
            &mut self.map_state,
            Box::new(EraseTileCommand::new(x, y)),
        )?;
        self.session.set_active_context(EditorContext::Map);
        Ok(())
    }

    pub fn erase_map_tiles(&mut self, points: Vec<(i32, i32)>) -> Result<(), CommandError> {
        if points.is_empty() {
            return Ok(());
        }
        let mut seen = std::collections::HashSet::new();
        let mut batch = BatchCommand::new("erase_map_tiles");
        for (x, y) in points {
            if seen.insert((x, y)) {
                batch.push(Box::new(EraseTileCommand::new(x, y)));
            }
        }
        self.map_command_bus.execute_in_context(
            EditorContext::Map,
            &mut self.map_state,
            Box::new(batch),
        )?;
        self.session.set_active_context(EditorContext::Map);
        Ok(())
    }

    /// Flood-fill from (start_x, start_y) replacing all contiguous tiles that share the
    /// seed tile ID with `tile_id`.  The fill is bounded to [0, canvas_cols) × [0, canvas_rows)
    /// and capped at 2 048 cells to prevent runaway fills.
    pub fn fill_map_tiles(
        &mut self,
        start_x: i32,
        start_y: i32,
        tile_id: TileId,
        canvas_cols: i32,
        canvas_rows: i32,
    ) -> Result<(), CommandError> {
        let seed_tile = self.map_tiles().get(&(start_x, start_y)).copied();
        if seed_tile == Some(tile_id) {
            return Ok(());
        }
        // Clone the current tile map so we can read it freely while the BFS runs
        // before calling paint_map_tiles (which needs &mut self).
        let tiles_snap: HashMap<(i32, i32), TileId> = self.map_tiles().clone();
        let fill_points =
            flood_fill_points(&tiles_snap, start_x, start_y, seed_tile, canvas_cols, canvas_rows);
        if fill_points.is_empty() {
            return Ok(());
        }
        self.paint_map_tiles(fill_points, tile_id)
    }

    pub fn playtest_state(&self) -> PlaytestState {
        self.playtest
    }

    pub fn enter_playtest(&mut self) {
        self.playtest = PlaytestState {
            active: true,
            paused: false,
            speed: 1.0,
            frame: 0,
            trace_enabled: self.playtest.trace_enabled,
            last_tick_delta_ms: 0,
            last_tick_steps: 0,
        };
        self.playtest_accumulator_ms = 0.0;
        self.last_breakpoint_hit = None;
        self.core_watch_flags
            .insert("has_started_playtest".to_string(), true);
        self.core_watch_flags
            .insert("player_has_key".to_string(), false);
        self.core_watch_flags
            .insert("quest_intro_active".to_string(), true);
        self.core_watch_flags
            .insert("quest_intro_completed".to_string(), false);
        self.core_watch_variables = default_watch_variables();
        self.core_watch_inventory = default_watch_inventory();
        self.script_state = ScriptState::default();
        self.scene_state = ScriptState::default();
        self.scene_states = HashMap::new();
        self.entity_states = HashMap::new();
        self.spawned_entity_pool.clear();
        self.active_playtest_scene = self.scene_collection.active_scene_id().map(String::from);
        self.input_state.reset();
        self.animator_params = AnimatorParameters::default();

        // Initialize camera: follow first entity with a movement component (the "player")
        let player_id = self.component_store.entities_with_movement().into_iter().next();
        self.camera_state = CameraState {
            target_entity: player_id,
            ..CameraState::default()
        };
        if let Some(id) = player_id {
            if let Some(entity) = self.map_state.entities().get(&id) {
                self.camera_state.x = entity.position.x as f32;
                self.camera_state.y = entity.position.y as f32;
            }
        }

        self.push_playtest_trace("playtest_enter", "Playtest entered");
    }

    pub fn exit_playtest(&mut self) {
        self.push_playtest_trace("playtest_exit", "Playtest exited");
        // Remove all script-spawned entities before resetting other state.
        let pool = std::mem::take(&mut self.spawned_entity_pool);
        for id in pool {
            self.map_state.entities_mut().remove(&id);
            self.component_store.remove(id);
        }
        self.playtest = PlaytestState::default();
        self.playtest_accumulator_ms = 0.0;
        self.last_breakpoint_hit = None;
        self.core_watch_flags = default_watch_flags();
        self.core_watch_variables = default_watch_variables();
        self.core_watch_inventory = default_watch_inventory();
        self.script_state = ScriptState::default();
        self.scene_state = ScriptState::default();
        self.scene_states = HashMap::new();
        self.entity_states = HashMap::new();
        self.active_playtest_scene = None;
        self.input_state.reset();
        self.animator_params = AnimatorParameters::default();
        self.camera_state = CameraState::default();
        self.transition_state = TransitionState::default();
        self.pending_scene_transition = None;
    }

    pub fn toggle_playtest_pause(&mut self) {
        if !self.playtest.active {
            return;
        }
        self.playtest.paused = !self.playtest.paused;
        self.push_playtest_trace(
            "playtest_pause",
            if self.playtest.paused {
                "Playtest paused"
            } else {
                "Playtest resumed"
            },
        );
    }

    pub fn step_playtest_frame(&mut self) {
        if !self.playtest.active {
            return;
        }
        self.playtest.paused = true;
        self.playtest.frame = self.playtest.frame.saturating_add(1);
        self.playtest.last_tick_delta_ms = 0;
        self.playtest.last_tick_steps = 1;
        self.push_playtest_trace("playtest_step", "Advanced one frame");
    }

    pub fn set_playtest_speed(&mut self, speed: f32) {
        if !self.playtest.active {
            return;
        }
        self.playtest.speed = speed;
        self.push_playtest_trace("playtest_speed", &format!("Speed set to {:.2}x", speed));
    }

    pub fn set_playtest_trace_enabled(&mut self, enabled: bool) {
        self.playtest.trace_enabled = enabled;
        self.push_playtest_trace(
            "playtest_trace",
            if enabled {
                "Trace enabled"
            } else {
                "Trace disabled"
            },
        );
    }

    pub fn set_playtest_breakpoints(&mut self, kinds: Vec<String>) {
        self.playtest_breakpoints = default_breakpoints();
        for kind in kinds {
            if self.playtest_breakpoints.contains_key(&kind) {
                self.playtest_breakpoints.insert(kind, true);
            }
        }
        self.last_breakpoint_hit = None;
    }

    pub fn playtest_breakpoints(&self) -> &HashMap<String, bool> {
        &self.playtest_breakpoints
    }

    pub fn last_breakpoint_hit(&self) -> Option<&PlaytestTraceEvent> {
        self.last_breakpoint_hit.as_ref()
    }

    pub fn playtest_trace(&self) -> &VecDeque<PlaytestTraceEvent> {
        &self.playtest_trace
    }

    pub fn core_watch_flags(&self) -> &HashMap<String, bool> {
        &self.core_watch_flags
    }

    pub fn selected_entity(&self) -> Option<&Entity> {
        self.session
            .current_selection()
            .first()
            .and_then(|id| self.map_state.entities().get(id))
    }

    pub fn selected_entity_watch_flags(&self) -> HashMap<String, bool> {
        let Some(entity) = self.selected_entity() else {
            return HashMap::new();
        };
        let lower = entity.name.to_ascii_lowercase();
        HashMap::from([
            ("selected_is_player".to_string(), lower.contains("player")),
            (
                "selected_in_viewport".to_string(),
                entity.position.x >= 0
                    && entity.position.x < 160
                    && entity.position.y >= 0
                    && entity.position.y < 144,
            ),
            (
                "selected_on_grid4".to_string(),
                entity.position.x % 4 == 0 && entity.position.y % 4 == 0,
            ),
        ])
    }

    pub fn selected_entity_watch_variables(&self) -> HashMap<String, i64> {
        let Some(entity) = self.selected_entity() else {
            return HashMap::new();
        };
        HashMap::from([
            ("selected_id".to_string(), entity.id as i64),
            ("selected_x".to_string(), entity.position.x as i64),
            ("selected_y".to_string(), entity.position.y as i64),
        ])
    }

    pub fn selected_entity_watch_inventory(&self) -> HashMap<String, u32> {
        let Some(entity) = self.selected_entity() else {
            return HashMap::new();
        };
        let lower = entity.name.to_ascii_lowercase();
        HashMap::from([
            ("selected_debug_tag".to_string(), 1),
            (
                "selected_key_item".to_string(),
                u32::from(
                    lower.contains("player") && self.playtest.frame >= ITEM_PICKUP_FRAME_THRESHOLD,
                ),
            ),
        ])
    }

    pub fn core_watch_variables(&self) -> &HashMap<String, i64> {
        &self.core_watch_variables
    }

    pub fn core_watch_inventory(&self) -> &HashMap<String, u32> {
        &self.core_watch_inventory
    }

    /// Load and compile a script graph for use during playtest.
    /// The graph should pass validation before calling this.
    /// Returns the list of event names the graph listens for.
    pub fn load_script_graph(&mut self, graph: &ScriptGraph) -> Vec<String> {
        let rt = ScriptRuntime::compile(graph);
        let events = rt.registered_events();
        self.script_runtime = Some(rt);
        self.script_state = ScriptState::default();
        self.scene_state = ScriptState::default();
        self.scene_states = HashMap::new();
        events
    }

    /// Remove any loaded script graph and reset script state.
    pub fn unload_script_graph(&mut self) {
        self.script_runtime = None;
        self.script_state = ScriptState::default();
        self.scene_state = ScriptState::default();
        self.scene_states = HashMap::new();
    }

    /// Attach a compiled ScriptGraph to a specific entity. The graph is validated
    /// before compilation. Returns an error if validation fails.
    pub fn attach_entity_graph(
        &mut self,
        entity_id: EntityId,
        graph: script_core::ScriptGraph,
    ) -> Result<Vec<String>, String> {
        let report = graph.validate();
        if !report.is_valid() {
            let messages: Vec<String> = report.errors.iter().map(|e| e.message.clone()).collect();
            return Err(messages.join("; "));
        }
        let rt = ScriptRuntime::compile(&graph);
        let events = rt.registered_events();
        self.entity_script_runtimes.insert(entity_id, rt);
        self.entity_script_graphs.insert(entity_id, graph);
        Ok(events)
    }

    /// Remove any script graph attached to an entity.
    pub fn detach_entity_graph(&mut self, entity_id: EntityId) {
        self.entity_script_runtimes.remove(&entity_id);
        self.entity_script_graphs.remove(&entity_id);
    }

    /// Get the authored ScriptGraph for an entity, if one is attached.
    pub fn get_entity_graph(&self, entity_id: EntityId) -> Option<&script_core::ScriptGraph> {
        self.entity_script_graphs.get(&entity_id)
    }

    /// Return all entity graphs as a map of EntityId → ScriptGraph.
    pub fn entity_graphs(&self) -> &HashMap<EntityId, script_core::ScriptGraph> {
        &self.entity_script_graphs
    }

    /// Return the runtime state map (entity_id → state string).
    pub fn entity_states(&self) -> &HashMap<EntityId, String> {
        &self.entity_states
    }

    /// Fire a named event through the loaded script graph.
    /// Returns the tick result with effects and visited nodes.
    /// If no graph is loaded, returns an empty result.
    pub fn fire_script_event(&mut self, event_name: &str) -> ScriptTickResult {
        let Some(rt) = &self.script_runtime else {
            return ScriptTickResult::default();
        };
        let inv = self.core_watch_inventory.clone();
        let result = rt.process_event(event_name, &mut self.script_state, &mut self.scene_state, &inv);
        self.apply_script_effects(&result);
        result
    }

    /// Fire the "on_interact" event through an entity's attached script graph.
    /// Returns the tick result, or an empty result if the entity has no graph.
    pub fn fire_entity_interact(&mut self, entity_id: EntityId) -> ScriptTickResult {
        let Some(rt) = self.entity_script_runtimes.get(&entity_id) else {
            return ScriptTickResult::default();
        };
        let inv = self.core_watch_inventory.clone();
        let result = rt.process_event("on_interact", &mut self.script_state, &mut self.scene_state, &inv);
        let entity_name = self.map_state.entities().get(&entity_id)
            .map(|e| e.name.clone())
            .unwrap_or_else(|| format!("entity {entity_id}"));
        self.push_playtest_trace("entity_interact", &format!("Player interacted with '{entity_name}'"));
        self.apply_script_effects(&result);
        self.handle_breakpoint_event("script_event", &format!("on_interact fired for '{entity_name}'"));
        result
    }

    pub fn script_state(&self) -> &ScriptState {
        &self.script_state
    }

    pub fn scene_state(&self) -> &ScriptState {
        &self.scene_state
    }

    pub fn has_script_graph(&self) -> bool {
        self.script_runtime.is_some()
    }

    // ── Scene management ────────────────────────────────────────────────

    pub fn scene_collection(&self) -> &SceneCollection {
        &self.scene_collection
    }

    pub fn scene_collection_mut(&mut self) -> &mut SceneCollection {
        &mut self.scene_collection
    }

    /// Add a scene to the collection. Returns the scene id.
    pub fn add_scene(&mut self, scene: Scene) -> SceneId {
        let id = scene.id.clone();
        self.scene_collection.add_scene(scene);
        id
    }

    /// Remove a scene from the collection.
    pub fn remove_scene(&mut self, id: &str) -> Option<Scene> {
        self.scene_collection.remove_scene(id)
    }

    /// Get the active scene id (editor context, not playtest).
    pub fn active_scene_id(&self) -> Option<&str> {
        self.scene_collection.active_scene_id()
    }

    /// Switch to a different scene in the editor.
    pub fn set_active_scene(&mut self, id: &str) -> bool {
        self.scene_collection.set_active_scene(id)
    }

    /// Get the scene currently active during playtest (set by ChangeScene effects).
    pub fn active_playtest_scene(&self) -> Option<&str> {
        self.active_playtest_scene.as_deref()
    }

    // ── Direct spawn / despawn (invoke API surface) ──────────────────

    /// Spawn an entity from a prefab directly (e.g. via UI or playtest command).
    /// Tracks the entity in the pool so it is removed on playtest exit.
    /// Safe to call outside playtest; pool cleanup is a no-op if `exit_playtest` is
    /// not called (authored entities must be deleted explicitly by the user).
    pub fn spawn_entity_from_prefab_direct(
        &mut self,
        prefab_id: &str,
        x: i32,
        y: i32,
    ) -> Result<EntityId, String> {
        let new_id = self
            .create_map_entity_from_prefab(prefab_id, x, y, None)
            .map_err(|e| e.to_string())?;
        if self.playtest.active {
            self.spawned_entity_pool.push(new_id);
        }
        Ok(new_id)
    }

    /// Remove an entity by id directly (e.g. via UI or playtest command).
    /// Also prunes pool tracking if applicable.
    pub fn despawn_entity_direct(&mut self, entity_id: EntityId) -> Result<(), String> {
        if self.map_state.entities_mut().remove(&entity_id).is_none() {
            return Err(format!("entity {entity_id} not found"));
        }
        self.component_store.remove(entity_id);
        self.spawned_entity_pool.retain(|&id| id != entity_id);
        Ok(())
    }

    // ── Prefab library ───────────────────────────────────────────────

    pub fn prefab_library(&self) -> &PrefabLibrary {
        &self.prefab_library
    }

    pub fn animation_clip_assets(&self) -> &AnimationClipAssetLibrary {
        &self.animation_clip_assets
    }

    pub fn animation_graph_assets(&self) -> &AnimationGraphAssetLibrary {
        &self.animation_graph_assets
    }

    pub fn replace_animation_asset_libraries(
        &mut self,
        clips: AnimationClipAssetLibrary,
        graphs: AnimationGraphAssetLibrary,
    ) {
        self.animation_clip_assets = clips;
        self.animation_graph_assets = graphs;
    }

    pub fn animation_clip_asset_upsert(&mut self, clip: AnimationClipAsset) {
        self.animation_clip_assets.insert(clip);
    }

    pub fn animation_clip_asset_delete(&mut self, id: &str) -> Result<(), String> {
        self.animation_clip_assets
            .remove(id)
            .map(|_| ())
            .ok_or_else(|| format!("animation clip asset '{id}' not found"))
    }

    pub fn animation_graph_asset_upsert(&mut self, graph: AnimationGraphAsset) {
        self.animation_graph_assets.insert(graph);
    }

    pub fn animation_graph_asset_delete(&mut self, id: &str) -> Result<(), String> {
        self.animation_graph_assets
            .remove(id)
            .map(|_| ())
            .ok_or_else(|| format!("animation graph asset '{id}' not found"))
    }

    pub fn replace_prefab_library(&mut self, library: PrefabLibrary) {
        self.prefab_library = library;
    }

    /// Create a new prefab. Returns an error if a prefab with that id already exists.
    pub fn prefab_create(
        &mut self,
        id: String,
        name: String,
        components: EntityComponents,
    ) -> Result<(), String> {
        if self.prefab_library.get(&id).is_some() {
            return Err(format!("prefab '{id}' already exists"));
        }
        self.prefab_library
            .insert(EntityPrefab::new(id, name).with_components(components));
        Ok(())
    }

    /// Update a prefab's name and/or components. Returns an error if the id is not found.
    pub fn prefab_update(
        &mut self,
        id: &str,
        name: Option<String>,
        components: Option<EntityComponents>,
    ) -> Result<(), String> {
        if self.prefab_library.get(id).is_none() {
            return Err(format!("prefab '{id}' not found"));
        }
        if let Some(n) = name {
            self.prefab_library.update_name(id, n);
        }
        if let Some(c) = components {
            self.prefab_library.update_components(id, c);
        }
        Ok(())
    }

    /// Delete a prefab. Returns an error if the id is not found.
    pub fn prefab_delete(&mut self, id: &str) -> Result<(), String> {
        self.prefab_library
            .remove(id)
            .map(|_| ())
            .ok_or_else(|| format!("prefab '{id}' not found"))
    }

    /// Create a map entity seeded from a prefab's default components.
    /// If `name_override` is non-empty, it is used instead of the prefab name.
    pub fn create_map_entity_from_prefab(
        &mut self,
        prefab_id: &str,
        x: i32,
        y: i32,
        name_override: Option<String>,
    ) -> Result<EntityId, CommandError> {
        let prefab = self
            .prefab_library
            .get(prefab_id)
            .ok_or_else(|| {
                CommandError::Failed(format!("prefab '{prefab_id}' not found"))
            })?
            .clone();

        let resolved_name = name_override
            .map(|n| n.trim().to_string())
            .filter(|n| !n.is_empty())
            .unwrap_or(prefab.name.clone());
        let entity_id =
            self.create_map_entity(resolved_name, Position { x, y })?;
        // Copy prefab default components onto the newly created entity.
        self.component_store
            .set(entity_id, prefab.default_components);
        Ok(entity_id)
    }

    pub fn transition_state(&self) -> &TransitionState {
        &self.transition_state
    }

    /// Default transition duration in ticks (~250ms at 60fps).
    const TRANSITION_DURATION_TICKS: u32 = 15;

    /// Begin a scene transition during playtest. Starts a FadeOut; the actual
    /// scene swap happens when the fade-out completes (driven by tick_transition).
    /// Returns the spawn position if the target scene exists.
    pub fn transition_to_scene(
        &mut self,
        target_scene: &str,
        spawn_point: Option<&str>,
    ) -> Option<Position> {
        let scene = self.scene_collection.get_scene(target_scene)?;
        let position = scene.resolve_spawn_position(spawn_point);
        self.pending_scene_transition =
            Some((target_scene.to_string(), spawn_point.map(String::from)));
        self.transition_state
            .start(TransitionEffect::FadeOut, Self::TRANSITION_DURATION_TICKS);
        self.push_playtest_trace(
            "scene_transition",
            &format!(
                "Starting transition to scene '{}' at ({}, {})",
                target_scene, position.x, position.y
            ),
        );
        Some(position)
    }

    /// Advance the screen transition by one tick. Called from tick_playtest().
    /// When FadeOut completes, performs the scene swap and starts FadeIn.
    fn tick_transition(&mut self) {
        if !self.transition_state.active {
            return;
        }
        let completed = self.transition_state.tick();
        if !completed {
            return;
        }
        match self.transition_state.effect {
            TransitionEffect::FadeOut => {
                // FadeOut just completed — save scene-local state for old scene,
                // swap to new scene, and restore its saved state (or empty default).
                if let Some((scene_id, _spawn_point)) = self.pending_scene_transition.take() {
                    // Save current scene's local state
                    if let Some(ref old_scene) = self.active_playtest_scene {
                        self.scene_states
                            .insert(old_scene.clone(), self.scene_state.clone());
                    }
                    // Restore new scene's local state (or start fresh)
                    self.scene_state = self
                        .scene_states
                        .get(&scene_id)
                        .cloned()
                        .unwrap_or_default();
                    self.active_playtest_scene = Some(scene_id);
                }
                // Start FadeIn
                self.transition_state
                    .start(TransitionEffect::FadeIn, Self::TRANSITION_DURATION_TICKS);
            }
            TransitionEffect::FadeIn => {
                // FadeIn completed — transition fully done, nothing to do
            }
            TransitionEffect::None => {}
        }
    }

    // ── Input + Movement ────────────────────────────────────────────────

    pub fn component_store(&self) -> &ComponentStore {
        &self.component_store
    }

    pub fn component_store_mut(&mut self) -> &mut ComponentStore {
        &mut self.component_store
    }

    pub fn input_state(&self) -> &InputState {
        &self.input_state
    }

    pub fn input_mapping(&self) -> &InputMapping {
        &self.input_mapping
    }

    pub fn physics_config(&self) -> &PhysicsConfig {
        &self.physics_config
    }

    pub fn set_physics_config(&mut self, config: PhysicsConfig) {
        self.physics_config = config;
    }

    pub fn project_name(&self) -> &str {
        &self.project_name
    }

    pub fn set_project_name(&mut self, name: String) {
        self.project_name = name;
    }

    /// Bind an entity's animation component to a reusable animation graph asset.
    pub fn bind_entity_animation_graph(
        &mut self,
        entity_id: EntityId,
        graph_asset_id: String,
    ) -> Result<(), String> {
        if !self.map_state.entities().contains_key(&entity_id) {
            return Err(format!("entity {entity_id} not found"));
        }
        let graph = self
            .animation_graph_assets
            .get(&graph_asset_id)
            .ok_or_else(|| format!("animation graph asset '{graph_asset_id}' not found"))?;

        if self.component_store.animation(entity_id).is_none() {
            // Seed with a placeholder clip/state; graph resolution will overwrite this during sync.
            let seed_state = graph.default_state.clone();
            let mut animation = AnimationComponent::new(
                seed_state,
                AnimationClip::new(vec![0], 1, engine_core::LoopMode::Loop),
            );
            animation.graph_asset_id = Some(graph_asset_id);
            self.component_store.set_animation(entity_id, animation);
        } else if let Some(anim) = self.component_store.animation_mut(entity_id) {
            anim.graph_asset_id = Some(graph_asset_id);
        }

        self.sync_graph_bound_animation_for_entity(entity_id);
        Ok(())
    }

    /// Remove graph-asset binding from an entity animation component.
    pub fn unbind_entity_animation_graph(&mut self, entity_id: EntityId) -> Result<(), String> {
        let anim = self
            .component_store
            .animation_mut(entity_id)
            .ok_or_else(|| format!("entity {entity_id} has no AnimationComponent"))?;
        anim.graph_asset_id = None;
        Ok(())
    }

    /// Return currently bound graph asset id (if any) for entity animation.
    pub fn get_entity_animation_graph_binding(&self, entity_id: EntityId) -> Option<String> {
        self.component_store
            .animation(entity_id)
            .and_then(|anim| anim.graph_asset_id.clone())
    }

    /// Set a typed bool animator parameter used by animation transitions.
    pub fn set_animation_bool_param(&mut self, key: String, value: bool) {
        self.animator_params.set_bool(key, value);
    }

    /// Set a typed int animator parameter reserved for upcoming transition kinds.
    pub fn set_animation_int_param(&mut self, key: String, value: i32) {
        self.animator_params.set_int(key, value);
    }

    /// Fire a one-shot animator trigger consumed during transition evaluation.
    pub fn fire_animation_trigger(&mut self, key: String) {
        self.animator_params.set_trigger(key);
    }

    pub fn camera_state(&self) -> &CameraState {
        &self.camera_state
    }

    pub fn set_camera_mode(&mut self, mode: CameraMode) {
        self.camera_state.mode = mode;
    }

    /// Handle a key press from the frontend during playtest.
    pub fn playtest_key_down(&mut self, key: KeyCode) {
        let mapping = self.input_mapping.clone();
        self.input_state.key_down(key, &mapping);
    }

    /// Handle a key release from the frontend during playtest.
    pub fn playtest_key_up(&mut self, key: KeyCode) {
        let mapping = self.input_mapping.clone();
        self.input_state.key_up(key, &mapping);
    }

    /// Process movement for all entities that have a MovementComponent.
    /// Called during tick_playtest after input state is ready.
    fn process_entity_movement(&mut self) {
        process_entity_movement_step(
            &mut self.map_state,
            &mut self.component_store,
            &self.input_state,
        );
    }

    /// Process physics for all entities that have a VelocityComponent.
    /// Called during tick_playtest after movement processing.
    fn process_entity_physics(&mut self) {
        process_entity_physics_step(
            &mut self.map_state,
            &mut self.component_store,
            &self.input_state,
            &self.physics_config,
        );
    }

    /// Advance animation frames for all entities that have an `AnimationComponent`.
    /// Updates `SpriteComponent.frame` to match the current animation frame.
    /// Evaluates transitions and fires `animation_finished` script events.
    fn tick_entity_animations(&mut self) {
        self.sync_graph_bound_animations();
        for (key, value) in &self.script_state.flags {
            self.animator_params.set_bool(key.clone(), *value);
        }
        let events = step_animations_with_params(
            &mut self.component_store,
            &self.script_state.flags,
            &mut self.animator_params,
        );
        let actions = derive_runtime_animation_actions(events, self.script_runtime.is_some());
        for action in actions {
            match action {
                RuntimeAnimationAction::Trace { kind, message } => {
                    self.push_playtest_trace(&kind, &message);
                }
                RuntimeAnimationAction::FireScript { event_name } => {
                    self.fire_script_event(event_name);
                }
            }
        }
    }

    /// Resolve graph-bound animation components into concrete clips/transitions.
    fn sync_graph_bound_animations(&mut self) {
        let ids = self.component_store.entities_with_animation();
        for entity_id in ids {
            self.sync_graph_bound_animation_for_entity(entity_id);
        }
    }

    fn sync_graph_bound_animation_for_entity(&mut self, entity_id: EntityId) {
        let Some(graph_id) = self
            .component_store
            .animation(entity_id)
            .and_then(|anim| anim.graph_asset_id.clone())
        else {
            return;
        };
        let Some(graph) = self.animation_graph_assets.get(&graph_id).cloned() else {
            return;
        };

        let mut resolved = HashMap::new();
        for (state_name, clip_asset_id) in &graph.states {
            if let Some(asset) = self.animation_clip_assets.get(clip_asset_id) {
                resolved.insert(
                    state_name.clone(),
                    AnimationClip::new(
                        asset.frames.clone(),
                        asset.frame_duration_ticks,
                        asset.loop_mode,
                    ),
                );
            }
        }
        if resolved.is_empty() {
            return;
        }

        if let Some(anim) = self.component_store.animation_mut(entity_id) {
            anim.clips = resolved;
            anim.transitions = graph.transitions.clone();
            if !anim.clips.contains_key(&anim.state.current_clip_name) {
                let default_state = if anim.clips.contains_key(&graph.default_state) {
                    graph.default_state.clone()
                } else {
                    anim.clips
                        .keys()
                        .next()
                        .cloned()
                        .unwrap_or_else(|| String::from("default"))
                };
                anim.state = engine_core::AnimationState::new(default_state);
            }
        }
    }

    /// Interact range in pixels (tile_size = 8px; 24px ≈ 3 tiles).
    /// Entities within this taxicab distance from the player are candidates
    /// for the on_interact event.
    const INTERACT_RANGE_PX: i32 = 24;

    /// Fire script events for input actions that were just pressed this tick.
    fn fire_input_script_events(&mut self) {
        let actions = self.input_state.actions_just_pressed();
        for action in &actions {
            // Global graph events (ActionA doubles as interact AND action_a trigger)
            if self.script_runtime.is_some() {
                let event_name = match action {
                    InputAction::ActionA => "action_a",
                    InputAction::ActionB => "action_b",
                    InputAction::Start => "start",
                    InputAction::Select => "select",
                    _ => continue,
                };
                self.fire_script_event(event_name);
            }
        }

        // If ActionA was pressed, fire on_interact for adjacent entities that have a graph.
        if actions.contains(&InputAction::ActionA) && !self.entity_script_runtimes.is_empty() {
            // Find the player entity (first entity with a movement component).
            let player_pos = self
                .component_store
                .entities_with_movement()
                .into_iter()
                .next()
                .and_then(|id| self.map_state.entities().get(&id).map(|e| e.position));

            if let Some(ppos) = player_pos {
                // Collect entity ids with graphs first, releasing the borrow before
                // accessing map_state in the filter.
                let graph_ids: Vec<EntityId> =
                    self.entity_script_runtimes.keys().copied().collect();
                let nearby: Vec<EntityId> = graph_ids
                    .into_iter()
                    .filter(|eid| {
                        if let Some(e) = self.map_state.entities().get(eid) {
                            let dx = (e.position.x - ppos.x).abs();
                            let dy = (e.position.y - ppos.y).abs();
                            dx + dy <= Self::INTERACT_RANGE_PX
                        } else {
                            false
                        }
                    })
                    .collect();

                for eid in nearby {
                    self.fire_entity_interact(eid);
                }
            }
        }
    }

    /// Apply script effects to editor runtime watch state and trace.
    fn apply_script_effects(&mut self, result: &ScriptTickResult) {
        for effect in &result.effects {
            match effect {
                ScriptEffect::SetFlag { flag, value, scope } => {
                    let scope_label = match scope {
                        StateScope::Scene => "scene",
                        StateScope::Global => "global",
                    };
                    self.core_watch_flags.insert(flag.clone(), *value);
                    self.push_playtest_trace(
                        "script_flag",
                        &format!("Script set {scope_label} flag '{flag}' = {value}"),
                    );
                }
                ScriptEffect::SetVariable { variable, value, scope } => {
                    let scope_label = match scope {
                        StateScope::Scene => "scene",
                        StateScope::Global => "global",
                    };
                    self.core_watch_variables.insert(variable.clone(), *value);
                    self.push_playtest_trace(
                        "script_variable",
                        &format!("Script set {scope_label} variable '{variable}' = {value}"),
                    );
                }
                ScriptEffect::ChangeScene {
                    target_scene,
                    spawn_point,
                } => {
                    // Use the two-phase transition system (FadeOut → swap → FadeIn).
                    let result = self.transition_to_scene(
                        target_scene,
                        spawn_point.as_deref(),
                    );
                    if result.is_none() {
                        let spawn = spawn_point
                            .as_deref()
                            .map(|s| format!(" at '{s}'"))
                            .unwrap_or_default();
                        self.push_playtest_trace(
                            "script_scene_change",
                            &format!(
                                "Script requests scene change to '{target_scene}'{spawn} (scene not found)"
                            ),
                        );
                    }
                    self.handle_breakpoint_event(
                        "script_event",
                        &format!("Scene change to '{target_scene}'"),
                    );
                }
                ScriptEffect::GiveItem { item_id } => {
                    let new_qty = {
                        let qty = self.core_watch_inventory.entry(item_id.clone()).or_insert(0);
                        *qty = qty.saturating_add(1);
                        *qty
                    };
                    self.core_watch_flags.insert(format!("has_{item_id}"), true);
                    self.push_playtest_trace(
                        "item_pickup",
                        &format!("Script gave item '{item_id}' (qty={new_qty})"),
                    );
                    self.handle_breakpoint_event("item_pickup", &format!("Script gave item '{item_id}'"));
                }
                ScriptEffect::RemoveItem { item_id } => {
                    let new_qty = {
                        let qty = self.core_watch_inventory.entry(item_id.clone()).or_insert(0);
                        *qty = qty.saturating_sub(1);
                        *qty
                    };
                    if new_qty == 0 {
                        self.core_watch_flags.insert(format!("has_{item_id}"), false);
                    }
                    self.push_playtest_trace(
                        "script_item",
                        &format!("Script removed item '{item_id}' (qty={new_qty})"),
                    );
                }
                ScriptEffect::SetEntityState { entity_id, state } => {
                    // entity_id here is a name string (from the graph) — look up numeric id.
                    let found_id = self.map_state.entities().iter()
                        .find(|(_, e)| e.name.eq_ignore_ascii_case(entity_id))
                        .map(|(id, _)| *id);
                    if let Some(eid) = found_id {
                        self.entity_states.insert(eid, state.clone());
                        self.push_playtest_trace(
                            "entity_state",
                            &format!("Entity '{entity_id}' state → '{state}'"),
                        );
                    } else {
                        self.push_playtest_trace(
                            "entity_state",
                            &format!("SetEntityState: entity '{entity_id}' not found"),
                        );
                    }
                }
                ScriptEffect::ShowMessage { text } => {
                    self.push_playtest_trace("script_message", text);
                }
                ScriptEffect::PlayAudio { audio_id } => {
                    self.push_playtest_trace(
                        "script_audio",
                        &format!("Script requests audio '{audio_id}'"),
                    );
                }
                ScriptEffect::LogMessage { message } => {
                    self.push_playtest_trace("script_log", message);
                }
                ScriptEffect::SpawnEntity { prefab_id, x, y } => {
                    match self.create_map_entity_from_prefab(prefab_id, *x, *y, None) {
                        Ok(new_id) => {
                            self.spawned_entity_pool.push(new_id);
                            self.push_playtest_trace(
                                "entity_spawn",
                                &format!("Spawned entity from prefab '{prefab_id}' at ({x},{y}) → id {new_id}"),
                            );
                        }
                        Err(e) => {
                            self.push_playtest_trace(
                                "entity_spawn",
                                &format!("SpawnEntity failed for prefab '{prefab_id}': {e}"),
                            );
                        }
                    }
                }
                ScriptEffect::DespawnEntity { entity_name } => {
                    let found_id = self
                        .map_state
                        .entities()
                        .iter()
                        .find(|(_, e)| e.name.eq_ignore_ascii_case(entity_name))
                        .map(|(id, _)| *id);
                    if let Some(eid) = found_id {
                        self.map_state.entities_mut().remove(&eid);
                        self.component_store.remove(eid);
                        // If it was in the pool, remove it to avoid double-remove on exit.
                        self.spawned_entity_pool.retain(|&id| id != eid);
                        self.push_playtest_trace(
                            "entity_despawn",
                            &format!("Despawned entity '{entity_name}' (id {eid})"),
                        );
                    } else {
                        self.push_playtest_trace(
                            "entity_despawn",
                            &format!("DespawnEntity: entity '{entity_name}' not found (no-op)"),
                        );
                    }
                }
            }
        }
    }

    pub fn tick_playtest(&mut self, delta_ms: u32) -> u64 {
        if !self.playtest.active || self.playtest.paused {
            self.playtest.last_tick_delta_ms = delta_ms;
            self.playtest.last_tick_steps = 0;
            return 0;
        }

        let speed = self.playtest.speed.max(0.0) as f64;
        let step_ms = 1000.0 / PLAYTEST_FPS;
        let mut accumulator_ms = self.playtest_accumulator_ms;
        let steps = run_fixed_step_accumulator(
            &mut accumulator_ms,
            delta_ms,
            speed,
            step_ms,
            || {
            self.playtest.frame = self.playtest.frame.saturating_add(1);
            if !self.playtest.paused {
                self.process_entity_movement();
                self.process_entity_physics();
                self.tick_entity_animations();
            }
            },
        );
        self.playtest_accumulator_ms = accumulator_ms;

        // Per-frame logic: runs once after all steps are done.
        if steps > 0 {
            let progress = apply_playtest_progress(
                self.playtest.frame,
                &mut self.core_watch_flags,
                &mut self.core_watch_variables,
                &mut self.core_watch_inventory,
            );
            if progress.item_pickup_reached && !self.playtest.paused {
                self.handle_breakpoint_event("item_pickup", "Player obtained key item");
            }
            if progress.quest_state_reached && !self.playtest.paused {
                self.handle_breakpoint_event("quest_state", "Intro quest state changed");
            }

            if !self.playtest.paused {
                // Fire script graph "playtest_tick" event once per frame.
                if self.script_runtime.is_some() {
                    self.fire_script_event("playtest_tick");
                }
                self.fire_input_script_events();
                update_camera(&mut self.camera_state, self.map_state.entities());
                self.tick_transition();
                self.input_state.tick_reset();
            }

            self.push_playtest_trace(
                "playtest_tick",
                &format!("Ticked {} step(s) from {}ms", steps, delta_ms),
            );
            if !self.playtest.paused {
                self.handle_breakpoint_event("playtest_tick", "Playtest tick breakpoint event");
            }
        }
        self.playtest.last_tick_delta_ms = delta_ms;
        self.playtest.last_tick_steps = steps;

        steps
    }

    fn push_playtest_trace(&mut self, kind: &str, message: &str) {
        if !self.playtest.trace_enabled && kind != "playtest_trace" {
            return;
        }
        self.playtest_trace_seq = self.playtest_trace_seq.saturating_add(1);
        self.playtest_trace.push_back(PlaytestTraceEvent {
            seq: self.playtest_trace_seq,
            frame: self.playtest.frame,
            kind: kind.to_string(),
            message: message.to_string(),
        });
        if self.playtest_trace.len() > PLAYTEST_TRACE_LIMIT {
            self.playtest_trace.pop_front();
        }
    }

    fn handle_breakpoint_event(&mut self, kind: &str, message: &str) {
        if !self
            .playtest_breakpoints
            .get(kind)
            .copied()
            .unwrap_or(false)
        {
            return;
        }
        self.playtest.paused = true;
        self.playtest_trace_seq = self.playtest_trace_seq.saturating_add(1);
        let event = PlaytestTraceEvent {
            seq: self.playtest_trace_seq,
            frame: self.playtest.frame,
            kind: format!("breakpoint:{kind}"),
            message: message.to_string(),
        };
        self.last_breakpoint_hit = Some(event.clone());
        self.playtest_trace.push_back(event);
        if self.playtest_trace.len() > PLAYTEST_TRACE_LIMIT {
            self.playtest_trace.pop_front();
        }
    }

    fn normalize_map_selection(&mut self) {
        self.session.set_active_context(EditorContext::Map);
        let current = self.session.current_selection().to_vec();
        let normalized = self.normalize_ids(current);
        self.session.set_selection(normalized);
    }

    /// Keep runtime-side per-entity stores aligned to entities still present on the map.
    /// This prevents stale component/script/state entries after undo/redo/delete/reset flows.
    fn sync_entity_runtime_state(&mut self) {
        let live_ids: std::collections::HashSet<EntityId> =
            self.map_state.entities().keys().copied().collect();
        self.component_store.retain(|entity_id, components| {
            if live_ids.contains(&entity_id) {
                return true;
            }
            self.archived_components.insert(entity_id, components.clone());
            false
        });
        self.entity_script_runtimes
            .retain(|entity_id, _| live_ids.contains(entity_id));
        self.entity_script_graphs.retain(|entity_id, graph| {
            if live_ids.contains(entity_id) {
                return true;
            }
            self.archived_entity_script_graphs
                .insert(*entity_id, graph.clone());
            false
        });
        self.entity_states.retain(|entity_id, state| {
            if live_ids.contains(entity_id) {
                return true;
            }
            self.archived_entity_states.insert(*entity_id, state.clone());
            false
        });

        // Restore archived runtime state when entities reappear via undo/redo.
        for entity_id in live_ids {
            if self.component_store.get(entity_id).is_none() {
                if let Some(components) = self.archived_components.get(&entity_id).cloned() {
                    self.component_store.set(entity_id, components);
                }
            }
            if self.entity_script_graphs.get(&entity_id).is_none() {
                if let Some(graph) =
                    self.archived_entity_script_graphs.get(&entity_id).cloned()
                {
                    self.entity_script_runtimes
                        .insert(entity_id, ScriptRuntime::compile(&graph));
                    self.entity_script_graphs.insert(entity_id, graph);
                }
            } else if !self.entity_script_runtimes.contains_key(&entity_id) {
                if let Some(graph) = self.entity_script_graphs.get(&entity_id) {
                    self.entity_script_runtimes
                        .insert(entity_id, ScriptRuntime::compile(graph));
                }
            }
            if self.entity_states.get(&entity_id).is_none() {
                if let Some(state) = self.archived_entity_states.get(&entity_id).cloned() {
                    self.entity_states.insert(entity_id, state);
                }
            }
        }
    }

    fn normalize_ids(&self, ids: Vec<EntityId>) -> Vec<EntityId> {
        let mut seen = std::collections::HashSet::new();
        ids.into_iter()
            .filter(|id| self.map_state.entities().contains_key(id))
            .filter(|id| seen.insert(*id))
            .collect::<Vec<_>>()
    }
}

fn default_watch_flags() -> HashMap<String, bool> {
    HashMap::from([
        ("has_started_playtest".to_string(), false),
        ("player_has_key".to_string(), false),
        ("quest_intro_active".to_string(), false),
        ("quest_intro_completed".to_string(), false),
    ])
}

fn default_breakpoints() -> HashMap<String, bool> {
    HashMap::from([
        ("playtest_tick".to_string(), false),
        ("item_pickup".to_string(), false),
        ("quest_state".to_string(), false),
        ("script_event".to_string(), false),
    ])
}

fn default_watch_variables() -> HashMap<String, i64> {
    HashMap::from([
        ("player_hp".to_string(), 3),
        ("player_coins".to_string(), 0),
        ("quest_stage".to_string(), 0),
    ])
}

fn default_watch_inventory() -> HashMap<String, u32> {
    HashMap::from([("key_item".to_string(), 0), ("potion".to_string(), 1)])
}

const PLAYTEST_TRACE_LIMIT: usize = 200;
const PLAYTEST_FPS: f64 = 60.0;

/// BFS flood-fill helper.  Returns the list of tile positions reachable from
/// `(start_x, start_y)` that all share `seed_tile` as their current tile ID
/// (or are empty when `seed_tile` is `None`).  The result is bounded to the
/// supplied canvas dimensions and capped at 2 048 cells.
fn flood_fill_points(
    tiles: &HashMap<(i32, i32), TileId>,
    start_x: i32,
    start_y: i32,
    seed_tile: Option<TileId>,
    canvas_cols: i32,
    canvas_rows: i32,
) -> Vec<(i32, i32)> {
    const MAX_FILL: usize = 2048;
    let mut visited = std::collections::HashSet::new();
    let mut queue = VecDeque::new();
    let mut fill = Vec::new();

    visited.insert((start_x, start_y));
    queue.push_back((start_x, start_y));

    while let Some((x, y)) = queue.pop_front() {
        if fill.len() >= MAX_FILL {
            break;
        }
        if x < 0 || y < 0 || x >= canvas_cols || y >= canvas_rows {
            continue;
        }
        if tiles.get(&(x, y)).copied() != seed_tile {
            continue;
        }
        fill.push((x, y));
        for (dx, dy) in [(-1i32, 0i32), (1, 0), (0, -1), (0, 1)] {
            let next = (x + dx, y + dy);
            if visited.insert(next) {
                queue.push_back(next);
            }
        }
    }
    fill
}

#[cfg(test)]
mod tests {
    use script_core::{ScriptEdge, ScriptGraph, ScriptNode, ScriptNodeBehavior, ScriptNodeKind};

    use super::*;

    #[test]
    fn runtime_create_move_undo_redo_flow() {
        let mut runtime = EditorRuntime::default();
        let created = runtime
            .create_map_entity("Player", Position { x: 1, y: 2 })
            .expect("create");
        assert_eq!(
            runtime.map_entities()[&created].position,
            Position { x: 1, y: 2 }
        );

        runtime
            .move_map_entity(created, Position { x: 9, y: 8 })
            .expect("move");
        assert_eq!(
            runtime.map_entities()[&created].position,
            Position { x: 9, y: 8 }
        );

        runtime.undo_active_context().expect("undo");
        assert_eq!(
            runtime.map_entities()[&created].position,
            Position { x: 1, y: 2 }
        );

        runtime.redo_active_context().expect("redo");
        assert_eq!(
            runtime.map_entities()[&created].position,
            Position { x: 9, y: 8 }
        );
    }

    #[test]
    fn runtime_batch_move_creates_single_undo_step() {
        let mut runtime = EditorRuntime::default();
        let a = runtime
            .create_map_entity("A", Position { x: 0, y: 0 })
            .expect("create A");
        let b = runtime
            .create_map_entity("B", Position { x: 10, y: 10 })
            .expect("create B");

        runtime
            .batch_move_map_entities(vec![
                (a, Position { x: 1, y: 1 }),
                (b, Position { x: 11, y: 11 }),
            ])
            .expect("batch move");
        assert_eq!(runtime.map_entities()[&a].position, Position { x: 1, y: 1 });
        assert_eq!(
            runtime.map_entities()[&b].position,
            Position { x: 11, y: 11 }
        );

        runtime.undo_active_context().expect("undo batch");
        assert_eq!(runtime.map_entities()[&a].position, Position { x: 0, y: 0 });
        assert_eq!(
            runtime.map_entities()[&b].position,
            Position { x: 10, y: 10 }
        );
    }

    #[test]
    fn runtime_reselect_previous_works_in_map_context() {
        let mut runtime = EditorRuntime::default();
        let a = runtime
            .create_map_entity("A", Position { x: 0, y: 0 })
            .expect("create A");
        let b = runtime
            .create_map_entity("B", Position { x: 10, y: 10 })
            .expect("create B");

        runtime.session_mut().set_selection(vec![a, b]);
        runtime.session_mut().set_selection(vec![b]);
        let reselected = runtime.reselect_previous().expect("reselect");
        assert_eq!(reselected, vec![a, b]);
    }

    #[test]
    fn undo_create_clears_invalid_selection() {
        let mut runtime = EditorRuntime::default();
        let created = runtime
            .create_map_entity("Temp", Position { x: 0, y: 0 })
            .expect("create");
        assert_eq!(runtime.session().current_selection(), &[created]);

        runtime.undo_active_context().expect("undo create");
        assert!(runtime.map_entities().is_empty());
        assert!(runtime.session().current_selection().is_empty());
    }

    #[test]
    fn runtime_exposes_undo_redo_capabilities() {
        let mut runtime = EditorRuntime::default();
        assert!(!runtime.map_can_undo());
        assert!(!runtime.map_can_redo());

        let id = runtime
            .create_map_entity("A", Position { x: 0, y: 0 })
            .expect("create");
        runtime
            .move_map_entity(id, Position { x: 4, y: 0 })
            .expect("move");

        assert!(runtime.map_can_undo());
        runtime.undo_active_context().expect("undo");
        assert!(runtime.map_can_redo());
    }

    #[test]
    fn runtime_delete_selection_supports_undo_redo() {
        let mut runtime = EditorRuntime::default();
        let a = runtime
            .create_map_entity("A", Position { x: 0, y: 0 })
            .expect("create A");
        let b = runtime
            .create_map_entity("B", Position { x: 4, y: 0 })
            .expect("create B");
        runtime.session_mut().set_selection(vec![a, b]);

        runtime
            .delete_map_entities(vec![a, b])
            .expect("delete selection");
        assert!(runtime.map_entities().is_empty());
        assert!(runtime.session().current_selection().is_empty());

        runtime.undo_active_context().expect("undo delete");
        assert_eq!(runtime.map_entities().len(), 2);

        runtime.redo_active_context().expect("redo delete");
        assert!(runtime.map_entities().is_empty());
    }

    #[test]
    fn prefab_entity_components_restore_after_undo_redo_create() {
        let mut runtime = EditorRuntime::default();
        runtime
            .prefab_create(
                "enemy_slime".to_string(),
                "Slime".to_string(),
                EntityComponents {
                    collision: Some(engine_core::CollisionBox::new(8, 8)),
                    ..Default::default()
                },
            )
            .expect("create prefab");
        let entity_id = runtime
            .create_map_entity_from_prefab("enemy_slime", 12, 34, None)
            .expect("create prefab entity");
        assert!(runtime.component_store().get(entity_id).is_some());

        runtime.undo_active_context().expect("undo prefab create");
        assert!(runtime.map_entities().is_empty());
        assert!(runtime.component_store().get(entity_id).is_none());

        runtime.redo_active_context().expect("redo prefab create");
        assert!(runtime.map_entities().contains_key(&entity_id));
        assert!(runtime.component_store().get(entity_id).is_some());
    }

    #[test]
    fn components_restore_after_delete_undo_for_existing_entity() {
        let mut runtime = EditorRuntime::default();
        let entity_id = runtime
            .create_map_entity("Guard", Position { x: 2, y: 3 })
            .expect("create guard");
        runtime.component_store_mut().set(
            entity_id,
            EntityComponents {
                collision: Some(engine_core::CollisionBox::new(12, 12)),
                ..Default::default()
            },
        );
        assert!(runtime.component_store().get(entity_id).is_some());

        runtime
            .delete_map_entities(vec![entity_id])
            .expect("delete guard");
        assert!(!runtime.map_entities().contains_key(&entity_id));
        assert!(runtime.component_store().get(entity_id).is_none());

        runtime.undo_active_context().expect("undo guard delete");
        assert!(runtime.map_entities().contains_key(&entity_id));
        assert!(runtime.component_store().get(entity_id).is_some());
    }

    #[test]
    fn runtime_reset_map_clears_state_and_history() {
        let mut runtime = EditorRuntime::default();
        runtime
            .create_map_entity("A", Position { x: 0, y: 0 })
            .expect("create");
        runtime.paint_map_tile(1, 2, 1).expect("paint");
        assert!(!runtime.map_entities().is_empty());
        assert!(!runtime.map_tiles().is_empty());
        assert!(runtime.map_can_undo());

        runtime.reset_map();
        assert!(runtime.map_entities().is_empty());
        assert!(runtime.map_tiles().is_empty());
        assert!(runtime.session().current_selection().is_empty());
        assert!(!runtime.map_can_undo());
        assert!(!runtime.map_can_redo());
    }

    #[test]
    fn runtime_paint_erase_tile_supports_undo_redo() {
        let mut runtime = EditorRuntime::default();
        runtime.paint_map_tile(4, 5, 1).expect("paint");
        assert_eq!(runtime.map_tiles().get(&(4, 5)), Some(&1));

        runtime.erase_map_tile(4, 5).expect("erase");
        assert!(!runtime.map_tiles().contains_key(&(4, 5)));

        runtime.undo_active_context().expect("undo erase");
        assert_eq!(runtime.map_tiles().get(&(4, 5)), Some(&1));

        runtime.undo_active_context().expect("undo paint");
        assert!(!runtime.map_tiles().contains_key(&(4, 5)));
    }

    #[test]
    fn runtime_paint_tile_batch_is_single_undo_step() {
        let mut runtime = EditorRuntime::default();
        runtime
            .paint_map_tiles(vec![(1, 1), (2, 1), (3, 1)], 1)
            .expect("paint batch");
        assert_eq!(runtime.map_tiles().len(), 3);
        assert!(runtime.map_can_undo());

        runtime.undo_active_context().expect("undo batch");
        assert!(runtime.map_tiles().is_empty());
    }

    #[test]
    fn runtime_fill_map_tiles_fills_empty_region() {
        // Fill from (0,0) on a blank 4×4 canvas — should paint all 16 cells.
        let mut runtime = EditorRuntime::default();
        runtime.fill_map_tiles(0, 0, 1, 4, 4).expect("fill");
        assert_eq!(runtime.map_tiles().len(), 16);
        assert_eq!(runtime.map_tiles().get(&(0, 0)), Some(&1));
        assert_eq!(runtime.map_tiles().get(&(3, 3)), Some(&1));
    }

    #[test]
    fn runtime_fill_map_tiles_respects_boundary() {
        // Paint a ring of tile 1 around tile 2 seed; fill with tile 3 should
        // be bounded by tile 1 walls and leave the exterior unchanged.
        let mut runtime = EditorRuntime::default();
        // Build a 3×3 border of tile 1 with empty centre at (1,1).
        for x in 0..3i32 {
            for y in 0..3i32 {
                if x == 1 && y == 1 { continue; }
                runtime.paint_map_tile(x, y, 1).expect("paint border");
            }
        }
        // Seed from inside (1,1) — empty cell — fill with tile 2.
        runtime.fill_map_tiles(1, 1, 2, 3, 3).expect("fill");
        assert_eq!(runtime.map_tiles().get(&(1, 1)), Some(&2));
        // Boundary tiles must be unchanged.
        assert_eq!(runtime.map_tiles().get(&(0, 0)), Some(&1));
    }

    #[test]
    fn runtime_fill_map_tiles_noop_when_target_matches_seed() {
        let mut runtime = EditorRuntime::default();
        runtime.paint_map_tile(2, 2, 5).expect("paint");
        // Filling with the same tile ID as the seed is a no-op.
        runtime.fill_map_tiles(2, 2, 5, 10, 10).expect("fill");
        // Only the initial paint is present; tile count unchanged.
        assert_eq!(runtime.map_tiles().len(), 1);
        assert_eq!(runtime.map_tiles().get(&(2, 2)), Some(&5));
        // One undo reverts the initial paint (fill added no undo step).
        runtime.undo_active_context().expect("undo");
        assert!(runtime.map_tiles().is_empty());
    }

    #[test]
    fn runtime_fill_map_tiles_is_single_undo_step() {
        let mut runtime = EditorRuntime::default();
        // Fill a 3×3 blank canvas.
        runtime.fill_map_tiles(0, 0, 7, 3, 3).expect("fill");
        assert_eq!(runtime.map_tiles().len(), 9);

        // One undo should revert all 9 cells atomically.
        runtime.undo_active_context().expect("undo fill");
        assert!(runtime.map_tiles().is_empty());
    }

    #[test]
    fn runtime_playtest_lifecycle_is_stateful() {
        let mut runtime = EditorRuntime::default();
        assert!(!runtime.playtest_state().active);

        runtime.enter_playtest();
        assert!(runtime.playtest_state().active);
        assert_eq!(runtime.playtest_state().speed, 1.0);

        runtime.set_playtest_speed(0.5);
        runtime.toggle_playtest_pause();
        runtime.step_playtest_frame();
        let state = runtime.playtest_state();
        assert!(state.paused);
        assert_eq!(state.speed, 0.5);
        assert_eq!(state.frame, 1);

        runtime.exit_playtest();
        assert_eq!(runtime.playtest_state(), PlaytestState::default());
    }

    #[test]
    fn runtime_playtest_tick_advances_frame_by_speed() {
        let mut runtime = EditorRuntime::default();
        runtime.enter_playtest();

        let steps = runtime.tick_playtest(1000);
        assert!(steps >= 59);
        assert!(runtime.playtest_state().frame >= 59);

        runtime.set_playtest_speed(0.5);
        let before = runtime.playtest_state().frame;
        let half_steps = runtime.tick_playtest(1000);
        assert!(half_steps >= 29);
        assert!(runtime.playtest_state().frame >= before + 29);

        runtime.toggle_playtest_pause();
        let paused_steps = runtime.tick_playtest(1000);
        assert_eq!(paused_steps, 0);
    }

    #[test]
    fn runtime_trace_capture_respects_toggle() {
        let mut runtime = EditorRuntime::default();
        runtime.enter_playtest();
        assert!(runtime.playtest_trace().is_empty());

        runtime.set_playtest_trace_enabled(true);
        let _ = runtime.tick_playtest(1000);
        assert!(!runtime.playtest_trace().is_empty());
    }

    #[test]
    fn runtime_trace_buffer_keeps_fifo_order_with_limit() {
        let mut runtime = EditorRuntime::default();
        runtime.set_playtest_trace_enabled(true);
        for idx in 0..(PLAYTEST_TRACE_LIMIT + 25) {
            runtime.push_playtest_trace("test", &format!("event-{idx}"));
        }

        assert_eq!(runtime.playtest_trace().len(), PLAYTEST_TRACE_LIMIT);
        let first = runtime.playtest_trace().front().expect("first trace");
        let last = runtime.playtest_trace().back().expect("last trace");
        assert_eq!(first.message, "event-25");
        assert_eq!(last.message, format!("event-{}", PLAYTEST_TRACE_LIMIT + 24));
    }

    #[test]
    fn runtime_breakpoint_event_pauses_and_captures_watch_updates() {
        let mut runtime = EditorRuntime::default();
        runtime.enter_playtest();
        runtime.set_playtest_breakpoints(vec!["item_pickup".to_string()]);

        let steps = runtime.tick_playtest(3000);
        assert!(steps > 0);
        assert!(runtime.playtest_state().paused);
        assert_eq!(
            runtime
                .last_breakpoint_hit()
                .map(|event| event.kind.as_str()),
            Some("breakpoint:item_pickup")
        );
        assert_eq!(
            runtime.core_watch_flags().get("player_has_key").copied(),
            Some(true)
        );
        assert_eq!(
            runtime.core_watch_inventory().get("key_item").copied(),
            Some(1)
        );

        let frame_before = runtime.playtest_state().frame;
        let paused_steps = runtime.tick_playtest(1000);
        assert_eq!(paused_steps, 0);
        assert_eq!(runtime.playtest_state().frame, frame_before);
    }

    #[test]
    fn runtime_tick_inactive_updates_last_tick_fields() {
        let mut runtime = EditorRuntime::default();
        let steps = runtime.tick_playtest(250);
        let state = runtime.playtest_state();
        assert_eq!(steps, 0);
        assert_eq!(state.last_tick_delta_ms, 250);
        assert_eq!(state.last_tick_steps, 0);
    }

    #[test]
    fn runtime_quest_breakpoint_triggers_and_can_resume() {
        let mut runtime = EditorRuntime::default();
        runtime.enter_playtest();
        runtime.set_playtest_breakpoints(vec!["quest_state".to_string()]);

        let steps = runtime.tick_playtest(6000);
        assert!(steps > 0);
        assert!(runtime.playtest_state().paused);
        assert_eq!(
            runtime
                .last_breakpoint_hit()
                .map(|event| event.kind.as_str()),
            Some("breakpoint:quest_state")
        );
        assert_eq!(
            runtime
                .core_watch_flags()
                .get("quest_intro_completed")
                .copied(),
            Some(true)
        );
        assert_eq!(
            runtime.core_watch_variables().get("quest_stage").copied(),
            Some(1)
        );

        runtime.toggle_playtest_pause();
        let before = runtime.playtest_state().frame;
        let resumed_steps = runtime.tick_playtest(1000);
        assert!(resumed_steps > 0);
        assert!(runtime.playtest_state().frame > before);
    }

    #[test]
    fn runtime_breakpoint_priority_prefers_item_over_tick() {
        let mut runtime = EditorRuntime::default();
        runtime.enter_playtest();
        runtime
            .set_playtest_breakpoints(vec!["item_pickup".to_string(), "playtest_tick".to_string()]);

        let steps = runtime.tick_playtest(3000);
        assert!(steps > 0);
        assert!(runtime.playtest_state().paused);
        assert_eq!(
            runtime
                .last_breakpoint_hit()
                .map(|event| event.kind.as_str()),
            Some("breakpoint:item_pickup")
        );
    }

    #[test]
    fn runtime_set_breakpoints_clears_previous_breakpoint_hit() {
        let mut runtime = EditorRuntime::default();
        runtime.enter_playtest();
        runtime.set_playtest_breakpoints(vec!["playtest_tick".to_string()]);
        let _ = runtime.tick_playtest(1000);
        assert!(runtime.last_breakpoint_hit().is_some());

        runtime.set_playtest_breakpoints(vec!["quest_state".to_string()]);
        assert!(runtime.last_breakpoint_hit().is_none());
    }

    #[test]
    fn runtime_paused_tick_keeps_timing_accumulator_for_resume() {
        let mut runtime = EditorRuntime::default();
        runtime.enter_playtest();

        let initial_steps = runtime.tick_playtest(8);
        assert_eq!(initial_steps, 0);
        assert_eq!(runtime.playtest_state().frame, 0);

        runtime.toggle_playtest_pause();
        let paused_steps = runtime.tick_playtest(1000);
        assert_eq!(paused_steps, 0);
        assert_eq!(runtime.playtest_state().frame, 0);

        runtime.toggle_playtest_pause();
        let resumed_steps = runtime.tick_playtest(9);
        assert!(
            resumed_steps >= 1,
            "expected accumulator carry-over to produce at least one step after resume"
        );
        assert!(runtime.playtest_state().frame >= 1);
    }

    #[test]
    fn runtime_exposes_watch_flags_and_selected_entity() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("WatchMe", Position { x: 5, y: 6 })
            .expect("create entity");
        runtime.set_map_selection(vec![id]);
        let selected = runtime.selected_entity().expect("selected entity");
        assert_eq!(selected.name, "WatchMe");

        runtime.enter_playtest();
        assert!(*runtime
            .core_watch_flags()
            .get("has_started_playtest")
            .expect("watch key"));

        let selected_flags = runtime.selected_entity_watch_flags();
        assert!(selected_flags.contains_key("selected_in_viewport"));
        let selected_vars = runtime.selected_entity_watch_variables();
        assert_eq!(selected_vars.get("selected_id"), Some(&(id as i64)));
        let selected_inventory = runtime.selected_entity_watch_inventory();
        assert_eq!(selected_inventory.get("selected_debug_tag"), Some(&1));
    }

    // ── Script runtime integration tests ────────────────────────────────

    fn make_interact_graph() -> ScriptGraph {
        ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "ev".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: Some(ScriptNodeBehavior::OnEvent {
                        event: "interact".to_string(),
                    }),
                },
                ScriptNode {
                    id: "set_door".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: Some(ScriptNodeBehavior::SetFlag {
                        flag: "door_open".to_string(),
                        value: true,
                        scope: StateScope::Global,
                    }),
                },
            ],
            edges: vec![ScriptEdge {
                from: "ev".to_string(),
                to: "set_door".to_string(),
                label: None,
            }],
        }
    }

    fn make_tick_graph() -> ScriptGraph {
        ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "ev".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: Some(ScriptNodeBehavior::OnEvent {
                        event: "playtest_tick".to_string(),
                    }),
                },
                ScriptNode {
                    id: "set_score".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: Some(ScriptNodeBehavior::SetVariable {
                        variable: "tick_counter".to_string(),
                        value: 1,
                        scope: StateScope::Global,
                    }),
                },
            ],
            edges: vec![ScriptEdge {
                from: "ev".to_string(),
                to: "set_score".to_string(),
                label: None,
            }],
        }
    }

    #[test]
    fn script_load_and_fire_event_sets_watch_flag() {
        let mut runtime = EditorRuntime::default();
        let events = runtime.load_script_graph(&make_interact_graph());
        assert!(events.contains(&"interact".to_string()));
        assert!(runtime.has_script_graph());

        runtime.enter_playtest();
        let result = runtime.fire_script_event("interact");
        assert_eq!(result.effects.len(), 1);
        assert_eq!(
            runtime.core_watch_flags().get("door_open").copied(),
            Some(true)
        );
        assert!(runtime.script_state().get_flag("door_open"));
    }

    #[test]
    fn script_fire_event_without_graph_is_noop() {
        let mut runtime = EditorRuntime::default();
        assert!(!runtime.has_script_graph());
        let result = runtime.fire_script_event("interact");
        assert!(result.effects.is_empty());
    }

    #[test]
    fn script_unload_clears_graph_and_state() {
        let mut runtime = EditorRuntime::default();
        runtime.load_script_graph(&make_interact_graph());
        runtime.fire_script_event("interact");
        assert!(runtime.script_state().get_flag("door_open"));

        runtime.unload_script_graph();
        assert!(!runtime.has_script_graph());
        assert!(!runtime.script_state().get_flag("door_open"));
    }

    #[test]
    fn script_state_resets_on_enter_playtest() {
        let mut runtime = EditorRuntime::default();
        runtime.load_script_graph(&make_interact_graph());
        runtime.fire_script_event("interact");
        assert!(runtime.script_state().get_flag("door_open"));

        runtime.enter_playtest();
        assert!(!runtime.script_state().get_flag("door_open"));
    }

    #[test]
    fn script_state_resets_on_exit_playtest() {
        let mut runtime = EditorRuntime::default();
        runtime.load_script_graph(&make_interact_graph());
        runtime.enter_playtest();
        runtime.fire_script_event("interact");
        assert!(runtime.script_state().get_flag("door_open"));

        runtime.exit_playtest();
        assert!(!runtime.script_state().get_flag("door_open"));
    }

    #[test]
    fn script_tick_event_fires_during_playtest_tick() {
        let mut runtime = EditorRuntime::default();
        runtime.load_script_graph(&make_tick_graph());
        runtime.enter_playtest();

        let steps = runtime.tick_playtest(1000);
        assert!(steps > 0);
        // The tick graph sets tick_counter=1 via playtest_tick event
        assert_eq!(
            runtime.core_watch_variables().get("tick_counter").copied(),
            Some(1)
        );
        assert_eq!(runtime.script_state().get_variable("tick_counter"), 1);
    }

    #[test]
    fn script_effects_appear_in_playtest_trace() {
        let mut runtime = EditorRuntime::default();
        runtime.load_script_graph(&make_interact_graph());
        runtime.set_playtest_trace_enabled(true);
        runtime.enter_playtest();
        runtime.fire_script_event("interact");

        let trace_messages: Vec<_> = runtime
            .playtest_trace()
            .iter()
            .map(|t| t.kind.clone())
            .collect();
        assert!(
            trace_messages.contains(&"script_flag".to_string()),
            "expected script_flag trace event, got: {:?}",
            trace_messages
        );
    }

    #[test]
    fn script_scene_change_triggers_breakpoint() {
        let graph = ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "ev".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: Some(ScriptNodeBehavior::OnEvent {
                        event: "exit_door".to_string(),
                    }),
                },
                ScriptNode {
                    id: "go".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: Some(ScriptNodeBehavior::ChangeScene {
                        target_scene: "level_2".to_string(),
                        spawn_point: None,
                    }),
                },
            ],
            edges: vec![ScriptEdge {
                from: "ev".to_string(),
                to: "go".to_string(),
                label: None,
            }],
        };

        let mut runtime = EditorRuntime::default();
        runtime.load_script_graph(&graph);
        runtime.enter_playtest();
        runtime.set_playtest_breakpoints(vec!["script_event".to_string()]);
        runtime.set_playtest_trace_enabled(true);

        runtime.fire_script_event("exit_door");
        assert!(runtime.playtest_state().paused);
        assert_eq!(
            runtime
                .last_breakpoint_hit()
                .map(|e| e.kind.as_str()),
            Some("breakpoint:script_event")
        );
    }

    #[test]
    fn script_breakpoint_default_is_registered() {
        let runtime = EditorRuntime::default();
        assert!(runtime
            .playtest_breakpoints()
            .contains_key("script_event"));
    }

    // ── Scene management integration tests ──────────────────────────────

    #[test]
    fn scene_add_and_lookup() {
        let mut runtime = EditorRuntime::default();
        assert!(runtime.scene_collection().is_empty());

        let id = runtime.add_scene(Scene::new("overworld", "Overworld"));
        assert_eq!(id, "overworld");
        assert_eq!(runtime.scene_collection().scene_count(), 1);
        assert_eq!(runtime.active_scene_id(), Some("overworld"));
    }

    #[test]
    fn scene_switch_active() {
        let mut runtime = EditorRuntime::default();
        runtime.add_scene(Scene::new("a", "A"));
        runtime.add_scene(Scene::new("b", "B"));

        assert!(runtime.set_active_scene("b"));
        assert_eq!(runtime.active_scene_id(), Some("b"));
        assert!(!runtime.set_active_scene("nonexistent"));
        assert_eq!(runtime.active_scene_id(), Some("b"));
    }

    #[test]
    fn scene_remove_falls_back() {
        let mut runtime = EditorRuntime::default();
        runtime.add_scene(Scene::new("a", "A"));
        runtime.add_scene(Scene::new("b", "B"));

        let removed = runtime.remove_scene("a");
        assert!(removed.is_some());
        assert_eq!(runtime.scene_collection().scene_count(), 1);
        // Active falls back to remaining scene
        assert!(runtime.active_scene_id().is_some());
    }

    #[test]
    fn scene_transition_during_playtest() {
        let mut runtime = EditorRuntime::default();
        let mut scene = Scene::new("dungeon", "Dungeon");
        scene.add_spawn_point("entrance", Position { x: 32, y: 64 });
        runtime.add_scene(scene);
        runtime.add_scene(Scene::new("overworld", "Overworld"));
        runtime.set_active_scene("overworld");

        runtime.enter_playtest();
        assert_eq!(runtime.active_playtest_scene(), Some("overworld"));

        let pos = runtime.transition_to_scene("dungeon", Some("entrance"));
        assert_eq!(pos, Some(Position { x: 32, y: 64 }));
        // Scene doesn't swap immediately — FadeOut must complete first
        assert!(runtime.transition_state().active);
        assert_eq!(runtime.active_playtest_scene(), Some("overworld"));

        // Tick through FadeOut (15 ticks)
        for _ in 0..15 {
            runtime.tick_playtest(17);
        }
        // After FadeOut, scene swaps and FadeIn starts
        assert_eq!(runtime.active_playtest_scene(), Some("dungeon"));
    }

    #[test]
    fn scene_transition_to_missing_scene_returns_none() {
        let mut runtime = EditorRuntime::default();
        runtime.enter_playtest();
        let pos = runtime.transition_to_scene("nonexistent", None);
        assert!(pos.is_none());
        assert!(runtime.active_playtest_scene().is_none());
    }

    #[test]
    fn scene_playtest_scene_clears_on_exit() {
        let mut runtime = EditorRuntime::default();
        runtime.add_scene(Scene::new("level", "Level"));
        runtime.enter_playtest();
        assert_eq!(runtime.active_playtest_scene(), Some("level"));

        runtime.exit_playtest();
        assert!(runtime.active_playtest_scene().is_none());
    }

    #[test]
    fn scene_change_effect_transitions_when_scene_exists() {
        let mut runtime = EditorRuntime::default();
        let mut scene = Scene::new("level_2", "Level 2");
        scene.add_spawn_point("door", Position { x: 100, y: 50 });
        runtime.add_scene(scene);

        // Build a graph that fires a ChangeScene effect
        let graph = ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "ev".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: Some(ScriptNodeBehavior::OnEvent {
                        event: "exit_door".to_string(),
                    }),
                },
                ScriptNode {
                    id: "go".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: Some(ScriptNodeBehavior::ChangeScene {
                        target_scene: "level_2".to_string(),
                        spawn_point: Some("door".to_string()),
                    }),
                },
            ],
            edges: vec![ScriptEdge {
                from: "ev".to_string(),
                to: "go".to_string(),
                label: None,
            }],
        };

        runtime.load_script_graph(&graph);
        runtime.enter_playtest();
        runtime.set_playtest_trace_enabled(true);
        runtime.fire_script_event("exit_door");

        // Transition started but scene hasn't swapped yet (FadeOut in progress)
        assert!(runtime.transition_state().active);
        // Check trace includes a scene_transition event (not script_scene_change)
        let has_transition = runtime
            .playtest_trace()
            .iter()
            .any(|t| t.kind == "scene_transition");
        assert!(has_transition, "expected scene_transition trace event");

        // Tick through FadeOut to complete the scene swap
        for _ in 0..15 {
            runtime.tick_playtest(17);
        }
        assert_eq!(runtime.active_playtest_scene(), Some("level_2"));
    }

    #[test]
    fn scene_change_effect_logs_missing_scene() {
        let mut runtime = EditorRuntime::default();

        // Build a graph that tries to change to a nonexistent scene
        let graph = ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "ev".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: Some(ScriptNodeBehavior::OnEvent {
                        event: "exit_door".to_string(),
                    }),
                },
                ScriptNode {
                    id: "go".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: Some(ScriptNodeBehavior::ChangeScene {
                        target_scene: "missing".to_string(),
                        spawn_point: None,
                    }),
                },
            ],
            edges: vec![ScriptEdge {
                from: "ev".to_string(),
                to: "go".to_string(),
                label: None,
            }],
        };

        runtime.load_script_graph(&graph);
        runtime.enter_playtest();
        runtime.set_playtest_trace_enabled(true);
        runtime.fire_script_event("exit_door");

        // Should NOT have transitioned
        assert!(runtime.active_playtest_scene().is_none());
        // Should have logged "scene not found"
        let has_not_found = runtime
            .playtest_trace()
            .iter()
            .any(|t| t.kind == "script_scene_change" && t.message.contains("scene not found"));
        assert!(has_not_found, "expected script_scene_change with 'scene not found'");
    }

    // ── Movement + Input integration tests ──────────────────────────────

    #[test]
    fn movement_with_input_moves_entity_during_playtest() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("Player", Position { x: 0, y: 0 })
            .expect("create");

        // Give entity a movement component
        runtime
            .component_store_mut()
            .set_movement(id, engine_core::MovementComponent::grid_snap(8.0));
        // Give entity a collision box for collision checks
        runtime
            .component_store_mut()
            .set_collision(id, engine_core::CollisionBox::new(8, 8));

        runtime.enter_playtest();

        // Press right arrow
        runtime.playtest_key_down(KeyCode::ArrowRight);

        // Tick enough to trigger movement
        let steps = runtime.tick_playtest(500);
        assert!(steps > 0);

        // Entity should have moved right
        let pos = runtime.map_entities()[&id].position;
        assert!(pos.x > 0, "expected entity to move right, got x={}", pos.x);
    }

    #[test]
    fn movement_blocked_by_solid_tile() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("Player", Position { x: 0, y: 0 })
            .expect("create");

        // Movement + collision
        let mut mc = engine_core::MovementComponent::grid_snap(8.0);
        mc.step_cooldown = 0;
        mc.step_interval = 0; // instant steps for testing
        runtime.component_store_mut().set_movement(id, mc);
        runtime
            .component_store_mut()
            .set_collision(id, engine_core::CollisionBox::new(8, 8));

        // Place a solid tile directly to the right (at tile 1,0 = pixel 8,0)
        runtime.paint_map_tile(1, 0, 1).expect("paint solid tile");
        // Tile ID 1 is solid by default

        runtime.enter_playtest();
        runtime.playtest_key_down(KeyCode::ArrowRight);

        let _ = runtime.tick_playtest(100);

        // Entity should be blocked by the solid tile
        let pos = runtime.map_entities()[&id].position;
        assert_eq!(pos, Position { x: 0, y: 0 }, "expected entity to be blocked by solid tile");
    }

    #[test]
    fn movement_not_blocked_by_non_solid_tile() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("Player", Position { x: 0, y: 0 })
            .expect("create");

        let mut mc = engine_core::MovementComponent::grid_snap(8.0);
        mc.step_cooldown = 0;
        mc.step_interval = 0;
        runtime.component_store_mut().set_movement(id, mc);
        runtime
            .component_store_mut()
            .set_collision(id, engine_core::CollisionBox::new(8, 8));

        // Place a non-solid tile (decoration) to the right
        runtime.paint_map_tile(1, 0, 5).expect("paint tile");
        runtime
            .map_state
            .tile_properties_mut()
            .set(5, engine_core::TileProperties { solid: false });

        runtime.enter_playtest();
        runtime.playtest_key_down(KeyCode::ArrowRight);

        let _ = runtime.tick_playtest(100);

        let pos = runtime.map_entities()[&id].position;
        assert!(
            pos.x > 0,
            "expected entity to pass through non-solid tile, got x={}",
            pos.x
        );
    }

    #[test]
    fn input_state_resets_on_playtest_enter() {
        let mut runtime = EditorRuntime::default();
        runtime.playtest_key_down(KeyCode::ArrowUp);
        assert!(runtime.input_state().is_held(engine_core::InputAction::MoveUp));

        runtime.enter_playtest();
        assert!(!runtime.input_state().is_held(engine_core::InputAction::MoveUp));
    }

    // ── Physics integration tests ───────────────────────────────────────

    #[test]
    fn physics_entity_falls_with_gravity() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("Ball", Position { x: 40, y: 0 })
            .expect("create");

        // Give entity velocity + collision
        runtime
            .component_store_mut()
            .set_velocity(id, engine_core::VelocityComponent::new(8.0));
        runtime
            .component_store_mut()
            .set_collision(id, engine_core::CollisionBox::new(8, 8));

        // Enable gravity
        runtime.set_physics_config(engine_core::PhysicsConfig::platformer());

        runtime.enter_playtest();
        // Tick multiple times so gravity accumulates velocity past the rounding threshold
        for _ in 0..10 {
            let _ = runtime.tick_playtest(17); // ~60fps frame time
        }

        // Entity should have fallen (y increased)
        let pos = runtime.map_entities()[&id].position;
        assert!(pos.y > 0, "expected entity to fall with gravity, got y={}", pos.y);
    }

    #[test]
    fn physics_entity_stops_on_solid_tile() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("Ball", Position { x: 40, y: 0 })
            .expect("create");

        runtime
            .component_store_mut()
            .set_velocity(id, engine_core::VelocityComponent::new(8.0));
        runtime
            .component_store_mut()
            .set_collision(id, engine_core::CollisionBox::new(8, 8));

        // Place solid tile directly below (tile row 1 = pixel y=8)
        runtime.paint_map_tile(5, 1, 1).expect("paint floor");

        runtime.set_physics_config(engine_core::PhysicsConfig::platformer());
        runtime.enter_playtest();
        // Tick multiple times
        for _ in 0..20 {
            let _ = runtime.tick_playtest(17);
        }

        // Entity should be blocked from falling past y=0 by the solid tile at y=8
        let pos = runtime.map_entities()[&id].position;
        assert!(pos.y < 16, "expected entity to be stopped by floor tile, got y={}", pos.y);
    }

    #[test]
    fn physics_config_set_and_read() {
        let mut runtime = EditorRuntime::default();
        assert_eq!(runtime.physics_config().gravity, 0.0);

        runtime.set_physics_config(engine_core::PhysicsConfig::platformer());
        assert_eq!(runtime.physics_config().gravity, 0.4);
        assert_eq!(runtime.physics_config().friction, 0.9);
    }

    // ── Input → Script events integration test ──────────────────────────

    #[test]
    fn input_action_a_fires_script_event() {
        let mut runtime = EditorRuntime::default();

        // Build a graph listening for "action_a"
        let graph = ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "ev".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: Some(ScriptNodeBehavior::OnEvent {
                        event: "action_a".to_string(),
                    }),
                },
                ScriptNode {
                    id: "act".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: Some(ScriptNodeBehavior::SetFlag {
                        flag: "action_fired".to_string(),
                        value: true,
                        scope: StateScope::Global,
                    }),
                },
            ],
            edges: vec![ScriptEdge {
                from: "ev".to_string(),
                to: "act".to_string(),
                label: None,
            }],
        };

        runtime.load_script_graph(&graph);
        runtime.enter_playtest();

        // Press Z (default mapping: KeyZ -> ActionA)
        runtime.playtest_key_down(KeyCode::KeyZ);

        // Tick to process input → script event
        let _ = runtime.tick_playtest(100);

        assert_eq!(
            runtime.core_watch_flags().get("action_fired").copied(),
            Some(true),
            "expected action_a script event to fire and set flag"
        );
    }

    #[test]
    fn input_movement_keys_do_not_fire_script_events() {
        let mut runtime = EditorRuntime::default();

        // Build a graph listening for movement directions (should never fire)
        let graph = ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "ev".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: Some(ScriptNodeBehavior::OnEvent {
                        event: "move_up".to_string(),
                    }),
                },
                ScriptNode {
                    id: "act".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: Some(ScriptNodeBehavior::SetFlag {
                        flag: "movement_event_fired".to_string(),
                        value: true,
                        scope: StateScope::Global,
                    }),
                },
            ],
            edges: vec![ScriptEdge {
                from: "ev".to_string(),
                to: "act".to_string(),
                label: None,
            }],
        };

        runtime.load_script_graph(&graph);
        runtime.enter_playtest();

        runtime.playtest_key_down(KeyCode::ArrowUp);
        let _ = runtime.tick_playtest(100);

        // Movement keys should NOT fire script events
        assert_ne!(
            runtime.core_watch_flags().get("movement_event_fired").copied(),
            Some(true),
            "movement key should not fire script event"
        );
    }

    // ── Animation state machine integration tests ────────────────────────

    #[test]
    fn animation_frame_advances_and_syncs_sprite_frame() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("Hero", Position { x: 0, y: 0 })
            .expect("create");

        // Attach sprite and animation
        runtime
            .component_store_mut()
            .set_sprite(id, engine_core::SpriteComponent::new("hero_sheet"));
        let clip = engine_core::AnimationClip::new(
            vec![10, 11, 12, 13],
            1, // 1 tick per frame → advances every tick
            engine_core::LoopMode::Loop,
        );
        runtime
            .component_store_mut()
            .set_animation(id, engine_core::AnimationComponent::new("walk", clip));

        runtime.enter_playtest();
        // Tick enough to advance at least 3 frames (3 ticks = 3 frame advances at 1 tick/frame)
        // tick_playtest(1000ms) at 60fps = ~60 steps
        runtime.tick_playtest(1000);

        // Sprite frame should be non-zero (animation advanced)
        let frame = runtime.component_store().sprite(id).map(|s| s.frame);
        assert!(
            frame.is_some_and(|f| f > 0),
            "expected sprite frame to advance past 0, got {:?}",
            frame
        );
    }

    #[test]
    fn animation_once_clip_stops_at_last_frame() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("Fx", Position { x: 0, y: 0 })
            .expect("create");

        runtime
            .component_store_mut()
            .set_sprite(id, engine_core::SpriteComponent::new("fx_sheet"));
        let clip = engine_core::AnimationClip::new(
            vec![0, 1, 2],
            1,
            engine_core::LoopMode::Once,
        );
        runtime
            .component_store_mut()
            .set_animation(id, engine_core::AnimationComponent::new("hit", clip));

        runtime.enter_playtest();
        // Tick many times — Once clip should stop, not wrap
        runtime.tick_playtest(5000);

        let anim = runtime.component_store().animation(id).unwrap();
        assert!(!anim.state.playing, "Once clip should stop playing after finishing");
        // Last frame in clip is frames[2] = 2; sprite.frame should be 2
        let sprite_frame = runtime.component_store().sprite(id).map(|s| s.frame);
        assert_eq!(sprite_frame, Some(2), "sprite should be stuck on last frame");
    }

    #[test]
    fn animation_transition_fires_on_flag_set() {
        let mut runtime = EditorRuntime::default();
        let id = runtime
            .create_map_entity("Player", Position { x: 0, y: 0 })
            .expect("create");

        let idle_clip = engine_core::AnimationClip::new(vec![0], 1, engine_core::LoopMode::Loop);
        let walk_clip = engine_core::AnimationClip::new(vec![1, 2, 3], 1, engine_core::LoopMode::Loop);

        let mut anim = engine_core::AnimationComponent::new("idle", idle_clip);
        anim.clips.insert("walk".to_string(), walk_clip);
        anim.transitions.push(engine_core::AnimationTransition {
            from_state: "idle".to_string(),
            to_state: "walk".to_string(),
            condition: engine_core::TransitionCondition::FlagSet { flag: "is_moving".to_string() },
        });
        runtime.component_store_mut().set_animation(id, anim);

        runtime.enter_playtest();
        // Without the flag, should stay on idle
        runtime.tick_playtest(100);
        assert_eq!(
            runtime.component_store().animation(id).map(|a| a.state.current_clip_name.as_str()),
            Some("idle")
        );

        // Set the flag and tick — should transition to walk
        runtime.script_state.flags.insert("is_moving".to_string(), true);
        runtime.tick_playtest(100);
        assert_eq!(
            runtime.component_store().animation(id).map(|a| a.state.current_clip_name.as_str()),
            Some("walk"),
            "animation should transition to walk when is_moving flag is set"
        );
    }
}
