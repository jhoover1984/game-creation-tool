use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::components::EntityComponents;

pub type PrefabId = String;

/// A reusable entity template. Define once, stamp many instances.
/// Each stamped instance starts with `default_components` but may be overridden independently.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EntityPrefab {
    pub id: PrefabId,
    pub name: String,
    pub default_components: EntityComponents,
}

impl EntityPrefab {
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            default_components: EntityComponents::default(),
        }
    }

    pub fn with_components(mut self, components: EntityComponents) -> Self {
        self.default_components = components;
        self
    }
}

/// In-memory library of all entity prefabs for the current project.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PrefabLibrary {
    prefabs: HashMap<PrefabId, EntityPrefab>,
}

impl PrefabLibrary {
    pub fn new() -> Self {
        Self::default()
    }

    /// Insert or replace a prefab. If a prefab with the same id already exists it is overwritten.
    pub fn insert(&mut self, prefab: EntityPrefab) {
        self.prefabs.insert(prefab.id.clone(), prefab);
    }

    pub fn get(&self, id: &str) -> Option<&EntityPrefab> {
        self.prefabs.get(id)
    }

    pub fn remove(&mut self, id: &str) -> Option<EntityPrefab> {
        self.prefabs.remove(id)
    }

    /// Returns all prefabs sorted by id for stable display ordering.
    pub fn list(&self) -> Vec<&EntityPrefab> {
        let mut list: Vec<_> = self.prefabs.values().collect();
        list.sort_by(|a, b| a.id.cmp(&b.id));
        list
    }

    /// Update just the display name. Returns false if the id was not found.
    pub fn update_name(&mut self, id: &str, name: impl Into<String>) -> bool {
        if let Some(prefab) = self.prefabs.get_mut(id) {
            prefab.name = name.into();
            true
        } else {
            false
        }
    }

    /// Replace the default component set. Returns false if the id was not found.
    pub fn update_components(&mut self, id: &str, components: EntityComponents) -> bool {
        if let Some(prefab) = self.prefabs.get_mut(id) {
            prefab.default_components = components;
            true
        } else {
            false
        }
    }

    pub fn len(&self) -> usize {
        self.prefabs.len()
    }

    pub fn is_empty(&self) -> bool {
        self.prefabs.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::components::{CollisionBox, EntityComponents};

    #[test]
    fn prefab_library_crud() {
        let mut lib = PrefabLibrary::new();
        assert!(lib.is_empty());

        lib.insert(EntityPrefab::new("enemy_slime", "Slime"));
        assert_eq!(lib.len(), 1);
        assert!(lib.get("enemy_slime").is_some());
        assert_eq!(lib.get("enemy_slime").unwrap().name, "Slime");

        let removed = lib.remove("enemy_slime");
        assert!(removed.is_some());
        assert!(lib.is_empty());
    }

    #[test]
    fn prefab_library_list_sorted() {
        let mut lib = PrefabLibrary::new();
        lib.insert(EntityPrefab::new("z_last", "Last"));
        lib.insert(EntityPrefab::new("a_first", "First"));
        lib.insert(EntityPrefab::new("m_middle", "Middle"));

        let list = lib.list();
        assert_eq!(list.len(), 3);
        assert_eq!(list[0].id, "a_first");
        assert_eq!(list[1].id, "m_middle");
        assert_eq!(list[2].id, "z_last");
    }

    #[test]
    fn prefab_update_name_and_components() {
        let mut lib = PrefabLibrary::new();
        lib.insert(EntityPrefab::new("hero", "Hero"));

        assert!(lib.update_name("hero", "Player Hero"));
        assert_eq!(lib.get("hero").unwrap().name, "Player Hero");

        let components = EntityComponents {
            collision: Some(CollisionBox::new(16, 16)),
            ..Default::default()
        };
        assert!(lib.update_components("hero", components.clone()));
        assert_eq!(lib.get("hero").unwrap().default_components, components);
    }

    #[test]
    fn prefab_update_returns_false_for_missing_id() {
        let mut lib = PrefabLibrary::new();
        assert!(!lib.update_name("nonexistent", "Name"));
        assert!(!lib.update_components("nonexistent", EntityComponents::default()));
    }

    #[test]
    fn prefab_with_components_builder() {
        let components = EntityComponents {
            collision: Some(CollisionBox::new(8, 8)),
            ..Default::default()
        };
        let prefab = EntityPrefab::new("box", "Box").with_components(components.clone());
        assert_eq!(prefab.default_components, components);
    }

    #[test]
    fn prefab_serialization_roundtrip() {
        let mut lib = PrefabLibrary::new();
        let components = EntityComponents {
            collision: Some(CollisionBox::new(16, 16)),
            ..Default::default()
        };
        lib.insert(EntityPrefab::new("wall", "Wall").with_components(components));

        let json = serde_json::to_string(&lib).expect("serialize");
        let deserialized: PrefabLibrary = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.len(), 1);
        assert_eq!(deserialized.get("wall").unwrap().name, "Wall");
    }

    #[test]
    fn insert_overwrites_existing_prefab() {
        let mut lib = PrefabLibrary::new();
        lib.insert(EntityPrefab::new("npc", "Generic NPC"));
        lib.insert(EntityPrefab::new("npc", "Upgraded NPC"));
        assert_eq!(lib.len(), 1);
        assert_eq!(lib.get("npc").unwrap().name, "Upgraded NPC");
    }
}
