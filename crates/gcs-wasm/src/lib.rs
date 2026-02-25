use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use engine_core::{
    physics_step, process_movement, step_animations, update_camera, AnimationClip,
    AnimationComponent, AnimationTransition, CameraMode, CameraState, CollisionBox,
    ComponentStore, Entity, EntityComponents, EntityId, InputMapping, InputState, KeyCode,
    LoopMode, MovementComponent, PhysicsConfig, Position, SpriteComponent, TileId,
    TilePropertyRegistry, TransitionCondition, VelocityComponent, would_collide_with_entities,
    would_collide_with_tiles,
};

const PLAYTEST_FPS: f64 = 60.0;
const DEFAULT_TILE_SIZE: u32 = 8;

// ---------------------------------------------------------------------------
// Init payload (JS → WASM on enterPlaytest)
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct InitPayload {
    entities: Vec<EntityInit>,
    tiles: Vec<TileInit>,
    physics: Option<PhysicsInit>,
}

#[derive(Debug, Deserialize)]
struct EntityInit {
    id: u64,
    name: String,
    x: i32,
    y: i32,
    /// If true, a solid CollisionBox is added so other entities cannot pass through.
    #[serde(default)]
    is_solid: bool,
    /// Optional initial velocity for physics-driven entities.
    #[serde(default)]
    velocity: Option<VelocityInit>,
    /// Optional animation clips for this entity.
    #[serde(default)]
    animation: Option<AnimationInit>,
}

#[derive(Debug, Deserialize)]
struct AnimationInit {
    clips: Vec<ClipInit>,
    #[serde(default = "default_initial_clip")]
    initial_clip: String,
    #[serde(default)]
    transitions: Vec<TransitionInit>,
}

fn default_initial_clip() -> String {
    "default".to_string()
}

#[derive(Debug, Deserialize)]
struct ClipInit {
    name: String,
    frames: Vec<u16>,
    #[serde(default = "default_frame_duration")]
    frame_duration_ticks: u32,
    #[serde(default = "default_loop_mode")]
    loop_mode: String,
}

fn default_frame_duration() -> u32 {
    1
}

fn default_loop_mode() -> String {
    "loop".to_string()
}

