//! PlaytestWorld: runtime simulation state for a playtest session.
//! Orchestrates: input -> movement -> collision -> physics per tick.

use gcs_collision::query;
use gcs_collision::tilemap::collect_solid_tiles;
use gcs_collision::Aabb;
use gcs_math::Vec2;
use gcs_physics::{integrate_step, PhysicsBody, PhysicsConfig};
use serde::{Deserialize, Serialize};

use crate::movement::{free_move, grid_move, MovementMode};
use crate::playtest::{PlaytestSession, PlaytestState};
use crate::project::{Project, TileLayer};

/// Input state for the current frame.
#[derive(Debug, Clone, Default)]
pub struct InputState {
    pub move_dir: Vec2, // normalized direction from input
}

/// Runtime entity -- extends authored Entity with physics state.
#[derive(Debug, Clone)]
pub struct RuntimeEntity {
    pub id: String,
    pub name: String,
    pub position: Vec2,
    pub size: Vec2,
    pub solid: bool,
    pub physics: PhysicsBody,
    pub movement_mode: MovementMode,
    pub speed: f32,
    pub is_player: bool,
}

impl RuntimeEntity {
    pub fn aabb(&self) -> Aabb {
        Aabb::new(self.position.x, self.position.y, self.size.x, self.size.y)
    }
}

