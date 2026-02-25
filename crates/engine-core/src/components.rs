use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::animation::AnimationComponent;
use crate::movement::MovementComponent;
use crate::physics::VelocityComponent;
use crate::EntityId;

/// Axis-aligned collision box relative to the entity's position.
/// Position is top-left corner offset; width/height define the box extent.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CollisionBox {
    /// Offset from entity position (typically 0).
    pub offset_x: i32,
    /// Offset from entity position (typically 0).
    pub offset_y: i32,
    pub width: u32,
    pub height: u32,
    /// If true, other entities cannot overlap this box.
    pub solid: bool,
}

impl CollisionBox {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            offset_x: 0,
            offset_y: 0,
            width,
            height,
            solid: true,
        }
    }

    pub fn with_offset(mut self, offset_x: i32, offset_y: i32) -> Self {
        self.offset_x = offset_x;
        self.offset_y = offset_y;
        self
    }

    pub fn non_solid(mut self) -> Self {
        self.solid = false;
        self
    }
}

/// Visual representation reference for an entity.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SpriteComponent {
    pub asset_id: String,
    pub frame: u32,
}

impl SpriteComponent {
    pub fn new(asset_id: impl Into<String>) -> Self {
        Self {
            asset_id: asset_id.into(),
            frame: 0,
        }
    }
}

/// Component bag for a single entity. Each field is optional so
/// entities only carry the components they need.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct EntityComponents {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub collision: Option<CollisionBox>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sprite: Option<SpriteComponent>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub movement: Option<MovementComponent>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub velocity: Option<VelocityComponent>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub animation: Option<AnimationComponent>,
}

/// Maps entity IDs to their component bags.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ComponentStore {
    components: HashMap<EntityId, EntityComponents>,
}

impl ComponentStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set(&mut self, entity_id: EntityId, components: EntityComponents) {
        self.components.insert(entity_id, components);
    }

    pub fn get(&self, entity_id: EntityId) -> Option<&EntityComponents> {
        self.components.get(&entity_id)
    }

    pub fn get_mut(&mut self, entity_id: EntityId) -> Option<&mut EntityComponents> {
        self.components.get_mut(&entity_id)
    }

    pub fn remove(&mut self, entity_id: EntityId) -> Option<EntityComponents> {
        self.components.remove(&entity_id)
    }

    pub fn retain(
        &mut self,
        mut f: impl FnMut(EntityId, &mut EntityComponents) -> bool,
    ) {
        self.components.retain(|entity_id, components| {
            f(*entity_id, components)
        });
    }

    pub fn set_collision(&mut self, entity_id: EntityId, collision: CollisionBox) {
        self.components
            .entry(entity_id)
            .or_default()
            .collision = Some(collision);
    }

    pub fn set_sprite(&mut self, entity_id: EntityId, sprite: SpriteComponent) {
        self.components
            .entry(entity_id)
            .or_default()
            .sprite = Some(sprite);
    }

    pub fn collision(&self, entity_id: EntityId) -> Option<&CollisionBox> {
        self.components.get(&entity_id)?.collision.as_ref()
    }

    pub fn sprite(&self, entity_id: EntityId) -> Option<&SpriteComponent> {
        self.components.get(&entity_id)?.sprite.as_ref()
    }

    pub fn set_movement(&mut self, entity_id: EntityId, movement: MovementComponent) {
        self.components
            .entry(entity_id)
            .or_default()
            .movement = Some(movement);
    }

    pub fn movement(&self, entity_id: EntityId) -> Option<&MovementComponent> {
        self.components.get(&entity_id)?.movement.as_ref()
    }

    pub fn movement_mut(&mut self, entity_id: EntityId) -> Option<&mut MovementComponent> {
        self.components.get_mut(&entity_id)?.movement.as_mut()
    }

    pub fn entities_with_movement(&self) -> Vec<EntityId> {
        self.components
            .iter()
            .filter(|(_, c)| c.movement.is_some())
            .map(|(id, _)| *id)
            .collect()
    }

    pub fn set_velocity(&mut self, entity_id: EntityId, velocity: VelocityComponent) {
        self.components
            .entry(entity_id)
            .or_default()
            .velocity = Some(velocity);
    }

    pub fn velocity(&self, entity_id: EntityId) -> Option<&VelocityComponent> {
        self.components.get(&entity_id)?.velocity.as_ref()
    }

    pub fn velocity_mut(&mut self, entity_id: EntityId) -> Option<&mut VelocityComponent> {
        self.components.get_mut(&entity_id)?.velocity.as_mut()
    }

    pub fn entities_with_velocity(&self) -> Vec<EntityId> {
        self.components
            .iter()
            .filter(|(_, c)| c.velocity.is_some())
            .map(|(id, _)| *id)
            .collect()
    }

    pub fn entities_with_collision(&self) -> Vec<EntityId> {
        self.components
            .iter()
            .filter(|(_, c)| c.collision.is_some())
            .map(|(id, _)| *id)
            .collect()
    }

    pub fn set_animation(&mut self, entity_id: EntityId, animation: AnimationComponent) {
        self.components
            .entry(entity_id)
            .or_default()
            .animation = Some(animation);
    }

    pub fn animation(&self, entity_id: EntityId) -> Option<&AnimationComponent> {
        self.components.get(&entity_id)?.animation.as_ref()
    }

    pub fn animation_mut(&mut self, entity_id: EntityId) -> Option<&mut AnimationComponent> {
        self.components.get_mut(&entity_id)?.animation.as_mut()
    }

    pub fn entities_with_animation(&self) -> Vec<EntityId> {
        self.components
            .iter()
            .filter(|(_, c)| c.animation.is_some())
            .map(|(id, _)| *id)
            .collect()
    }

    pub fn len(&self) -> usize {
        self.components.len()
    }

    pub fn is_empty(&self) -> bool {
        self.components.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn collision_box_builder() {
        let cb = CollisionBox::new(16, 16).with_offset(2, 4).non_solid();
        assert_eq!(cb.width, 16);
        assert_eq!(cb.height, 16);
        assert_eq!(cb.offset_x, 2);
        assert_eq!(cb.offset_y, 4);
        assert!(!cb.solid);
    }

    #[test]
    fn component_store_crud() {
        let mut store = ComponentStore::new();
        assert!(store.is_empty());

        store.set_collision(1, CollisionBox::new(8, 8));
        assert_eq!(store.len(), 1);
        assert!(store.collision(1).is_some());
        assert!(store.sprite(1).is_none());

        store.set_sprite(1, SpriteComponent::new("player"));
        assert!(store.sprite(1).is_some());
        assert_eq!(store.sprite(1).unwrap().asset_id, "player");

        store.set_collision(2, CollisionBox::new(16, 16));
        let with_collision = store.entities_with_collision();
        assert_eq!(with_collision.len(), 2);

        store.remove(1);
        assert!(store.get(1).is_none());
        assert_eq!(store.len(), 1);

        store.retain(|entity_id, _| entity_id == 999);
        assert!(store.is_empty());
    }

    #[test]
    fn entity_components_serialization_roundtrip() {
        let components = EntityComponents {
            collision: Some(CollisionBox::new(8, 8)),
            sprite: Some(SpriteComponent::new("npc")),
            movement: None,
            velocity: None,
            animation: None,
        };
        let json = serde_json::to_string(&components).expect("serialize");
        let deserialized: EntityComponents = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(components, deserialized);
    }

    #[test]
    fn empty_components_skip_none_fields() {
        let components = EntityComponents::default();
        let json = serde_json::to_string(&components).expect("serialize");
        assert_eq!(json, "{}");
    }
}
