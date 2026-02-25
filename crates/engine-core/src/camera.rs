use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::{Entity, EntityId};

/// How the camera tracks the world.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CameraMode {
    /// Camera stays at its current position.
    Fixed,
    /// Camera snaps to the target entity every tick (open-world style).
    Follow,
    /// Camera smoothly interpolates toward the target entity.
    Lerp,
    /// Zelda-style: world divided into viewport-sized screens. Camera snaps
    /// to whichever screen the target entity occupies.
    ScreenLock,
}

impl Default for CameraMode {
    fn default() -> Self {
        Self::Follow
    }
}

/// Optional world-space bounds to clamp camera position.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CameraBounds {
    pub min_x: f32,
    pub min_y: f32,
    pub max_x: f32,
    pub max_y: f32,
}

/// Camera state for the playtest viewport.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CameraState {
    /// Camera center X in world pixels.
    pub x: f32,
    /// Camera center Y in world pixels.
    pub y: f32,
    pub mode: CameraMode,
    /// Entity the camera follows (if any).
    pub target_entity: Option<EntityId>,
    /// Interpolation speed for Lerp mode (0.0–1.0). Higher = faster.
    pub lerp_speed: f32,
    /// Viewport dimensions in pixels (used for bounds clamping).
    pub viewport_width: u32,
    pub viewport_height: u32,
    /// Optional world bounds to prevent camera from showing out-of-world area.
    pub bounds: Option<CameraBounds>,
}

impl Default for CameraState {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            mode: CameraMode::Follow,
            target_entity: None,
            lerp_speed: 0.15,
            viewport_width: 160,
            viewport_height: 144,
            bounds: None,
        }
    }
}

/// Clamp a value to [min, max]. If min > max (viewport larger than bounds), center between them.
fn clamp_axis(value: f32, min: f32, max: f32) -> f32 {
    if min > max {
        (min + max) * 0.5
    } else {
        value.clamp(min, max)
    }
}