/// Snapshot of the world state after a tick (sent to frontend for rendering).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldSnapshot {
    pub tick: u64,
    pub state: PlaytestState,
    pub entities: Vec<EntitySnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitySnapshot {
    pub id: String,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

/// The playtest world. Owns all runtime state for a simulation session.
pub struct PlaytestWorld {
    pub session: PlaytestSession,
    pub entities: Vec<RuntimeEntity>,
    pub tile_layer: TileLayer,
    pub tile_size: f32,
    pub physics_config: PhysicsConfig,
    pub input: InputState,
}

impl PlaytestWorld {
    /// Initialize from a project snapshot.
    pub fn from_project(project: &Project) -> Self {
        let tile_size = project.tile_size as f32;
        let tile_layer = project.tile_layers.first().cloned().unwrap_or(TileLayer {
            id: "empty".into(),
            name: "Empty".into(),
            width: 0,
            height: 0,
            tile_size: project.tile_size,
            data: vec![],
        });

        let entities = project
            .entities
            .iter()
            .map(|e| RuntimeEntity {
                id: e.id.clone(),
                name: e.name.clone(),
                position: e.position,
                size: e.size,
                solid: e.solid,
                physics: PhysicsBody::default(),
                movement_mode: MovementMode::Free,
                speed: 120.0,
                is_player: e.tags.contains(&"player".to_string()),
            })
            .collect();

        Self {
            session: PlaytestSession::new(),
            entities,
            tile_layer,
            tile_size,
            physics_config: PhysicsConfig {
                gravity: Vec2::ZERO, // top-down by default, no gravity
                fixed_dt: 1.0 / 60.0,
            },
            input: InputState::default(),
        }
    }

    pub fn enter(&mut self) -> Result<(), &'static str> {
        self.session.enter()
    }

    pub fn exit(&mut self) {
        self.session.exit();
    }

    pub fn pause(&mut self) -> Result<(), &'static str> {
        self.session.pause()
    }

    pub fn resume(&mut self) -> Result<(), &'static str> {
        self.session.resume()
    }

    pub fn state(&self) -> PlaytestState {
        self.session.state()
    }

    /// Run one simulation tick. Returns false if stale guard triggered.
    pub fn tick(&mut self) -> bool {
        if !self.session.tick() {
            return false;
        }

        let dt = self.physics_config.fixed_dt;

        // Collect solid tile AABBs once per tick
        let world_bounds = Aabb::new(
            0.0,
            0.0,
            self.tile_layer.width as f32 * self.tile_size,
            self.tile_layer.height as f32 * self.tile_size,
        );
        let solid_tiles = collect_solid_tiles(
            &self.tile_layer.data,
            self.tile_layer.width,
            self.tile_layer.height,
            self.tile_size,
            &world_bounds,
            |id| id > 0, // all non-zero tiles are solid for now
        );

        // Collect solid entity AABBs (excluding self during each entity's move)
        let entity_count = self.entities.len();

        for i in 0..entity_count {
            // 1. Movement: compute desired delta from input (player only) or physics
            let desired_delta = if self.entities[i].is_player {
                match self.entities[i].movement_mode {
                    MovementMode::Grid { tile_size } => {
                        if self.input.move_dir != Vec2::ZERO {
                            grid_move(self.input.move_dir, tile_size)
                        } else {
                            Vec2::ZERO
                        }
                    }
                    MovementMode::Free => {
                        free_move(self.input.move_dir, self.entities[i].speed, dt)
                    }
                }
            } else {
                // Non-player: physics only
                integrate_step(&mut self.entities[i].physics, &self.physics_config)
            };

            if desired_delta == Vec2::ZERO {
                continue;
            }

            // 2. Collect all solid AABBs except self
            let mut solids = solid_tiles.clone();
            for j in 0..entity_count {
                if i != j && self.entities[j].solid {
                    solids.push(self.entities[j].aabb());
                }
            }

            // 3. Resolve collision
            let mover_aabb = self.entities[i].aabb();
            let result = query::resolve_move(&mover_aabb, desired_delta, &solids);
            self.entities[i].position = result.resolved_position;

            // 4. Zero velocity on collision axes
            if result.collided {
                if result.penetration.x != 0.0 {
                    self.entities[i].physics.velocity.x = 0.0;
                }
                if result.penetration.y != 0.0 {
                    self.entities[i].physics.velocity.y = 0.0;
                }
            }
        }

        true
    }

    /// Get a snapshot for rendering.
    pub fn snapshot(&self) -> WorldSnapshot {
        WorldSnapshot {
            tick: self.session.tick_count(),
            state: self.session.state(),
            entities: self
                .entities
                .iter()
                .map(|e| EntitySnapshot {
                    id: e.id.clone(),
                    name: e.name.clone(),
                    x: e.position.x,
                    y: e.position.y,
                    w: e.size.x,
                    h: e.size.y,
                })
                .collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project::{Entity, Project};

    fn test_project() -> Project {
        let mut proj = Project::new("Test", 10, 10, 16);
        // Add a player entity
        proj.entities.push(Entity {
            id: "player".into(),
            name: "Player".into(),
            position: Vec2::new(32.0, 32.0),
            size: Vec2::new(14.0, 14.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec!["player".into()],
        });
        proj
    }

    #[test]
    fn enter_exit_pause_resume() {
        let proj = test_project();
        let mut world = PlaytestWorld::from_project(&proj);

        assert_eq!(world.state(), PlaytestState::Stopped);
        world.enter().unwrap();
        assert_eq!(world.state(), PlaytestState::Running);
        world.pause().unwrap();
        assert_eq!(world.state(), PlaytestState::Paused);
        assert!(!world.tick()); // can't tick while paused
        world.resume().unwrap();
        assert!(world.tick());
        world.exit();
        assert_eq!(world.state(), PlaytestState::Stopped);
    }

    #[test]
    fn player_moves_with_input() {
        let proj = test_project();
        let mut world = PlaytestWorld::from_project(&proj);
        world.enter().unwrap();

        let start_x = world.entities[0].position.x;

        // Move right
        world.input.move_dir = Vec2::new(1.0, 0.0);
        world.tick();

        assert!(
            world.entities[0].position.x > start_x,
            "player should move right"
        );
    }

    #[test]
    fn player_blocked_by_solid_tile() {
        let mut proj = Project::new("Test", 10, 10, 16);
        proj.entities.push(Entity {
            id: "player".into(),
            name: "Player".into(),
            position: Vec2::new(16.0, 16.0),
            size: Vec2::new(14.0, 14.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec!["player".into()],
        });
        // Place solid wall tile at grid (3, 1) -- pixel x=48
        proj.tile_layers[0].set_tile(3, 1, 1);

        let mut world = PlaytestWorld::from_project(&proj);
        world.enter().unwrap();

        // Move right many ticks -- should be blocked before x=48
        world.input.move_dir = Vec2::new(1.0, 0.0);
        for _ in 0..100 {
            world.tick();
        }

        assert!(
            world.entities[0].position.x < 48.0,
            "player should be blocked by wall at x=48, got x={}",
            world.entities[0].position.x
        );
    }

    #[test]
    fn player_blocked_by_solid_entity() {
        let mut proj = Project::new("Test", 10, 10, 16);
        proj.entities.push(Entity {
            id: "player".into(),
            name: "Player".into(),
            position: Vec2::new(16.0, 16.0),
            size: Vec2::new(14.0, 14.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec!["player".into()],
        });
        // Solid NPC blocking the path
        proj.entities.push(Entity {
            id: "npc".into(),
            name: "NPC".into(),
            position: Vec2::new(64.0, 16.0),
            size: Vec2::new(16.0, 16.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec![],
        });

        let mut world = PlaytestWorld::from_project(&proj);
        world.enter().unwrap();

        world.input.move_dir = Vec2::new(1.0, 0.0);
        for _ in 0..100 {
            world.tick();
        }

        assert!(
            world.entities[0].position.x < 64.0,
            "player should be blocked by NPC at x=64, got x={}",
            world.entities[0].position.x
        );
    }

    #[test]
    fn non_solid_entity_passthrough() {
        let mut proj = Project::new("Test", 10, 10, 16);
        proj.entities.push(Entity {
            id: "player".into(),
            name: "Player".into(),
            position: Vec2::new(16.0, 16.0),
            size: Vec2::new(14.0, 14.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec!["player".into()],
        });
        // Non-solid pickup
        proj.entities.push(Entity {
            id: "coin".into(),
            name: "Coin".into(),
            position: Vec2::new(48.0, 16.0),
            size: Vec2::new(8.0, 8.0),
            solid: false,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec![],
        });

        let mut world = PlaytestWorld::from_project(&proj);
        world.enter().unwrap();

        world.input.move_dir = Vec2::new(1.0, 0.0);
        for _ in 0..100 {
            world.tick();
        }

        assert!(
            world.entities[0].position.x > 48.0,
            "player should pass through non-solid entity, got x={}",
            world.entities[0].position.x
        );
    }

    #[test]
    fn grid_movement_mode() {
        let mut proj = Project::new("Test", 10, 10, 16);
        proj.entities.push(Entity {
            id: "player".into(),
            name: "Player".into(),
            position: Vec2::new(0.0, 0.0),
            size: Vec2::new(14.0, 14.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec!["player".into()],
        });

        let mut world = PlaytestWorld::from_project(&proj);
        world.entities[0].movement_mode = MovementMode::Grid { tile_size: 16.0 };
        world.enter().unwrap();

        world.input.move_dir = Vec2::new(1.0, 0.0);
        world.tick();

        assert_eq!(
            world.entities[0].position.x, 16.0,
            "grid mode should snap to tile_size"
        );
    }

    #[test]
    fn physics_gravity_moves_entity() {
        let mut proj = Project::new("Test", 10, 10, 16);
        // Non-player entity affected by gravity
        proj.entities.push(Entity {
            id: "ball".into(),
            name: "Ball".into(),
            position: Vec2::new(32.0, 0.0),
            size: Vec2::new(8.0, 8.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec![],
        });

        let mut world = PlaytestWorld::from_project(&proj);
        world.physics_config.gravity = Vec2::new(0.0, 500.0); // downward gravity
        world.enter().unwrap();

        let start_y = world.entities[0].position.y;
        for _ in 0..10 {
            world.tick();
        }

        assert!(
            world.entities[0].position.y > start_y,
            "gravity should move ball downward"
        );
    }

    #[test]
    fn snapshot_reflects_state() {
        let proj = test_project();
        let mut world = PlaytestWorld::from_project(&proj);

        let snap = world.snapshot();
        assert_eq!(snap.state, PlaytestState::Stopped);
        assert_eq!(snap.entities.len(), 1);

        world.enter().unwrap();
        world.tick();
        let snap = world.snapshot();
        assert_eq!(snap.state, PlaytestState::Running);
        assert_eq!(snap.tick, 1);

        let snap_json = serde_json::to_string(&snap).unwrap();
        assert!(snap_json.contains("\"state\":\"running\""));
    }
}


