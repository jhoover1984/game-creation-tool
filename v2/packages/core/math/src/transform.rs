use glam::Vec2;
use serde::{Deserialize, Serialize};

/// 2D transform: position + optional rotation and scale.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Transform2D {
    pub position: Vec2,
    pub rotation_rad: f32,
    pub scale: Vec2,
}

impl Default for Transform2D {
    fn default() -> Self {
        Self {
            position: Vec2::ZERO,
            rotation_rad: 0.0,
            scale: Vec2::ONE,
        }
    }
}

impl Transform2D {
    pub fn new(x: f32, y: f32) -> Self {
        Self {
            position: Vec2::new(x, y),
            ..Default::default()
        }
    }

    pub fn translated(&self, delta: Vec2) -> Self {
        Self {
            position: self.position + delta,
            ..*self
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_transform() {
        let t = Transform2D::default();
        assert_eq!(t.position, Vec2::ZERO);
        assert_eq!(t.scale, Vec2::ONE);
        assert_eq!(t.rotation_rad, 0.0);
    }

    #[test]
    fn translate() {
        let t = Transform2D::new(1.0, 2.0);
        let moved = t.translated(Vec2::new(3.0, 4.0));
        assert_eq!(moved.position, Vec2::new(4.0, 6.0));
    }
}
