use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::map_editor::{Entity, EntityId, Position, TileId};

/// Scene identifier. Uses human-readable strings (e.g. "overworld", "level_2").
pub type SceneId = String;

/// A named location where entities can appear when entering a scene.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SpawnPoint {
    pub name: String,
    pub position: Position,
}

/// A single game scene containing its own entities, tiles, and spawn points.
/// Each scene is independently editable and has its own coordinate space.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene {
    pub id: SceneId,
    pub name: String,
    pub entities: HashMap<EntityId, Entity>,
    pub tiles: HashMap<(i32, i32), TileId>,
    pub spawn_points: Vec<SpawnPoint>,
}

impl Scene {
    pub fn new(id: impl Into<SceneId>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            entities: HashMap::new(),
            tiles: HashMap::new(),
            spawn_points: Vec::new(),
        }
    }

    pub fn add_spawn_point(&mut self, name: impl Into<String>, position: Position) {
        self.spawn_points.push(SpawnPoint {
            name: name.into(),
            position,
        });
    }

    /// Find a spawn point by name, or return the first one, or default to (0, 0).
    pub fn resolve_spawn_position(&self, spawn_name: Option<&str>) -> Position {
        if let Some(name) = spawn_name {
            if let Some(sp) = self.spawn_points.iter().find(|sp| sp.name == name) {
                return sp.position;
            }
        }
        self.spawn_points
            .first()
            .map(|sp| sp.position)
            .unwrap_or(Position { x: 0, y: 0 })
    }
}

/// Manages a collection of scenes with an active scene concept.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SceneCollection {
    scenes: HashMap<SceneId, Scene>,
    active_scene_id: Option<SceneId>,
}

impl SceneCollection {
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a scene to the collection. If no active scene is set, this becomes active.
    pub fn add_scene(&mut self, scene: Scene) {
        let id = scene.id.clone();
        if self.active_scene_id.is_none() {
            self.active_scene_id = Some(id.clone());
        }
        self.scenes.insert(id, scene);
    }

    /// Remove a scene. If the removed scene was active, active is cleared.
    pub fn remove_scene(&mut self, id: &str) -> Option<Scene> {
        let removed = self.scenes.remove(id);
        if self.active_scene_id.as_deref() == Some(id) {
            self.active_scene_id = self.scenes.keys().next().cloned();
        }
        removed
    }

    pub fn get_scene(&self, id: &str) -> Option<&Scene> {
        self.scenes.get(id)
    }

    pub fn get_scene_mut(&mut self, id: &str) -> Option<&mut Scene> {
        self.scenes.get_mut(id)
    }

    pub fn active_scene_id(&self) -> Option<&str> {
        self.active_scene_id.as_deref()
    }

    pub fn active_scene(&self) -> Option<&Scene> {
        self.active_scene_id
            .as_ref()
            .and_then(|id| self.scenes.get(id))
    }

    pub fn set_active_scene(&mut self, id: &str) -> bool {
        if self.scenes.contains_key(id) {
            self.active_scene_id = Some(id.to_string());
            true
        } else {
            false
        }
    }

    pub fn scene_ids(&self) -> Vec<&str> {
        let mut ids: Vec<_> = self.scenes.keys().map(|s| s.as_str()).collect();
        ids.sort();
        ids
    }

    pub fn scene_count(&self) -> usize {
        self.scenes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.scenes.is_empty()
    }