/// Update camera position for one tick.
/// Returns the new (x, y) center position after update.
pub fn update_camera(
    camera: &mut CameraState,
    entities: &HashMap<EntityId, Entity>,
) -> (f32, f32) {
    match camera.mode {
        CameraMode::Fixed => {}
        CameraMode::Follow => {
            if let Some(target_id) = camera.target_entity {
                if let Some(entity) = entities.get(&target_id) {
                    camera.x = entity.position.x as f32;
                    camera.y = entity.position.y as f32;
                }
            }
        }
        CameraMode::Lerp => {
            if let Some(target_id) = camera.target_entity {
                if let Some(entity) = entities.get(&target_id) {
                    let tx = entity.position.x as f32;
                    let ty = entity.position.y as f32;
                    let speed = camera.lerp_speed.clamp(0.0, 1.0);
                    camera.x += (tx - camera.x) * speed;
                    camera.y += (ty - camera.y) * speed;
                }
            }
        }
        CameraMode::ScreenLock => {
            if let Some(target_id) = camera.target_entity {
                if let Some(entity) = entities.get(&target_id) {
                    let vw = camera.viewport_width.max(1) as f32;
                    let vh = camera.viewport_height.max(1) as f32;
                    let ex = entity.position.x as f32;
                    let ey = entity.position.y as f32;
                    // Snap to the screen-sized cell the entity is in.
                    // Cell origin = floor(entity / viewport) * viewport.
                    // Camera center = cell origin + half viewport.
                    let cell_x = (ex / vw).floor() * vw;
                    let cell_y = (ey / vh).floor() * vh;
                    camera.x = cell_x + vw * 0.5;
                    camera.y = cell_y + vh * 0.5;
                }
            }
        }
    }

    // Clamp to bounds if set
    if let Some(bounds) = &camera.bounds {
        let half_w = camera.viewport_width as f32 * 0.5;
        let half_h = camera.viewport_height as f32 * 0.5;
        camera.x = clamp_axis(camera.x, bounds.min_x + half_w, bounds.max_x - half_w);
        camera.y = clamp_axis(camera.y, bounds.min_y + half_h, bounds.max_y - half_h);
    }

    (camera.x, camera.y)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Position;

    fn make_entity(id: EntityId, x: i32, y: i32) -> (EntityId, Entity) {
        (
            id,
            Entity {
                id,
                name: format!("e{}", id),
                position: Position { x, y },
            },
        )
    }

    #[test]
    fn fixed_mode_does_not_move() {
        let mut cam = CameraState {
            x: 10.0,
            y: 20.0,
            mode: CameraMode::Fixed,
            target_entity: Some(1),
            ..Default::default()
        };
        let entities: HashMap<_, _> = [make_entity(1, 100, 200)].into_iter().collect();
        let (x, y) = update_camera(&mut cam, &entities);
        assert_eq!(x, 10.0);
        assert_eq!(y, 20.0);
    }

    #[test]
    fn follow_snaps_to_target() {
        let mut cam = CameraState {
            mode: CameraMode::Follow,
            target_entity: Some(1),
            ..Default::default()
        };
        let entities: HashMap<_, _> = [make_entity(1, 48, 32)].into_iter().collect();
        let (x, y) = update_camera(&mut cam, &entities);
        assert_eq!(x, 48.0);
        assert_eq!(y, 32.0);
    }

    #[test]
    fn follow_ignores_missing_target() {
        let mut cam = CameraState {
            x: 5.0,
            y: 5.0,
            mode: CameraMode::Follow,
            target_entity: Some(999),
            ..Default::default()
        };
        let entities: HashMap<_, _> = [make_entity(1, 48, 32)].into_iter().collect();
        let (x, y) = update_camera(&mut cam, &entities);
        assert_eq!(x, 5.0);
        assert_eq!(y, 5.0);
    }

    #[test]
    fn follow_no_target_stays_put() {
        let mut cam = CameraState {
            x: 10.0,
            y: 10.0,
            mode: CameraMode::Follow,
            target_entity: None,
            ..Default::default()
        };
        let entities = HashMap::new();
        let (x, y) = update_camera(&mut cam, &entities);
        assert_eq!(x, 10.0);
        assert_eq!(y, 10.0);
    }

    #[test]
    fn lerp_moves_toward_target() {
        let mut cam = CameraState {
            x: 0.0,
            y: 0.0,
            mode: CameraMode::Lerp,
            target_entity: Some(1),
            lerp_speed: 0.5,
            ..Default::default()
        };
        let entities: HashMap<_, _> = [make_entity(1, 100, 0)].into_iter().collect();
        let (x, _y) = update_camera(&mut cam, &entities);
        assert!((x - 50.0).abs() < 0.01, "expected ~50.0, got {}", x);
    }

    #[test]
    fn lerp_converges_over_multiple_ticks() {
        let mut cam = CameraState {
            x: 0.0,
            y: 0.0,
            mode: CameraMode::Lerp,
            target_entity: Some(1),
            lerp_speed: 0.5,
            ..Default::default()
        };
        let entities: HashMap<_, _> = [make_entity(1, 100, 0)].into_iter().collect();
        for _ in 0..20 {
            update_camera(&mut cam, &entities);
        }
        assert!((cam.x - 100.0).abs() < 0.1, "should converge near 100.0, got {}", cam.x);
    }

    #[test]
    fn bounds_clamping_works() {
        let mut cam = CameraState {
            x: 0.0,
            y: 0.0,
            mode: CameraMode::Follow,
            target_entity: Some(1),
            viewport_width: 160,
            viewport_height: 144,
            bounds: Some(CameraBounds {
                min_x: 0.0,
                min_y: 0.0,
                max_x: 320.0,
                max_y: 288.0,
            }),
            ..Default::default()
        };
        // Target at 0,0 — camera should clamp to min_x + half_w = 80, min_y + half_h = 72
        let entities: HashMap<_, _> = [make_entity(1, 0, 0)].into_iter().collect();
        let (x, y) = update_camera(&mut cam, &entities);
        assert_eq!(x, 80.0);
        assert_eq!(y, 72.0);
    }

    #[test]
    fn bounds_clamp_max_edge() {
        let mut cam = CameraState {
            x: 0.0,
            y: 0.0,
            mode: CameraMode::Follow,
            target_entity: Some(1),
            viewport_width: 160,
            viewport_height: 144,
            bounds: Some(CameraBounds {
                min_x: 0.0,
                min_y: 0.0,
                max_x: 320.0,
                max_y: 288.0,
            }),
            ..Default::default()
        };
        // Target beyond max — should clamp to max_x - half_w = 240, max_y - half_h = 216
        let entities: HashMap<_, _> = [make_entity(1, 500, 500)].into_iter().collect();
        let (x, y) = update_camera(&mut cam, &entities);
        assert_eq!(x, 240.0);
        assert_eq!(y, 216.0);
    }

    #[test]
    fn serialization_roundtrip() {
        let cam = CameraState {
            x: 42.5,
            y: 17.0,
            mode: CameraMode::Lerp,
            target_entity: Some(3),
            lerp_speed: 0.2,
            viewport_width: 256,
            viewport_height: 240,
            bounds: Some(CameraBounds {
                min_x: 0.0,
                min_y: 0.0,
                max_x: 1024.0,
                max_y: 768.0,
            }),
        };
        let json = serde_json::to_string(&cam).unwrap();
        let deserialized: CameraState = serde_json::from_str(&json).unwrap();
        assert_eq!(cam, deserialized);
    }

    #[test]
    fn screen_lock_snaps_to_cell() {
        // Viewport 160x144. Entity at (80, 50) is in cell (0,0) -> camera center (80, 72).
        let mut cam = CameraState {
            mode: CameraMode::ScreenLock,
            target_entity: Some(1),
            viewport_width: 160,
            viewport_height: 144,
            ..Default::default()
        };
        let entities: HashMap<_, _> = [make_entity(1, 80, 50)].into_iter().collect();
        let (x, y) = update_camera(&mut cam, &entities);
        assert_eq!(x, 80.0);
        assert_eq!(y, 72.0);
    }

    #[test]
    fn screen_lock_transitions_at_boundary() {
        // Entity crosses into the next screen (x=160 is screen 1).
        let mut cam = CameraState {
            mode: CameraMode::ScreenLock,
            target_entity: Some(1),
            viewport_width: 160,
            viewport_height: 144,
            ..Default::default()
        };
        let entities: HashMap<_, _> = [make_entity(1, 170, 50)].into_iter().collect();
        let (x, y) = update_camera(&mut cam, &entities);
        // Cell (1,0): origin (160, 0), center (240, 72)
        assert_eq!(x, 240.0);
        assert_eq!(y, 72.0);
    }

    #[test]
    fn screen_lock_handles_negative_coordinates() {
        let mut cam = CameraState {
            mode: CameraMode::ScreenLock,
            target_entity: Some(1),
            viewport_width: 160,
            viewport_height: 144,
            ..Default::default()
        };
        // Entity at (-10, -10) is in cell (-1, -1).
        // Cell origin (-160, -144), center (-80, -72).
        let entities: HashMap<_, _> = [make_entity(1, -10, -10)].into_iter().collect();
        let (x, y) = update_camera(&mut cam, &entities);
        assert_eq!(x, -80.0);
        assert_eq!(y, -72.0);
    }
}
