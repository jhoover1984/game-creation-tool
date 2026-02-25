use gcs_math::Vec2;
use serde::{Deserialize, Serialize};

/// Top-level project state. This is the root of the document model.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub version: String,
    pub resolution: (u32, u32),
    #[serde(alias = "tile_size")]
    pub tile_size: u32,
    #[serde(alias = "created_at")]
    pub created_at: String,
    #[serde(alias = "updated_at")]
    pub updated_at: String,
    #[serde(alias = "tile_layers")]
    pub tile_layers: Vec<TileLayer>,
    pub entities: Vec<Entity>,
}

/// A tile layer in the map.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TileLayer {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    #[serde(alias = "tile_size")]
    pub tile_size: u32,
    /// Flat row-major tile IDs. 0 = empty.
    pub data: Vec<u32>,
}

/// An entity in the game world.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entity {
    pub id: String,
    pub name: String,
    pub position: Vec2,
    pub size: Vec2,
    pub solid: bool,
    #[serde(alias = "sprite_id", default, skip_serializing_if = "Option::is_none")]
    pub sprite_id: Option<String>,
    #[serde(alias = "animation_clip_id", default, skip_serializing_if = "Option::is_none")]
    pub animation_clip_id: Option<String>,
    pub tags: Vec<String>,
}

impl Project {
    pub fn new(name: &str, width: u32, height: u32, tile_size: u32) -> Self {
        let layer = TileLayer {
            id: "layer-0".into(),
            name: "Ground".into(),
            width,
            height,
            tile_size,
            data: vec![0; (width * height) as usize],
        };
        let now = timestamp_now();
        Self {
            id: format!("proj-{}", fastrand_id()),
            name: name.into(),
            version: "0.1.0".into(),
            resolution: (width * tile_size, height * tile_size),
            tile_size,
            created_at: now.clone(),
            updated_at: now,
            tile_layers: vec![layer],
            entities: Vec::new(),
        }
    }

    /// Serialize to JSON string.
    pub fn save_to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Deserialize from JSON string.
    pub fn load_from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

impl TileLayer {
    /// Get tile ID at grid position. Returns None if out of bounds.
    pub fn get_tile(&self, x: u32, y: u32) -> Option<u32> {
        if x >= self.width || y >= self.height {
            return None;
        }
        Some(self.data[(y * self.width + x) as usize])
    }

    /// Set tile ID at grid position. Returns false if out of bounds.
    pub fn set_tile(&mut self, x: u32, y: u32, tile_id: u32) -> bool {
        if x >= self.width || y >= self.height {
            return false;
        }
        self.data[(y * self.width + x) as usize] = tile_id;
        true
    }
}

/// Simple pseudo-random ID (no uuid dependency needed for now).
fn fastrand_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", t)
}

/// ISO 8601 timestamp string (simplified, no timezone lib needed).
fn timestamp_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Approximate ISO format from epoch seconds
    format!("{secs}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_project() {
        let proj = Project::new("Test", 20, 15, 16);
        assert_eq!(proj.name, "Test");
        assert_eq!(proj.resolution, (320, 240));
        assert_eq!(proj.tile_layers.len(), 1);
        assert_eq!(proj.tile_layers[0].data.len(), 300);
    }

    #[test]
    fn tile_paint_erase() {
        let mut proj = Project::new("Test", 10, 10, 16);
        let layer = &mut proj.tile_layers[0];

        assert_eq!(layer.get_tile(0, 0), Some(0));
        assert!(layer.set_tile(3, 4, 5));
        assert_eq!(layer.get_tile(3, 4), Some(5));

        // Erase = set to 0
        assert!(layer.set_tile(3, 4, 0));
        assert_eq!(layer.get_tile(3, 4), Some(0));

        // Out of bounds
        assert!(!layer.set_tile(100, 100, 1));
        assert_eq!(layer.get_tile(100, 100), None);
    }

    #[test]
    fn save_load_roundtrip() {
        let mut proj = Project::new("Roundtrip", 5, 5, 16);
        proj.tile_layers[0].set_tile(2, 3, 7);
        proj.entities.push(Entity {
            id: "ent-1".into(),
            name: "Player".into(),
            position: Vec2::new(32.0, 48.0),
            size: Vec2::new(16.0, 16.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec!["player".into()],
        });

        let json = proj.save_to_json().unwrap();
        assert!(json.contains("\"tileSize\""));
        assert!(json.contains("\"createdAt\""));
        assert!(json.contains("\"updatedAt\""));
        assert!(!json.contains("tile_size"));
        let loaded = Project::load_from_json(&json).unwrap();

        assert_eq!(loaded.name, "Roundtrip");
        assert_eq!(loaded.tile_layers[0].get_tile(2, 3), Some(7));
        assert_eq!(loaded.entities.len(), 1);
        assert_eq!(loaded.entities[0].name, "Player");
    }
}