#[derive(Debug, Deserialize)]
struct TransitionInit {
    from_state: String,
    to_state: String,
    condition: ConditionInit,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum ConditionInit {
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

#[derive(Debug, Deserialize)]
struct VelocityInit {
    vx: f32,
    vy: f32,
    max_speed: f32,
}

#[derive(Debug, Deserialize)]
struct TileInit {
    x: i32,
    y: i32,
    tile_id: u16,
}

#[derive(Debug, Deserialize)]
struct PhysicsInit {
    gravity: f32,
    friction: f32,
}

// ---------------------------------------------------------------------------
// Output snapshot (WASM → JS every tick / get_state)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
struct WasmStateSnapshot {
    frame: u64,
    steps_taken: u64,
    active: bool,
    paused: bool,
    camera_x: f32,
    camera_y: f32,
    camera_mode: String,
    entities: Vec<EntitySnapshot>,
}

#[derive(Debug, Serialize)]
struct EntitySnapshot {
    id: u64,
    name: String,
    x: i32,
    y: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    sprite_frame: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    animation_state: Option<String>,
}

// ---------------------------------------------------------------------------
// WasmRuntime
// ---------------------------------------------------------------------------

/// Playtest-only physics runtime compiled to WebAssembly.
/// Mirrors the movement/physics/camera pipeline from EditorRuntime::tick_playtest
/// without the editor's undo stack, session, or script event system.
#[wasm_bindgen]
pub struct WasmRuntime {
    // Own the entity/tile data directly to avoid needing MapEditorState's private API.
    entities: HashMap<EntityId, Entity>,
    tiles: HashMap<(i32, i32), TileId>,
    tile_props: TilePropertyRegistry,
    component_store: ComponentStore,
    input_state: InputState,
    input_mapping: InputMapping,
    physics_config: PhysicsConfig,
    camera_state: CameraState,
    empty_script_flags: HashMap<String, bool>,
    accumulator_ms: f64,
    frame: u64,
    active: bool,
    paused: bool,
    speed: f32,
}

#[wasm_bindgen]
impl WasmRuntime {
    /// Construct from a JSON InitPayload.
    /// Applies movement + collision defaults for entities named "player" (case-insensitive).
    #[wasm_bindgen(constructor)]
    pub fn new(init_json: &str) -> Result<WasmRuntime, JsValue> {
        let payload: InitPayload = serde_json::from_str(init_json)
            .map_err(|e| JsValue::from_str(&format!("[gcs-wasm] init parse error: {e}")))?;
        Ok(Self::from_payload(payload))
    }

    pub fn enter_playtest(&mut self) {
        self.active = true;
        self.paused = false;
        self.frame = 0;
        self.accumulator_ms = 0.0;
        self.input_state.reset();
    }

    pub fn exit_playtest(&mut self) {
        self.active = false;
        self.paused = false;
        self.input_state.reset();
    }

    /// Register a key-down event. `key_str` must be a snake_case KeyCode name
    /// (e.g. "arrow_up", "key_z") — already produced by mapKeyToGameInput() in JS.
    pub fn key_down(&mut self, key_str: &str) {
        if let Some(key) = parse_keycode(key_str) {
            self.input_state.key_down(key, &self.input_mapping);
        }
    }

    pub fn key_up(&mut self, key_str: &str) {
        if let Some(key) = parse_keycode(key_str) {
            self.input_state.key_up(key, &self.input_mapping);
        }
    }

    /// Advance simulation by `delta_ms` milliseconds.
    /// Returns a JSON WasmStateSnapshot.
    pub fn tick(&mut self, delta_ms: u32) -> String {
        let mut steps_taken: u64 = 0;

        if self.active && !self.paused {
            let speed = (self.speed as f64).max(0.0);
            self.accumulator_ms += (delta_ms as f64) * speed;
            let step_ms = 1000.0 / PLAYTEST_FPS;

            while self.accumulator_ms >= step_ms {
                self.accumulator_ms -= step_ms;
                self.frame = self.frame.saturating_add(1);
                steps_taken = steps_taken.saturating_add(1);
                self.step();
            }

            // Match desktop semantics: clear one-shot input only once per tick_playtest call.
            if steps_taken > 0 {
                self.input_state.tick_reset();
            }
        }

        self.make_snapshot(steps_taken)
    }

    /// Return current state without advancing simulation.
    pub fn get_state(&self) -> String {
        self.make_snapshot(0)
    }

    pub fn toggle_pause(&mut self) {
        self.paused = !self.paused;
    }

    pub fn set_speed(&mut self, speed: f32) {
        self.speed = speed.max(0.0);
    }

    pub fn set_physics_config(&mut self, gravity: f32, friction: f32) {
        self.physics_config.gravity = gravity;
        self.physics_config.friction = friction;
    }

    pub fn set_camera_mode(&mut self, mode: &str) {
        if let Some(m) = parse_camera_mode(mode) {
            self.camera_state.mode = m;
        }
    }
}

// ---------------------------------------------------------------------------
// Private implementation
// ---------------------------------------------------------------------------

impl WasmRuntime {
    fn from_payload(payload: InitPayload) -> Self {
        let mut entities: HashMap<EntityId, Entity> = HashMap::new();
        let mut tiles: HashMap<(i32, i32), TileId> = HashMap::new();
        let mut component_store = ComponentStore::new();

        for t in &payload.tiles {
            tiles.insert((t.x, t.y), t.tile_id);
        }

        let mut camera_target: Option<EntityId> = None;

        for e in &payload.entities {
            entities.insert(
                e.id,
                Entity {
                    id: e.id,
                    name: e.name.clone(),
                    position: Position { x: e.x, y: e.y },
                },
            );

            if e.name.to_lowercase() == "player" {
                component_store.set(
                    e.id,
                    EntityComponents {
                        movement: Some(MovementComponent::grid_snap(DEFAULT_TILE_SIZE as f32)),
                        collision: Some(CollisionBox::new(DEFAULT_TILE_SIZE, DEFAULT_TILE_SIZE)),
                        ..Default::default()
                    },
                );
                if camera_target.is_none() {
                    camera_target = Some(e.id);
                }
            } else if e.is_solid {
                // Non-player solid entities get a collision box so movement is blocked. (B-B)
                component_store.set_collision(
                    e.id,
                    CollisionBox::new(DEFAULT_TILE_SIZE, DEFAULT_TILE_SIZE),
                );
            }

            // Optional initial velocity for physics-driven entities. (B-C)
            if let Some(ref v) = e.velocity {
                component_store.set_velocity(
                    e.id,
                    VelocityComponent { vx: v.vx, vy: v.vy, max_speed: v.max_speed },
                );
            }

            // Optional animation component.
            if let Some(ref anim_init) = e.animation {
                let mut clips = HashMap::new();
                for c in &anim_init.clips {
                    let loop_mode = match c.loop_mode.as_str() {
                        "once" => LoopMode::Once,
                        "ping_pong" => LoopMode::PingPong,
                        _ => LoopMode::Loop,
                    };
                    clips.insert(
                        c.name.clone(),
                        AnimationClip::new(c.frames.clone(), c.frame_duration_ticks, loop_mode),
                    );
                }
                if !clips.is_empty() {
                    let initial = if clips.contains_key(&anim_init.initial_clip) {
                        anim_init.initial_clip.clone()
                    } else {
                        clips.keys().next().unwrap().clone()
                    };
                    let first_clip = clips.get(&initial).cloned().unwrap();
                    let mut comp = AnimationComponent::new(initial, first_clip);
                    // Add remaining clips.
                    for (name, clip) in &clips {
                        if !comp.clips.contains_key(name) {
                            comp.clips.insert(name.clone(), clip.clone());
                        }
                    }
                    // Add transitions.
                    for t in &anim_init.transitions {
                        let condition = match &t.condition {
                            ConditionInit::FlagSet { flag } => {
                                TransitionCondition::FlagSet { flag: flag.clone() }
                            }
                            ConditionInit::FlagSetForTicks { flag, min_ticks } => {
                                TransitionCondition::FlagSetForTicks {
                                    flag: flag.clone(),
                                    min_ticks: *min_ticks,
                                }
                            }
                            ConditionInit::IntGte { key, value } => {
                                TransitionCondition::IntGte {
                                    key: key.clone(),
                                    value: *value,
                                }
                            }
                            ConditionInit::IntLte { key, value } => {
                                TransitionCondition::IntLte {
                                    key: key.clone(),
                                    value: *value,
                                }
                            }
                            ConditionInit::IntGt { key, value } => {
                                TransitionCondition::IntGt {
                                    key: key.clone(),
                                    value: *value,
                                }
                            }
                            ConditionInit::IntLt { key, value } => {
                                TransitionCondition::IntLt {
                                    key: key.clone(),
                                    value: *value,
                                }
                            }
                            ConditionInit::IntEq { key, value } => {
                                TransitionCondition::IntEq {
                                    key: key.clone(),
                                    value: *value,
                                }
                            }
                            ConditionInit::IntBetween { key, min, max } => {
                                TransitionCondition::IntBetween {
                                    key: key.clone(),
                                    min: *min,
                                    max: *max,
                                }
                            }
                            ConditionInit::ClipFinished => TransitionCondition::ClipFinished,
                            ConditionInit::Never => TransitionCondition::Never,
                        };
                        comp.transitions.push(AnimationTransition {
                            from_state: t.from_state.clone(),
                            to_state: t.to_state.clone(),
                            condition,
                        });
                    }
                    component_store.set_animation(e.id, comp);
                    // Ensure a sprite component exists for frame sync.
                    if component_store.sprite(e.id).is_none() {
                        component_store.set_sprite(e.id, SpriteComponent::new(&e.name));
                    }
                }
            }
        }

        let physics_config = payload
            .physics
            .map(|p| PhysicsConfig { gravity: p.gravity, friction: p.friction })
            .unwrap_or_default();

        let mut camera_state = CameraState::default();
        camera_state.target_entity = camera_target;

        Self {
            entities,
            tiles,
            tile_props: TilePropertyRegistry::default(),
            component_store,
            input_state: InputState::new(),
            input_mapping: InputMapping::default(),
            physics_config,
            camera_state,
            empty_script_flags: HashMap::new(),
            accumulator_ms: 0.0,
            frame: 0,
            active: false,
            paused: false,
            speed: 1.0,
        }
    }

    /// One simulation step: movement → tile + entity collision → physics → camera update.
    fn step(&mut self) {
        let movement_input = self.input_state.to_movement_input();

        // ---- Movement phase ----
        // Collect IDs to avoid holding borrow on component_store while mutating entities.
        let ids: Vec<EntityId> = self.entities.keys().copied().collect();

        for id in ids {
            // Skip entities without movement components.
            if self.component_store.movement(id).is_none() {
                continue;
            }

            let current_pos = match self.entities.get(&id) {
                Some(e) => e.position,
                None => continue,
            };

            // Determine input — only "Player" entities have movement components by default.
            let new_pos = {
                let movement = match self.component_store.movement_mut(id) {
                    Some(m) => m,
                    None => continue,
                };
                process_movement(current_pos, movement, movement_input).new_position
            };

            // Copy the collision box so we can pass &self.component_store to entity-collision.
            let cbox = self.component_store.collision(id).copied();

            // Tile collision (B-A / existing).
            let tile_blocked = cbox.map_or(false, |cbox| {
                !would_collide_with_tiles(
                    new_pos,
                    &cbox,
                    &self.tiles,
                    &self.tile_props,
                    DEFAULT_TILE_SIZE,
                )
                .is_empty()
            });

            // Entity collision (B-B): block against other solid entities.
            let entity_blocked = cbox.map_or(false, |cbox| {
                !would_collide_with_entities(
                    id,
                    new_pos,
                    &cbox,
                    &self.entities,
                    &self.component_store,
                )
                .is_empty()
            });

            if !tile_blocked && !entity_blocked {
                if let Some(entity) = self.entities.get_mut(&id) {
                    entity.position = new_pos;
                }
            }
        }

        // ---- Physics phase (B-C): velocity / gravity / friction ----
        let phys_ids = self.component_store.entities_with_velocity();

        for id in phys_ids {
            let current_pos = match self.entities.get(&id) {
                Some(e) => e.position,
                None => continue,
            };

            let (dx, dy) = {
                let vel = match self.component_store.velocity_mut(id) {
                    Some(v) => v,
                    None => continue,
                };
                let result = physics_step(vel, &self.physics_config);
                (result.dx, result.dy)
            };

            if dx == 0 && dy == 0 {
                continue;
            }

            let new_pos = Position { x: current_pos.x + dx, y: current_pos.y + dy };
            let cbox = self.component_store.collision(id).copied();

            let tile_blocked = cbox.map_or(false, |cbox| {
                !would_collide_with_tiles(
                    new_pos,
                    &cbox,
                    &self.tiles,
                    &self.tile_props,
                    DEFAULT_TILE_SIZE,
                )
                .is_empty()
            });

            let entity_blocked = cbox.map_or(false, |cbox| {
                !would_collide_with_entities(
                    id,
                    new_pos,
                    &cbox,
                    &self.entities,
                    &self.component_store,
                )
                .is_empty()
            });

            if !tile_blocked && !entity_blocked {
                if let Some(entity) = self.entities.get_mut(&id) {
                    entity.position = new_pos;
                }
            } else {
                // Zero out velocity in the blocked direction to prevent accumulation into walls.
                if let Some(vel) = self.component_store.velocity_mut(id) {
                    if dx != 0 {
                        vel.vx = 0.0;
                    }
                    if dy != 0 {
                        vel.vy = 0.0;
                    }
                }
            }
        }

        // Animation step — advance all entity animations and sync sprite frames.
        let _anim_events = step_animations(&mut self.component_store, &self.empty_script_flags);

        // Camera update — borrows camera_state mutably and entities immutably (different fields).
        update_camera(&mut self.camera_state, &self.entities);
    }

    fn make_snapshot(&self, steps_taken: u64) -> String {
        let entities: Vec<EntitySnapshot> = self
            .entities
            .values()
            .map(|e| {
                let sprite_frame = self.component_store.sprite(e.id).map(|s| s.frame);
                let animation_state = self
                    .component_store
                    .animation(e.id)
                    .map(|a| a.state.current_clip_name.clone());
                EntitySnapshot {
                    id: e.id,
                    name: e.name.clone(),
                    x: e.position.x,
                    y: e.position.y,
                    sprite_frame,
                    animation_state,
                }
            })
            .collect();

        let camera_mode_str = match self.camera_state.mode {
            CameraMode::Fixed => "fixed",
            CameraMode::Follow => "follow",
            CameraMode::Lerp => "lerp",
            CameraMode::ScreenLock => "screen_lock",
        };

        let snap = WasmStateSnapshot {
            frame: self.frame,
            steps_taken,
            active: self.active,
            paused: self.paused,
            camera_x: self.camera_state.x,
            camera_y: self.camera_state.y,
            camera_mode: camera_mode_str.to_string(),
            entities,
        };

        serde_json::to_string(&snap).unwrap_or_else(|_| "{}".to_string())
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn parse_keycode(s: &str) -> Option<KeyCode> {
    serde_json::from_value(serde_json::Value::String(s.to_string())).ok()
}

fn parse_camera_mode(s: &str) -> Option<CameraMode> {
    serde_json::from_value(serde_json::Value::String(s.to_string())).ok()
}

// ---------------------------------------------------------------------------
// Native-only helpers for unit tests (no wasm-bindgen overhead)
// ---------------------------------------------------------------------------

#[cfg(not(target_arch = "wasm32"))]
impl WasmRuntime {
    pub fn new_from_json(init_json: &str) -> Result<Self, String> {
        let payload: InitPayload =
            serde_json::from_str(init_json).map_err(|e| e.to_string())?;
        Ok(Self::from_payload(payload))
    }

    pub fn entity_position(&self, id: EntityId) -> Option<(i32, i32)> {
        self.entities.get(&id).map(|e| (e.position.x, e.position.y))
    }
}

// ---------------------------------------------------------------------------
// Unit tests (native, no WASM target)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn player_init(x: i32, y: i32) -> String {
        format!(r#"{{"entities":[{{"id":1,"name":"Player","x":{x},"y":{y}}}],"tiles":[]}}"#)
    }

    #[test]
    fn player_moves_right_after_tick() {
        let mut rt = WasmRuntime::new_from_json(&player_init(0, 0)).unwrap();
        rt.enter_playtest();
        rt.key_down("arrow_right");
        rt.tick(1000); // 60 steps; GridSnap step_interval=8 → ~7 moves
        let (x, _) = rt.entity_position(1).unwrap();
        assert!(x > 0, "player should move right, got x={x}");
    }

    #[test]
    fn player_blocked_by_solid_tile() {
        // Tile at grid (1,0) = pixel (8,0).  Player starts at (0,0).
        let json = r#"{"entities":[{"id":1,"name":"Player","x":0,"y":0}],"tiles":[{"x":1,"y":0,"tile_id":1}]}"#;
        let mut rt = WasmRuntime::new_from_json(json).unwrap();
        rt.enter_playtest();
        rt.key_down("arrow_right");
        rt.tick(1000);
        let (x, _) = rt.entity_position(1).unwrap();
        assert!(x < 8, "player should be blocked by solid tile, got x={x}");
    }

    #[test]
    fn frame_counter_advances() {
        let mut rt = WasmRuntime::new_from_json(&player_init(0, 0)).unwrap();
        rt.enter_playtest();
        rt.tick(1000);
        assert!(rt.frame >= 60, "expected >= 60 frames, got {}", rt.frame);
    }

    #[test]
    fn paused_runtime_does_not_advance_frame() {
        let mut rt = WasmRuntime::new_from_json(&player_init(0, 0)).unwrap();
        rt.enter_playtest();
        rt.toggle_pause();
        rt.tick(1000);
        assert_eq!(rt.frame, 0, "paused runtime should not advance frames");
    }

    #[test]
    fn set_physics_config_updates_state() {
        let mut rt = WasmRuntime::new_from_json(&player_init(0, 0)).unwrap();
        rt.set_physics_config(0.5, 0.9);
        assert!((rt.physics_config.gravity - 0.5).abs() < f32::EPSILON);
        assert!((rt.physics_config.friction - 0.9).abs() < f32::EPSILON);
    }

    #[test]
    fn set_camera_mode_updates_state() {
        let mut rt = WasmRuntime::new_from_json(&player_init(0, 0)).unwrap();
        rt.set_camera_mode("fixed");
        assert_eq!(rt.camera_state.mode, CameraMode::Fixed);
    }

    // B-B: entity-entity collision ------------------------------------------------

    #[test]
    fn player_blocked_by_solid_entity() {
        // Solid crate at grid (1,0) = pixel x=8. Player at (0,0) tries to move right.
        let json = r#"{"entities":[{"id":1,"name":"Player","x":0,"y":0},{"id":2,"name":"Crate","x":8,"y":0,"is_solid":true}],"tiles":[]}"#;
        let mut rt = WasmRuntime::new_from_json(json).unwrap();
        rt.enter_playtest();
        rt.key_down("arrow_right");
        rt.tick(1000);
        let (x, _) = rt.entity_position(1).unwrap();
        assert!(x < 8, "player should be blocked by solid entity crate, got x={x}");
    }

    #[test]
    fn non_solid_entity_does_not_block_movement() {
        // Non-solid trigger at x=8; player should pass through.
        let json = r#"{"entities":[{"id":1,"name":"Player","x":0,"y":0},{"id":2,"name":"Trigger","x":8,"y":0}],"tiles":[]}"#;
        let mut rt = WasmRuntime::new_from_json(json).unwrap();
        rt.enter_playtest();
        rt.key_down("arrow_right");
        rt.tick(1000);
        let (x, _) = rt.entity_position(1).unwrap();
        // Trigger has no collision box, so player should have moved right freely.
        assert!(x > 0, "player should pass through non-solid entity, got x={x}");
    }

    // B-C: physics / velocity / gravity -------------------------------------------

    #[test]
    fn entity_falls_under_gravity() {
        // Entity starts at y=0 with velocity component; platformer gravity=0.4 pulls it down.
        let json = r#"{"entities":[{"id":1,"name":"Ball","x":0,"y":0,"velocity":{"vx":0.0,"vy":0.0,"max_speed":8.0}}],"tiles":[],"physics":{"gravity":0.4,"friction":0.9}}"#;
        let mut rt = WasmRuntime::new_from_json(json).unwrap();
        rt.enter_playtest();
        rt.tick(500); // ~30 steps; gravity accumulates to dy>0 within 2 steps
        let (_, y) = rt.entity_position(1).unwrap();
        assert!(y > 0, "entity should have fallen under gravity, got y={y}");
    }

    // Animation tests --------------------------------------------------------

    #[test]
    fn animation_loop_clip_advances_sprite_frame() {
        let json = r#"{
            "entities":[{
                "id": 1, "name": "NPC", "x": 0, "y": 0,
                "animation": {
                    "clips": [
                        { "name": "walk", "frames": [0,1,2,3], "frame_duration_ticks": 1, "loop_mode": "loop" }
                    ],
                    "initial_clip": "walk"
                }
            }],
            "tiles": []
        }"#;
        let mut rt = WasmRuntime::new_from_json(json).unwrap();
        rt.enter_playtest();
        // Tick enough to advance several frames (10 steps at 60fps ≈ 167ms).
        rt.tick(167);
        let snap_json = rt.get_state();
        let snap: serde_json::Value = serde_json::from_str(&snap_json).unwrap();
        let entities = snap["entities"].as_array().unwrap();
        let npc = entities.iter().find(|e| e["id"] == 1).unwrap();
        let sprite_frame = npc["sprite_frame"].as_u64().unwrap();
        assert!(
            sprite_frame > 0,
            "animation should advance sprite_frame, got {sprite_frame}"
        );
        let anim_state = npc["animation_state"].as_str().unwrap();
        assert_eq!(anim_state, "walk");
    }

    #[test]
    fn animation_once_clip_stops_and_reports_state() {
        let json = r#"{
            "entities":[{
                "id": 1, "name": "Effect", "x": 0, "y": 0,
                "animation": {
                    "clips": [
                        { "name": "explode", "frames": [0,1,2], "frame_duration_ticks": 1, "loop_mode": "once" }
                    ],
                    "initial_clip": "explode"
                }
            }],
            "tiles": []
        }"#;
        let mut rt = WasmRuntime::new_from_json(json).unwrap();
        rt.enter_playtest();
        rt.tick(500); // plenty of steps to finish a 3-frame once clip
        let anim = rt.component_store.animation(1).unwrap();
        assert!(!anim.state.playing, "Once clip should stop playing");
        assert_eq!(anim.state.current_frame_index, 2, "Should be on last frame");
    }

    #[test]
    fn physics_velocity_halts_at_solid_tile() {
        // Tile at grid (0,5) = pixel y=40. Solid entity falls from y=0 under gravity.
        let json = r#"{"entities":[{"id":1,"name":"Ball","x":0,"y":0,"is_solid":true,"velocity":{"vx":0.0,"vy":0.0,"max_speed":8.0}}],"tiles":[{"x":0,"y":5,"tile_id":1}],"physics":{"gravity":0.4,"friction":0.9}}"#;
        let mut rt = WasmRuntime::new_from_json(json).unwrap();
        rt.enter_playtest();
        rt.tick(2000); // ~120 steps; plenty to hit the tile at y=40
        let (_, y) = rt.entity_position(1).unwrap();
        assert!(y < 40, "entity should be stopped before tile at pixel y=40, got y={y}");
    }
}
