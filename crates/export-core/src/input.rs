use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Clone, Deserialize, Default)]
pub(crate) struct InputEditorState {
    #[serde(default)]
    pub entities: Vec<InputEntity>,
    #[serde(default)]
    pub tiles: Vec<InputTile>,
    #[serde(default, alias = "audioClips", alias = "audio_clips")]
    pub audio: Vec<InputAudioClip>,
    #[serde(default, alias = "audioBindings", alias = "audio_bindings")]
    pub audio_bindings: BTreeMap<String, String>,
    #[serde(default, alias = "audioEvents", alias = "audio_events")]
    pub audio_events: Vec<InputAudioEventBinding>,
    #[serde(default)]
    pub playtest: InputPlaytest,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub(crate) struct InputEntity {
    #[serde(default)]
    pub id: u64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub position: InputPosition,
    #[serde(
        default,
        alias = "assetPath",
        alias = "spritePath",
        alias = "sprite_path"
    )]
    pub asset_path: Option<String>,
    #[serde(default)]
    pub components: Value,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub(crate) struct InputTile {
    #[serde(default)]
    pub x: i32,
    #[serde(default)]
    pub y: i32,
    #[serde(default)]
    pub tile_id: u16,
    #[serde(default, alias = "assetPath")]
    pub asset_path: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub(crate) struct InputAudioClip {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(
        default,
        alias = "assetPath",
        alias = "audioPath",
        alias = "audio_path"
    )]
    pub asset_path: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub(crate) struct InputAudioEventBinding {
    #[serde(default)]
    pub event: String,
    #[serde(default, alias = "audioId", alias = "audio_id")]
    pub audio_id: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub(crate) struct InputPosition {
    #[serde(default)]
    pub x: i32,
    #[serde(default)]
    pub y: i32,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub(crate) struct InputPlaytest {
    #[serde(default)]
    pub frame: u64,
}
