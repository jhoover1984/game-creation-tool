use gcs_math::Vec2;

/// Movement mode for an entity.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MovementMode {
    /// Snap to grid cells (tile_size spacing).
    Grid { tile_size: f32 },
    /// Free sub-pixel movement.
    Free,
}

/// Move an entity in grid mode. Returns the snapped position delta.
pub fn grid_move(direction: Vec2, tile_size: f32) -> Vec2 {
    // Snap direction to cardinal (largest axis wins)
    if direction.x.abs() >= direction.y.abs() {
        Vec2::new(direction.x.signum() * tile_size, 0.0)
    } else {
        Vec2::new(0.0, direction.y.signum() * tile_size)
    }
}

/// Move an entity in free mode. Returns the scaled delta.
pub fn free_move(direction: Vec2, speed: f32, dt: f32) -> Vec2 {
    if direction == Vec2::ZERO {
        return Vec2::ZERO;
    }
    direction.normalize() * speed * dt
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grid_snaps_to_cardinal() {
        let delta = grid_move(Vec2::new(0.7, 0.3), 16.0);
        assert_eq!(delta, Vec2::new(16.0, 0.0));
    }

    #[test]
    fn free_normalizes_direction() {
        let delta = free_move(Vec2::new(1.0, 1.0), 100.0, 1.0 / 60.0);
        let expected_speed = 100.0 / 60.0;
        let actual_speed = delta.length();
        assert!((actual_speed - expected_speed).abs() < 0.01);
    }

    #[test]
    fn free_zero_input_no_move() {
        let delta = free_move(Vec2::ZERO, 100.0, 1.0 / 60.0);
        assert_eq!(delta, Vec2::ZERO);
    }
}
