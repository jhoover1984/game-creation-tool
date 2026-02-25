use serde::{Deserialize, Serialize};

/// Velocity component for entities with physics-driven movement.
/// Used by FreeMove mode and platformer-style games.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct VelocityComponent {
    pub vx: f32,
    pub vy: f32,
    pub max_speed: f32,
}

impl Default for VelocityComponent {
    fn default() -> Self {
        Self {
            vx: 0.0,
            vy: 0.0,
            max_speed: 4.0,
        }
    }
}

impl VelocityComponent {
    pub fn new(max_speed: f32) -> Self {
        Self {
            vx: 0.0,
            vy: 0.0,
            max_speed,
        }
    }

    pub fn apply_force(&mut self, fx: f32, fy: f32) {
        self.vx += fx;
        self.vy += fy;
        self.clamp();
    }

    pub fn clamp(&mut self) {
        self.vx = self.vx.clamp(-self.max_speed, self.max_speed);
        self.vy = self.vy.clamp(-self.max_speed, self.max_speed);
    }
}

/// Global physics configuration. Defaults safe for top-down games (no gravity).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct PhysicsConfig {
    /// Downward acceleration per tick. 0.0 for top-down, ~0.5 for platformers.
    pub gravity: f32,
    /// Velocity multiplier per tick (0.0 = instant stop, 1.0 = no friction).
    pub friction: f32,
}

impl Default for PhysicsConfig {
    fn default() -> Self {
        Self {
            gravity: 0.0,
            friction: 0.85,
        }
    }
}

impl PhysicsConfig {
    pub fn top_down() -> Self {
        Self {
            gravity: 0.0,
            friction: 0.85,
        }
    }

    pub fn platformer() -> Self {
        Self {
            gravity: 0.4,
            friction: 0.9,
        }
    }
}

/// Result of a physics step for one entity.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PhysicsStepResult {
    pub dx: i32,
    pub dy: i32,
}

/// Process one physics tick for a velocity component.
/// Returns the pixel displacement to apply.
pub fn physics_step(vel: &mut VelocityComponent, config: &PhysicsConfig) -> PhysicsStepResult {
    // Apply gravity
    vel.vy += config.gravity;

    // Apply friction
    vel.vx *= config.friction;
    vel.vy *= if config.gravity == 0.0 {
        config.friction
    } else {
        1.0 // No vertical friction when gravity is active (air resistance is separate)
    };

    // Clamp to max speed
    vel.clamp();

    // Zero out near-zero velocities to prevent drift
    if vel.vx.abs() < 0.1 {
        vel.vx = 0.0;
    }
    if vel.vy.abs() < 0.1 {
        vel.vy = 0.0;
    }

    // Convert to integer displacement
    let dx = vel.vx.round() as i32;
    let dy = vel.vy.round() as i32;

    PhysicsStepResult { dx, dy }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn velocity_default_is_stationary() {
        let vel = VelocityComponent::default();
        assert_eq!(vel.vx, 0.0);
        assert_eq!(vel.vy, 0.0);
    }

    #[test]
    fn apply_force_and_clamp() {
        let mut vel = VelocityComponent::new(3.0);
        vel.apply_force(10.0, -10.0);
        assert_eq!(vel.vx, 3.0);
        assert_eq!(vel.vy, -3.0);
    }

    #[test]
    fn physics_step_top_down_friction() {
        let config = PhysicsConfig::top_down();
        let mut vel = VelocityComponent::new(4.0);
        vel.vx = 2.0;
        vel.vy = 0.0;

        let r1 = physics_step(&mut vel, &config);
        assert!(r1.dx > 0);
        assert_eq!(r1.dy, 0);

        // Friction should slow down
        let r2 = physics_step(&mut vel, &config);
        assert!(r2.dx <= r1.dx);

        // Eventually velocity zeroes out
        for _ in 0..50 {
            physics_step(&mut vel, &config);
        }
        assert_eq!(vel.vx, 0.0);
    }

    #[test]
    fn physics_step_platformer_gravity() {
        let config = PhysicsConfig::platformer();
        let mut vel = VelocityComponent::new(8.0);

        // Falling: gravity increases vy each tick
        let r1 = physics_step(&mut vel, &config);
        assert!(r1.dy > 0 || vel.vy > 0.0);

        let r2 = physics_step(&mut vel, &config);
        assert!(r2.dy >= r1.dy, "gravity should accelerate downward");
    }

    #[test]
    fn physics_step_no_gravity_no_velocity_is_noop() {
        let config = PhysicsConfig::top_down();
        let mut vel = VelocityComponent::default();
        let result = physics_step(&mut vel, &config);
        assert_eq!(result, PhysicsStepResult { dx: 0, dy: 0 });
    }

    #[test]
    fn velocity_serialization() {
        let vel = VelocityComponent::new(5.0);
        let json = serde_json::to_string(&vel).expect("serialize");
        let deserialized: VelocityComponent = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(vel, deserialized);
    }

    #[test]
    fn physics_config_serialization() {
        let config = PhysicsConfig::platformer();
        let json = serde_json::to_string(&config).expect("serialize");
        let deserialized: PhysicsConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(config, deserialized);
    }
}
