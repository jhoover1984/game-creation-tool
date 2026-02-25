use serde::{Deserialize, Serialize};

use crate::Position;

/// How an entity moves through the world.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MovementMode {
    /// Zelda/Tetris-style: moves in discrete tile-aligned steps.
    GridSnap,
    /// Mario-style: continuous sub-pixel movement with velocity.
    FreeMove,
    /// FF/Chrono-style: queued moves, one per turn.
    TurnBased,
}

impl Default for MovementMode {
    fn default() -> Self {
        Self::GridSnap
    }
}

/// Cardinal direction an entity faces.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum FacingDirection {
    #[default]
    Down,
    Up,
    Left,
    Right,
}

/// Movement component attached to entities that can move.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct MovementComponent {
    pub mode: MovementMode,
    /// Speed in pixels per tick (for FreeMove) or grid step size in px (for GridSnap).
    pub speed: f32,
    pub facing: FacingDirection,
    /// For GridSnap: accumulator for partial-step timing (ticks since last step).
    /// For FreeMove: unused (velocity handles this).
    /// For TurnBased: turns remaining before next move allowed.
    #[serde(default)]
    pub step_cooldown: u32,
    /// GridSnap step interval in ticks (e.g., 8 = move one grid step every 8 ticks).
    #[serde(default = "default_step_interval")]
    pub step_interval: u32,
}

fn default_step_interval() -> u32 {
    8
}

impl Default for MovementComponent {
    fn default() -> Self {
        Self {
            mode: MovementMode::GridSnap,
            speed: 8.0,
            facing: FacingDirection::Down,
            step_cooldown: 0,
            step_interval: 8,
        }
    }
}

impl MovementComponent {
    pub fn grid_snap(grid_size: f32) -> Self {
        Self {
            mode: MovementMode::GridSnap,
            speed: grid_size,
            ..Default::default()
        }
    }

    pub fn free_move(speed: f32) -> Self {
        Self {
            mode: MovementMode::FreeMove,
            speed,
            ..Default::default()
        }
    }

    pub fn turn_based(grid_size: f32) -> Self {
        Self {
            mode: MovementMode::TurnBased,
            speed: grid_size,
            ..Default::default()
        }
    }
}

/// Desired movement direction from input.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MovementInput {
    pub dx: i32, // -1, 0, or 1
    pub dy: i32, // -1, 0, or 1
}

impl MovementInput {
    pub fn none() -> Self {
        Self { dx: 0, dy: 0 }
    }

    pub fn has_input(&self) -> bool {
        self.dx != 0 || self.dy != 0
    }

    pub fn to_facing(&self) -> Option<FacingDirection> {
        // Vertical takes priority (matches retro convention)
        if self.dy < 0 {
            Some(FacingDirection::Up)
        } else if self.dy > 0 {
            Some(FacingDirection::Down)
        } else if self.dx < 0 {
            Some(FacingDirection::Left)
        } else if self.dx > 0 {
            Some(FacingDirection::Right)
        } else {
            None
        }
    }
}

/// Result of processing one movement tick for an entity.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MovementResult {
    pub new_position: Position,
    pub moved: bool,
    pub blocked: bool,
}

/// Process grid-snap movement for one tick.
/// Returns the new position and whether the entity actually moved.
pub fn process_grid_snap(
    current_pos: Position,
    movement: &mut MovementComponent,
    input: MovementInput,
) -> MovementResult {
    // Update facing even if we can't move yet
    if let Some(facing) = input.to_facing() {
        movement.facing = facing;
    }

    // Cooldown tick
    if movement.step_cooldown > 0 {
        movement.step_cooldown -= 1;
        return MovementResult {
            new_position: current_pos,
            moved: false,
            blocked: false,
        };
    }

    if !input.has_input() {
        return MovementResult {
            new_position: current_pos,
            moved: false,
            blocked: false,
        };
    }

    let step = movement.speed as i32;
    let new_pos = Position {
        x: current_pos.x + input.dx * step,
        y: current_pos.y + input.dy * step,
    };

    // Reset cooldown after stepping
    movement.step_cooldown = movement.step_interval;

    MovementResult {
        new_position: new_pos,
        moved: true,
        blocked: false,
    }
}

/// Process turn-based movement. Move once, then wait for cooldown.
pub fn process_turn_based(
    current_pos: Position,
    movement: &mut MovementComponent,
    input: MovementInput,
) -> MovementResult {
    if let Some(facing) = input.to_facing() {
        movement.facing = facing;
    }

    if movement.step_cooldown > 0 {
        movement.step_cooldown -= 1;
        return MovementResult {
            new_position: current_pos,
            moved: false,
            blocked: false,
        };
    }

    if !input.has_input() {
        return MovementResult {
            new_position: current_pos,
            moved: false,
            blocked: false,
        };
    }

    let step = movement.speed as i32;
    let new_pos = Position {
        x: current_pos.x + input.dx * step,
        y: current_pos.y + input.dy * step,
    };

    // Turn-based: longer cooldown between moves
    movement.step_cooldown = movement.step_interval;

    MovementResult {
        new_position: new_pos,
        moved: true,
        blocked: false,
    }
}

/// Process free movement for one tick. Returns pixel-level position change.
pub fn process_free_move(
    current_pos: Position,
    movement: &mut MovementComponent,
    input: MovementInput,
) -> MovementResult {
    if let Some(facing) = input.to_facing() {
        movement.facing = facing;
    }

    if !input.has_input() {
        return MovementResult {
            new_position: current_pos,
            moved: false,
            blocked: false,
        };
    }

    let spd = movement.speed as i32;
    let new_pos = Position {
        x: current_pos.x + input.dx * spd,
        y: current_pos.y + input.dy * spd,
    };

    MovementResult {
        new_position: new_pos,
        moved: true,
        blocked: false,
    }
}

