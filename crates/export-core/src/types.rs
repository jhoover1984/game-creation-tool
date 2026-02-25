use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExportProfile {
    GameBoy,
    Nes,
    Snes,
}

impl ExportProfile {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::GameBoy => "game_boy",
            Self::Nes => "nes",
            Self::Snes => "snes",
        }
    }

    pub(crate) fn viewport(self) -> (u32, u32) {
        match self {
            Self::GameBoy => (160, 144),
            Self::Nes => (256, 240),
            Self::Snes => (256, 224),
        }
    }
}

impl Default for ExportProfile {
    fn default() -> Self {
        Self::GameBoy
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub debug: bool,
    #[serde(default)]
    pub profile: ExportProfile,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            debug: false,
            profile: ExportProfile::GameBoy,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportBundleReport {
    pub output_dir: String,
    pub files: Vec<String>,
    pub scene_count: usize,
    pub asset_count: usize,
    pub profile: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExportSceneOptions {
    pub width: u32,
    pub height: u32,
    #[serde(rename = "tilePx")]
    pub tile_px: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExportTile {
    pub x: i32,
    pub y: i32,
    pub tile_id: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExportPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExportEntity {
    pub id: u64,
    pub name: String,
    pub position: ExportPosition,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct ExportPlaytest {
    #[serde(default)]
    pub frame: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct ExportSceneSnapshot {
    #[serde(default)]
    pub tiles: Vec<ExportTile>,
    #[serde(default)]
    pub entities: Vec<ExportEntity>,
    #[serde(default)]
    pub entity_components: BTreeMap<String, Value>,
    #[serde(default)]
    pub playtest: ExportPlaytest,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExportPreviewScene {
    pub name: String,
    pub options: ExportSceneOptions,
    pub snapshot: ExportSceneSnapshot,
}
