use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::{AnimationTransition, LoopMode};

pub type AssetId = String;
pub type AnimationClipAssetId = String;

/// Reusable clip definition stored as an asset (not tied to one entity instance).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnimationClipAsset {
    pub id: AssetId,
    pub name: String,
    pub frames: Vec<u16>,
    pub frame_duration_ticks: u32,
    pub loop_mode: LoopMode,
    pub sprite_sheet_id: AssetId,
}

/// Reusable animation graph definition referencing clip assets by ID.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnimationGraphAsset {
    pub id: AssetId,
    pub name: String,
    pub states: HashMap<String, AnimationClipAssetId>,
    pub transitions: Vec<AnimationTransition>,
    pub default_state: String,
}

/// In-memory library of reusable clip assets for a project.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AnimationClipAssetLibrary {
    clips: HashMap<AssetId, AnimationClipAsset>,
}

impl AnimationClipAssetLibrary {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(&mut self, clip: AnimationClipAsset) {
        self.clips.insert(clip.id.clone(), clip);
    }

    pub fn get(&self, id: &str) -> Option<&AnimationClipAsset> {
        self.clips.get(id)
    }

    pub fn remove(&mut self, id: &str) -> Option<AnimationClipAsset> {
        self.clips.remove(id)
    }

    pub fn list(&self) -> Vec<&AnimationClipAsset> {
        let mut list: Vec<_> = self.clips.values().collect();
        list.sort_by(|a, b| a.id.cmp(&b.id));
        list
    }

    pub fn len(&self) -> usize {
        self.clips.len()
    }
}

/// In-memory library of reusable animation graph assets for a project.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AnimationGraphAssetLibrary {
    graphs: HashMap<AssetId, AnimationGraphAsset>,
}

impl AnimationGraphAssetLibrary {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(&mut self, graph: AnimationGraphAsset) {
        self.graphs.insert(graph.id.clone(), graph);
    }

    pub fn get(&self, id: &str) -> Option<&AnimationGraphAsset> {
        self.graphs.get(id)
    }

    pub fn remove(&mut self, id: &str) -> Option<AnimationGraphAsset> {
        self.graphs.remove(id)
    }

    pub fn list(&self) -> Vec<&AnimationGraphAsset> {
        let mut list: Vec<_> = self.graphs.values().collect();
        list.sort_by(|a, b| a.id.cmp(&b.id));
        list
    }

    pub fn len(&self) -> usize {
        self.graphs.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::TransitionCondition;

    #[test]
    fn clip_asset_roundtrip() {
        let clip = AnimationClipAsset {
            id: "clip_walk".into(),
            name: "Walk".into(),
            frames: vec![0, 1, 2, 3],
            frame_duration_ticks: 2,
            loop_mode: LoopMode::Loop,
            sprite_sheet_id: "sheet_player".into(),
        };
        let json = serde_json::to_string(&clip).expect("serialize clip");
        let decoded: AnimationClipAsset = serde_json::from_str(&json).expect("deserialize clip");
        assert_eq!(decoded, clip);
    }

    #[test]
    fn graph_asset_roundtrip() {
        let mut states = HashMap::new();
        states.insert("idle".into(), "clip_idle".into());
        states.insert("walk".into(), "clip_walk".into());
        let graph = AnimationGraphAsset {
            id: "graph_player".into(),
            name: "Player Graph".into(),
            states,
            transitions: vec![crate::AnimationTransition {
                from_state: "idle".into(),
                to_state: "walk".into(),
                condition: TransitionCondition::FlagSet {
                    flag: "is_moving".into(),
                },
            }],
            default_state: "idle".into(),
        };
        let json = serde_json::to_string(&graph).expect("serialize graph");
        let decoded: AnimationGraphAsset = serde_json::from_str(&json).expect("deserialize graph");
        assert_eq!(decoded, graph);
    }

    #[test]
    fn clip_library_crud_sorted() {
        let mut lib = AnimationClipAssetLibrary::new();
        lib.insert(AnimationClipAsset {
            id: "b".into(),
            name: "B".into(),
            frames: vec![1],
            frame_duration_ticks: 1,
            loop_mode: LoopMode::Loop,
            sprite_sheet_id: "sheet".into(),
        });
        lib.insert(AnimationClipAsset {
            id: "a".into(),
            name: "A".into(),
            frames: vec![0],
            frame_duration_ticks: 1,
            loop_mode: LoopMode::Loop,
            sprite_sheet_id: "sheet".into(),
        });
        assert_eq!(lib.len(), 2);
        let list = lib.list();
        assert_eq!(list[0].id, "a");
        assert_eq!(list[1].id, "b");
        assert!(lib.remove("a").is_some());
        assert!(lib.get("a").is_none());
    }

    #[test]
    fn graph_library_crud_sorted() {
        let mut lib = AnimationGraphAssetLibrary::new();
        lib.insert(AnimationGraphAsset {
            id: "graph_b".into(),
            name: "B".into(),
            states: HashMap::new(),
            transitions: vec![],
            default_state: "idle".into(),
        });
        lib.insert(AnimationGraphAsset {
            id: "graph_a".into(),
            name: "A".into(),
            states: HashMap::new(),
            transitions: vec![],
            default_state: "idle".into(),
        });
        assert_eq!(lib.len(), 2);
        let list = lib.list();
        assert_eq!(list[0].id, "graph_a");
        assert_eq!(list[1].id, "graph_b");
        assert!(lib.remove("graph_a").is_some());
        assert!(lib.get("graph_a").is_none());
    }
}
