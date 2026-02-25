use gcs_math::rect::Aabb;
use gcs_math::Vec2;

/// Result of a collision query.
#[derive(Debug, Clone)]
pub struct CollisionResult {
    pub collided: bool,
    pub resolved_position: Vec2,
    pub penetration: Vec2,
}

/// Check if moving an AABB by `delta` would collide with any of the `solids`.
pub fn would_collide(mover: &Aabb, delta: Vec2, solids: &[Aabb]) -> bool {
    let moved = mover.translated(delta);
    solids.iter().any(|s| moved.overlaps(s))
}

/// Attempt to move an AABB by `delta`, resolving against solid AABBs.
/// Returns the furthest valid position (slides along axes).
pub fn resolve_move(mover: &Aabb, delta: Vec2, solids: &[Aabb]) -> CollisionResult {
    let target = mover.translated(delta);

    // Try full move first
    if !solids.iter().any(|s| target.overlaps(s)) {
        return CollisionResult {
            collided: false,
            resolved_position: mover.min + delta,
            penetration: Vec2::ZERO,
        };
    }

    // Try X-only
    let x_only = mover.translated(Vec2::new(delta.x, 0.0));
    let can_x = !solids.iter().any(|s| x_only.overlaps(s));

    // Try Y-only
    let y_only = mover.translated(Vec2::new(0.0, delta.y));
    let can_y = !solids.iter().any(|s| y_only.overlaps(s));

    let resolved_delta = Vec2::new(
        if can_x { delta.x } else { 0.0 },
        if can_y { delta.y } else { 0.0 },
    );

    CollisionResult {
        collided: true,
        resolved_position: mover.min + resolved_delta,
        penetration: delta - resolved_delta,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_collision_free_move() {
        let mover = Aabb::new(0.0, 0.0, 8.0, 8.0);
        let solids = vec![Aabb::new(50.0, 50.0, 8.0, 8.0)];
        assert!(!would_collide(&mover, Vec2::new(1.0, 0.0), &solids));
    }

    #[test]
    fn collision_blocked() {
        let mover = Aabb::new(0.0, 0.0, 8.0, 8.0);
        let wall = Aabb::new(9.0, 0.0, 8.0, 8.0);
        assert!(would_collide(&mover, Vec2::new(5.0, 0.0), &[wall]));
    }

    #[test]
    fn resolve_slides_along_wall() {
        let mover = Aabb::new(0.0, 0.0, 8.0, 8.0);
        let wall = Aabb::new(9.0, 0.0, 8.0, 8.0);
        let result = resolve_move(&mover, Vec2::new(5.0, 3.0), &[wall]);
        assert!(result.collided);
        // X blocked, Y should pass
        assert_eq!(result.resolved_position.x, 0.0);
        assert_eq!(result.resolved_position.y, 3.0);
    }
}