/// Process movement for any mode.
pub fn process_movement(
    current_pos: Position,
    movement: &mut MovementComponent,
    input: MovementInput,
) -> MovementResult {
    match movement.mode {
        MovementMode::GridSnap => process_grid_snap(current_pos, movement, input),
        MovementMode::FreeMove => process_free_move(current_pos, movement, input),
        MovementMode::TurnBased => process_turn_based(current_pos, movement, input),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grid_snap_basic_movement() {
        let pos = Position { x: 0, y: 0 };
        let mut mc = MovementComponent::grid_snap(8.0);
        mc.step_cooldown = 0;

        let result = process_grid_snap(pos, &mut mc, MovementInput { dx: 1, dy: 0 });
        assert!(result.moved);
        assert_eq!(result.new_position, Position { x: 8, y: 0 });
        assert_eq!(mc.facing, FacingDirection::Right);
    }

    #[test]
    fn grid_snap_cooldown_blocks_movement() {
        let pos = Position { x: 0, y: 0 };
        let mut mc = MovementComponent::grid_snap(8.0);

        // First move succeeds
        let r1 = process_grid_snap(pos, &mut mc, MovementInput { dx: 0, dy: -1 });
        assert!(r1.moved);
        assert_eq!(r1.new_position, Position { x: 0, y: -8 });

        // Subsequent moves blocked during cooldown
        let r2 = process_grid_snap(r1.new_position, &mut mc, MovementInput { dx: 1, dy: 0 });
        assert!(!r2.moved);
        assert_eq!(r2.new_position, Position { x: 0, y: -8 });
    }

    #[test]
    fn grid_snap_no_input_no_movement() {
        let pos = Position { x: 16, y: 16 };
        let mut mc = MovementComponent::grid_snap(8.0);
        let result = process_grid_snap(pos, &mut mc, MovementInput::none());
        assert!(!result.moved);
        assert_eq!(result.new_position, pos);
    }

    #[test]
    fn free_move_continuous() {
        let pos = Position { x: 10, y: 20 };
        let mut mc = MovementComponent::free_move(2.0);

        let r1 = process_free_move(pos, &mut mc, MovementInput { dx: 1, dy: 0 });
        assert!(r1.moved);
        assert_eq!(r1.new_position, Position { x: 12, y: 20 });

        // Free move has no cooldown — can move every tick
        let r2 = process_free_move(r1.new_position, &mut mc, MovementInput { dx: 1, dy: 0 });
        assert!(r2.moved);
        assert_eq!(r2.new_position, Position { x: 14, y: 20 });
    }

    #[test]
    fn turn_based_with_cooldown() {
        let pos = Position { x: 0, y: 0 };
        let mut mc = MovementComponent::turn_based(8.0);
        mc.step_interval = 4;

        let r1 = process_turn_based(pos, &mut mc, MovementInput { dx: 0, dy: 1 });
        assert!(r1.moved);
        assert_eq!(r1.new_position, Position { x: 0, y: 8 });
        assert_eq!(mc.step_cooldown, 4);

        // Tick down cooldown
        for _ in 0..3 {
            let r = process_turn_based(r1.new_position, &mut mc, MovementInput { dx: 0, dy: 1 });
            assert!(!r.moved);
        }
        // 4th tick clears cooldown
        let r2 = process_turn_based(r1.new_position, &mut mc, MovementInput { dx: 0, dy: 1 });
        assert!(!r2.moved); // cooldown was 1, decremented to 0 — next tick allows move
        let r3 = process_turn_based(r1.new_position, &mut mc, MovementInput { dx: 0, dy: 1 });
        assert!(r3.moved);
        assert_eq!(r3.new_position, Position { x: 0, y: 16 });
    }

    #[test]
    fn movement_input_facing() {
        assert_eq!(
            MovementInput { dx: 0, dy: -1 }.to_facing(),
            Some(FacingDirection::Up)
        );
        assert_eq!(
            MovementInput { dx: 0, dy: 1 }.to_facing(),
            Some(FacingDirection::Down)
        );
        assert_eq!(
            MovementInput { dx: -1, dy: 0 }.to_facing(),
            Some(FacingDirection::Left)
        );
        assert_eq!(
            MovementInput { dx: 1, dy: 0 }.to_facing(),
            Some(FacingDirection::Right)
        );
        assert_eq!(MovementInput::none().to_facing(), None);
        // Diagonal: vertical takes priority
        assert_eq!(
            MovementInput { dx: 1, dy: -1 }.to_facing(),
            Some(FacingDirection::Up)
        );
    }

    #[test]
    fn process_movement_dispatches_correctly() {
        let pos = Position { x: 0, y: 0 };
        let input = MovementInput { dx: 1, dy: 0 };

        let mut grid = MovementComponent::grid_snap(8.0);
        let r = process_movement(pos, &mut grid, input);
        assert_eq!(r.new_position, Position { x: 8, y: 0 });

        let mut free = MovementComponent::free_move(3.0);
        let r = process_movement(pos, &mut free, input);
        assert_eq!(r.new_position, Position { x: 3, y: 0 });

        let mut turn = MovementComponent::turn_based(8.0);
        let r = process_movement(pos, &mut turn, input);
        assert_eq!(r.new_position, Position { x: 8, y: 0 });
    }

    #[test]
    fn movement_component_serialization() {
        let mc = MovementComponent::grid_snap(8.0);
        let json = serde_json::to_string(&mc).expect("serialize");
        let deserialized: MovementComponent = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(mc, deserialized);
    }
}