    pub fn scenes(&self) -> &HashMap<SceneId, Scene> {
        &self.scenes
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scene_creation_and_spawn_points() {
        let mut scene = Scene::new("level_1", "Level 1");
        assert_eq!(scene.id, "level_1");
        assert_eq!(scene.name, "Level 1");
        assert!(scene.entities.is_empty());
        assert!(scene.tiles.is_empty());
        assert!(scene.spawn_points.is_empty());

        scene.add_spawn_point("start", Position { x: 16, y: 32 });
        scene.add_spawn_point("exit", Position { x: 128, y: 32 });
        assert_eq!(scene.spawn_points.len(), 2);
    }

    #[test]
    fn resolve_spawn_position_finds_by_name() {
        let mut scene = Scene::new("s", "S");
        scene.add_spawn_point("door_a", Position { x: 10, y: 20 });
        scene.add_spawn_point("door_b", Position { x: 100, y: 50 });

        assert_eq!(
            scene.resolve_spawn_position(Some("door_b")),
            Position { x: 100, y: 50 }
        );
    }

    #[test]
    fn resolve_spawn_position_falls_back_to_first() {
        let mut scene = Scene::new("s", "S");
        scene.add_spawn_point("default", Position { x: 5, y: 5 });

        assert_eq!(
            scene.resolve_spawn_position(Some("nonexistent")),
            Position { x: 5, y: 5 }
        );
        assert_eq!(
            scene.resolve_spawn_position(None),
            Position { x: 5, y: 5 }
        );
    }

    #[test]
    fn resolve_spawn_position_defaults_to_origin() {
        let scene = Scene::new("s", "S");
        assert_eq!(
            scene.resolve_spawn_position(None),
            Position { x: 0, y: 0 }
        );
    }

    #[test]
    fn scene_collection_add_and_lookup() {
        let mut collection = SceneCollection::new();
        assert!(collection.is_empty());

        collection.add_scene(Scene::new("overworld", "Overworld"));
        collection.add_scene(Scene::new("dungeon", "Dungeon"));
        assert_eq!(collection.scene_count(), 2);
        assert!(!collection.is_empty());

        // First added scene becomes active by default
        assert_eq!(collection.active_scene_id(), Some("overworld"));
        assert_eq!(
            collection.active_scene().map(|s| s.name.as_str()),
            Some("Overworld")
        );
    }

    #[test]
    fn scene_collection_switch_active() {
        let mut collection = SceneCollection::new();
        collection.add_scene(Scene::new("a", "A"));
        collection.add_scene(Scene::new("b", "B"));

        assert!(collection.set_active_scene("b"));
        assert_eq!(collection.active_scene_id(), Some("b"));

        assert!(!collection.set_active_scene("nonexistent"));
        assert_eq!(collection.active_scene_id(), Some("b"));
    }

    #[test]
    fn scene_collection_remove_active_falls_back() {
        let mut collection = SceneCollection::new();
        collection.add_scene(Scene::new("a", "A"));
        collection.add_scene(Scene::new("b", "B"));
        collection.set_active_scene("a");

        let removed = collection.remove_scene("a");
        assert!(removed.is_some());
        assert_eq!(removed.unwrap().id, "a");
        // Active should fall back to remaining scene
        assert_eq!(collection.active_scene_id(), Some("b"));
    }

    #[test]
    fn scene_collection_remove_last_clears_active() {
        let mut collection = SceneCollection::new();
        collection.add_scene(Scene::new("only", "Only"));
        collection.remove_scene("only");
        assert!(collection.active_scene_id().is_none());
        assert!(collection.is_empty());
    }

    #[test]
    fn scene_collection_scene_ids_sorted() {
        let mut collection = SceneCollection::new();
        collection.add_scene(Scene::new("c", "C"));
        collection.add_scene(Scene::new("a", "A"));
        collection.add_scene(Scene::new("b", "B"));
        assert_eq!(collection.scene_ids(), vec!["a", "b", "c"]);
    }

    #[test]
    fn scene_collection_get_scene_mut() {
        let mut collection = SceneCollection::new();
        collection.add_scene(Scene::new("s", "S"));

        let scene = collection.get_scene_mut("s").expect("get_scene_mut");
        scene.add_spawn_point("added", Position { x: 1, y: 1 });
        assert_eq!(collection.get_scene("s").unwrap().spawn_points.len(), 1);
    }
}
