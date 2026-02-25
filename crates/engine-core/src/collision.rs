use std::collections::HashMap;

use crate::components::{CollisionBox, ComponentStore};
use crate::{Entity, EntityId, Position, TileId, TilePropertyRegistry};

/// Axis-aligned bounding box in world coordinates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Aabb {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl Aabb {
    pub fn new(x: i32, y: i32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    /// Right edge (exclusive).
    pub fn right(&self) -> i32 {
        self.x.saturating_add(self.width as i32)
    }

    /// Bottom edge (exclusive).
    pub fn bottom(&self) -> i32 {
        self.y.saturating_add(self.height as i32)
    }

    /// Check overlap with another AABB.
    pub fn overlaps(&self, other: &Aabb) -> bool {
        self.x < other.right()
            && self.right() > other.x
            && self.y < other.bottom()
            && self.bottom() > other.y
    }

    /// Check if a point is inside this AABB.
    pub fn contains_point(&self, px: i32, py: i32) -> bool {
        px >= self.x && px < self.right() && py >= self.y && py < self.bottom()
    }
}

/// Compute the world-space AABB for an entity given its collision box.
pub fn entity_aabb(entity: &Entity, collision: &CollisionBox) -> Aabb {
    Aabb {
        x: entity.position.x + collision.offset_x,
        y: entity.position.y + collision.offset_y,
        width: collision.width,
        height: collision.height,
    }
}

/// A collision between two entities.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CollisionPair {
    pub entity_a: EntityId,
    pub entity_b: EntityId,
}

/// Find all overlapping pairs of entities that have collision boxes.
/// Only checks solid vs any (including non-solid triggers).
pub fn check_entity_collisions(
    entities: &HashMap<EntityId, Entity>,
    components: &ComponentStore,
) -> Vec<CollisionPair> {
    let collidables: Vec<(EntityId, Aabb, bool)> = components
        .entities_with_collision()
        .into_iter()
        .filter_map(|id| {
            let entity = entities.get(&id)?;
            let collision = components.collision(id)?;
            Some((id, entity_aabb(entity, collision), collision.solid))
        })
        .collect();

    let mut pairs = Vec::new();
    for i in 0..collidables.len() {
        for j in (i + 1)..collidables.len() {
            let (id_a, aabb_a, _) = &collidables[i];
            let (id_b, aabb_b, _) = &collidables[j];
            if aabb_a.overlaps(aabb_b) {
                pairs.push(CollisionPair {
                    entity_a: *id_a,
                    entity_b: *id_b,
                });
            }
        }
    }
    pairs
}

/// Check which tile positions an entity's collision box overlaps.
/// Returns a list of occupied tile coordinates.
pub fn check_tile_collisions(
    position: Position,
    collision: &CollisionBox,
    tiles: &HashMap<(i32, i32), TileId>,
    tile_size: u32,
) -> Vec<(i32, i32)> {
    if tile_size == 0 {
        return Vec::new();
    }
    let aabb = Aabb {
        x: position.x + collision.offset_x,
        y: position.y + collision.offset_y,
        width: collision.width,
        height: collision.height,
    };

    let tile_size_i = tile_size as i32;
    let start_tx = aabb.x.div_euclid(tile_size_i);
    let end_tx = (aabb.right() - 1).div_euclid(tile_size_i);
    let start_ty = aabb.y.div_euclid(tile_size_i);
    let end_ty = (aabb.bottom() - 1).div_euclid(tile_size_i);

    let mut hits = Vec::new();
    for ty in start_ty..=end_ty {
        for tx in start_tx..=end_tx {
            if tiles.contains_key(&(tx, ty)) {
                hits.push((tx, ty));
            }
        }
    }
    hits
}

