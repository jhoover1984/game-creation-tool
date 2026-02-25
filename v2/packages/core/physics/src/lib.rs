//! Physics-lite: velocity, gravity, friction, fixed-step integration.

use gcs_math::Vec2;
use serde::{Deserialize, Serialize};

/// Physics body state.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PhysicsBody {
    pub velocity: Vec2,
    pub gravity_scale: f32,
    pub friction: f32,
}

impl Default for PhysicsBody {
    fn default() -> Self {
        Self {
            velocity: Vec2::ZERO,
            gravity_scale: 1.0,
            friction: 0.0,
        }
    }
}

/// Global physics config.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PhysicsConfig {
    pub gravity: Vec2,
    pub fixed_dt: f32,
}

impl Default for PhysicsConfig {
    fn default() -> Self {
        Self {
            gravity: Vec2::new(0.0, 980.0),
            fixed_dt: 1.0 / 60.0,
        }
    }
}

/// Integrate one physics step. Returns the position delta to apply.
pub fn integrate_step(body: &mut PhysicsBody, config: &PhysicsConfig) -> Vec2 {
    // Apply gravity
    body.velocity += config.gravity * body.gravity_scale * config.fixed_dt;

    // Apply friction
    if body.friction > 0.0 {
        let damping = (1.0 - body.friction * config.fixed_dt).max(0.0);
        body.velocity *= damping;
    }

    body.velocity * config.fixed_dt
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gravity_accelerates() {
        let config = PhysicsConfig::default();
        let mut body = PhysicsBody::default();
        let delta = integrate_step(&mut body, &config);
        assert!(delta.y > 0.0, "gravity should move downward");
    }

    #[test]
    fn zero_gravity_no_movement() {
        let config = PhysicsConfig {
            gravity: Vec2::ZERO,
            ..Default::default()
        };
        let mut body = PhysicsBody::default();
        let delta = integrate_step(&mut body, &config);
        assert_eq!(delta, Vec2::ZERO);
    }

    #[test]
    fn friction_damps_velocity() {
        let config = PhysicsConfig {
            gravity: Vec2::ZERO,
            ..Default::default()
        };
        let mut body = PhysicsBody {
            velocity: Vec2::new(100.0, 0.0),
            friction: 5.0,
            ..Default::default()
        };
        let d1 = integrate_step(&mut body, &config);
        let d2 = integrate_step(&mut body, &config);
        assert!(d2.x.abs() < d1.x.abs(), "friction should reduce movement");
    }
}