/// Check whether moving an entity to a new position would cause a solid collision
/// with any other entity. Returns the list of blocking entity IDs.
pub fn would_collide_with_entities(
    entity_id: EntityId,
    new_position: Position,
    collision: &CollisionBox,
    entities: &HashMap<EntityId, Entity>,
    components: &ComponentStore,
) -> Vec<EntityId> {
    let moving_aabb = Aabb {
        x: new_position.x + collision.offset_x,
        y: new_position.y + collision.offset_y,
        width: collision.width,
        height: collision.height,
    };

    components
        .entities_with_collision()
        .into_iter()
        .filter(|id| *id != entity_id)
        .filter_map(|id| {
            let other = entities.get(&id)?;
            let other_collision = components.collision(id)?;
            if !other_collision.solid {
                return None;
            }
            let other_aabb = entity_aabb(other, other_collision);
            if moving_aabb.overlaps(&other_aabb) {
                Some(id)
            } else {
                None
            }
        })
        .collect()
}

/// Check whether moving to a new position would collide with any solid tiles.
/// Returns the list of solid tile coordinates that would block movement.
pub fn would_collide_with_tiles(
    new_position: Position,
    collision: &CollisionBox,
    tiles: &HashMap<(i32, i32), TileId>,
    tile_properties: &TilePropertyRegistry,
    tile_size: u32,
) -> Vec<(i32, i32)> {
    check_tile_collisions(new_position, collision, tiles, tile_size)
        .into_iter()
        .filter(|(tx, ty)| {
            tiles
                .get(&(*tx, *ty))
                .map(|id| tile_properties.is_solid(*id))
                .unwrap_or(false)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aabb_overlap_detection() {
        let a = Aabb::new(0, 0, 10, 10);
        let b = Aabb::new(5, 5, 10, 10);
        assert!(a.overlaps(&b));
        assert!(b.overlaps(&a));

        let c = Aabb::new(10, 10, 10, 10);
        assert!(!a.overlaps(&c), "touching edges should not overlap");

        let d = Aabb::new(20, 20, 5, 5);
        assert!(!a.overlaps(&d));
    }

    #[test]
    fn aabb_contains_point() {
        let a = Aabb::new(10, 20, 30, 40);
        assert!(a.contains_point(10, 20));
        assert!(a.contains_point(39, 59));
        assert!(!a.contains_point(40, 60), "right/bottom edges are exclusive");
        assert!(!a.contains_point(9, 20));
    }

    #[test]
    fn entity_aabb_with_offset() {
        let entity = Entity {
            id: 1,
            name: "test".to_string(),
            position: Position { x: 100, y: 200 },
        };
        let cb = CollisionBox::new(16, 16).with_offset(2, 4);
        let aabb = entity_aabb(&entity, &cb);
        assert_eq!(aabb.x, 102);
        assert_eq!(aabb.y, 204);
        assert_eq!(aabb.width, 16);
        assert_eq!(aabb.height, 16);
    }

    #[test]
    fn entity_collision_pairs() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            Entity {
                id: 1,
                name: "A".to_string(),
                position: Position { x: 0, y: 0 },
            },
        );
        entities.insert(
            2,
            Entity {
                id: 2,
                name: "B".to_string(),
                position: Position { x: 5, y: 5 },
            },
        );
        entities.insert(
            3,
            Entity {
                id: 3,
                name: "C".to_string(),
                position: Position { x: 100, y: 100 },
            },
        );

        let mut components = ComponentStore::new();
        components.set_collision(1, CollisionBox::new(10, 10));
        components.set_collision(2, CollisionBox::new(10, 10));
        components.set_collision(3, CollisionBox::new(10, 10));

        let pairs = check_entity_collisions(&entities, &components);
        assert_eq!(pairs.len(), 1);
        let pair = &pairs[0];
        assert!(
            (pair.entity_a == 1 && pair.entity_b == 2)
                || (pair.entity_a == 2 && pair.entity_b == 1)
        );
    }

    #[test]
    fn tile_collision_check() {
        let mut tiles = HashMap::new();
        tiles.insert((1, 1), 1u16);
        tiles.insert((2, 1), 1);
        tiles.insert((5, 5), 1);

        let cb = CollisionBox::new(8, 8);
        let pos = Position { x: 10, y: 10 };
        let hits = check_tile_collisions(pos, &cb, &tiles, 8);
        assert_eq!(hits.len(), 2);
        assert!(hits.contains(&(1, 1)));
        assert!(hits.contains(&(2, 1)));
    }

    #[test]
    fn tile_collision_empty_tiles() {
        let tiles = HashMap::new();
        let cb = CollisionBox::new(8, 8);
        let pos = Position { x: 0, y: 0 };
        let hits = check_tile_collisions(pos, &cb, &tiles, 8);
        assert!(hits.is_empty());
    }

    #[test]
    fn would_collide_check() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            Entity {
                id: 1,
                name: "Player".to_string(),
                position: Position { x: 0, y: 0 },
            },
        );
        entities.insert(
            2,
            Entity {
                id: 2,
                name: "Wall".to_string(),
                position: Position { x: 20, y: 0 },
            },
        );

        let mut components = ComponentStore::new();
        components.set_collision(1, CollisionBox::new(16, 16));
        components.set_collision(2, CollisionBox::new(16, 16));

        // Moving player to (10, 0) would overlap with Wall at (20, 0)
        let blockers = would_collide_with_entities(
            1,
            Position { x: 10, y: 0 },
            &CollisionBox::new(16, 16),
            &entities,
            &components,
        );
        assert_eq!(blockers, vec![2]);

        // Moving player to (50, 0) would not overlap
        let no_blockers = would_collide_with_entities(
            1,
            Position { x: 50, y: 0 },
            &CollisionBox::new(16, 16),
            &entities,
            &components,
        );
        assert!(no_blockers.is_empty());
    }

    #[test]
    fn would_collide_with_solid_tiles() {
        let mut tiles = HashMap::new();
        tiles.insert((1, 1), 1u16); // solid by default
        tiles.insert((2, 1), 2u16); // will be non-solid

        let mut registry = TilePropertyRegistry::new();
        registry.set(2, crate::TileProperties { solid: false });

        let cb = CollisionBox::new(8, 8);
        let pos = Position { x: 10, y: 10 };
        let blockers = would_collide_with_tiles(pos, &cb, &tiles, &registry, 8);
        assert_eq!(blockers.len(), 1);
        assert!(blockers.contains(&(1, 1)));
    }

    #[test]
    fn would_collide_all_non_solid_tiles_pass() {
        let mut tiles = HashMap::new();
        tiles.insert((0, 0), 10u16);
        tiles.insert((1, 0), 10u16);

        let mut registry = TilePropertyRegistry::new();
        registry.set(10, crate::TileProperties { solid: false });

        let cb = CollisionBox::new(16, 8);
        let pos = Position { x: 0, y: 0 };
        let blockers = would_collide_with_tiles(pos, &cb, &tiles, &registry, 8);
        assert!(blockers.is_empty());
    }

    #[test]
    fn non_solid_entities_dont_block() {
        let mut entities = HashMap::new();
        entities.insert(
            1,
            Entity {
                id: 1,
                name: "Player".to_string(),
                position: Position { x: 0, y: 0 },
            },
        );
        entities.insert(
            2,
            Entity {
                id: 2,
                name: "Trigger".to_string(),
                position: Position { x: 5, y: 0 },
            },
        );

        let mut components = ComponentStore::new();
        components.set_collision(1, CollisionBox::new(16, 16));
        components.set_collision(2, CollisionBox::new(16, 16).non_solid());

        // Non-solid entity should not block
        let blockers = would_collide_with_entities(
            1,
            Position { x: 5, y: 0 },
            &CollisionBox::new(16, 16),
            &entities,
            &components,
        );
        assert!(blockers.is_empty());

        // But they should still appear in collision pairs
        let pairs = check_entity_collisions(&entities, &components);
        assert_eq!(pairs.len(), 1);
    }
}
