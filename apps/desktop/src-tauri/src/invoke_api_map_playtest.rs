use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::editor_service;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapCreatePayload {
    pub name: String,
    pub x: i32,
    pub y: i32,
    #[serde(rename = "prefabId", default)]
    pub prefab_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapRenamePayload {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapMovePayload {
    pub id: u64,
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapBatchMovePayload {
    pub moves: Vec<editor_service::MoveRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapSelectPayload {
    pub ids: Vec<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapDeletePayload {
    pub ids: Vec<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapTilePayload {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapPaintTilePayload {
    pub x: i32,
    pub y: i32,
    #[serde(rename = "tileId")]
    pub tile_id: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapPaintTilesPayload {
    pub points: Vec<editor_service::TilePointRequest>,
    #[serde(rename = "tileId")]
    pub tile_id: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapEraseTilesPayload {
    pub points: Vec<editor_service::TilePointRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapFillTilesPayload {
    pub x: i32,
    pub y: i32,
    #[serde(rename = "tileId")]
    pub tile_id: u16,
    #[serde(rename = "canvasCols")]
    pub canvas_cols: i32,
    #[serde(rename = "canvasRows")]
    pub canvas_rows: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSpritePayload {
    pub name: String,
    pub data_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaytestSpeedPayload {
    pub speed: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaytestTickPayload {
    #[serde(rename = "deltaMs")]
    pub delta_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaytestTracePayload {
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaytestBreakpointsPayload {
    pub kinds: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaytestKeyPayload {
    pub key: engine_core::KeyCode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicsConfigPayload {
    pub gravity: f32,
    pub friction: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraModePayload {
    pub mode: String,
}

pub fn try_dispatch(command: &str, payload: &Value) -> Result<Option<Value>> {
    let output = match command {
        "map_create" => {
            let payload: MapCreatePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::create_map_entity(payload.name, payload.x, payload.y, payload.prefab_id)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "import_sprite" => {
            let payload: ImportSpritePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::import_sprite(payload.name, payload.data_url).map_err(anyhow::Error::msg)?,
            )?
        }
        "map_rename" => {
            let payload: MapRenamePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::rename_map_entity(payload.id, payload.name).map_err(anyhow::Error::msg)?,
            )?
        }
        "map_move" => {
            let payload: MapMovePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::move_map_entity(payload.id, payload.x, payload.y).map_err(anyhow::Error::msg)?,
            )?
        }
        "map_batch_move" => {
            let payload: MapBatchMovePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::batch_move_map_entities(payload.moves).map_err(anyhow::Error::msg)?,
            )?
        }
        "map_undo" => serde_json::to_value(editor_service::undo_map().map_err(anyhow::Error::msg)?)?,
        "map_redo" => serde_json::to_value(editor_service::redo_map().map_err(anyhow::Error::msg)?)?,
        "map_reselect" => serde_json::to_value(editor_service::reselect_map_previous().map_err(anyhow::Error::msg)?)?,
        "map_select" => {
            let payload: MapSelectPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::select_map_entities(payload.ids).map_err(anyhow::Error::msg)?)?
        }
        "map_delete" => {
            let payload: MapDeletePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::delete_map_entities(payload.ids).map_err(anyhow::Error::msg)?)?
        }
        "map_reset" => serde_json::to_value(editor_service::reset_map().map_err(anyhow::Error::msg)?)?,
        "map_paint_tile" => {
            let payload: MapPaintTilePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::paint_map_tile(payload.x, payload.y, payload.tile_id).map_err(anyhow::Error::msg)?,
            )?
        }
        "map_paint_tiles" => {
            let payload: MapPaintTilesPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::paint_map_tiles(payload.points, payload.tile_id).map_err(anyhow::Error::msg)?,
            )?
        }
        "map_erase_tile" => {
            let payload: MapTilePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::erase_map_tile(payload.x, payload.y).map_err(anyhow::Error::msg)?)?
        }
        "map_erase_tiles" => {
            let payload: MapEraseTilesPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::erase_map_tiles(payload.points).map_err(anyhow::Error::msg)?)?
        }
        "map_fill_tiles" => {
            let payload: MapFillTilesPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::fill_map_tiles(
                    payload.x,
                    payload.y,
                    payload.tile_id,
                    payload.canvas_cols,
                    payload.canvas_rows,
                )
                .map_err(anyhow::Error::msg)?,
            )?
        }
        "playtest_enter" => serde_json::to_value(editor_service::enter_playtest().map_err(anyhow::Error::msg)?)?,
        "playtest_exit" => serde_json::to_value(editor_service::exit_playtest().map_err(anyhow::Error::msg)?)?,
        "playtest_toggle_pause" => serde_json::to_value(editor_service::toggle_playtest_pause().map_err(anyhow::Error::msg)?)?,
        "playtest_step" => serde_json::to_value(editor_service::step_playtest_frame().map_err(anyhow::Error::msg)?)?,
        "playtest_set_speed" => {
            let payload: PlaytestSpeedPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::set_playtest_speed(payload.speed).map_err(anyhow::Error::msg)?)?
        }
        "playtest_tick" => {
            let payload: PlaytestTickPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::tick_playtest(payload.delta_ms).map_err(anyhow::Error::msg)?)?
        }
        "playtest_set_trace" => {
            let payload: PlaytestTracePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::set_playtest_trace(payload.enabled).map_err(anyhow::Error::msg)?)?
        }
        "playtest_key_down" => {
            let payload: PlaytestKeyPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::playtest_key_down(payload.key).map_err(anyhow::Error::msg)?)?
        }
        "playtest_key_up" => {
            let payload: PlaytestKeyPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::playtest_key_up(payload.key).map_err(anyhow::Error::msg)?)?
        }
        "set_physics_config" => {
            let payload: PhysicsConfigPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::set_physics_config(payload.gravity, payload.friction).map_err(anyhow::Error::msg)?,
            )?
        }
        "set_camera_mode" => {
            let payload: CameraModePayload = serde_json::from_value(payload.clone())?;
            let mode: engine_core::CameraMode = serde_json::from_value(serde_json::Value::String(payload.mode))
                .map_err(|e| anyhow::anyhow!("{}", e))?;
            serde_json::to_value(editor_service::set_camera_mode(mode).map_err(anyhow::Error::msg)?)?
        }
        "playtest_set_breakpoints" => {
            let payload: PlaytestBreakpointsPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::set_playtest_breakpoints(payload.kinds).map_err(anyhow::Error::msg)?)?
        }
        _ => return Ok(None),
    };
    Ok(Some(output))
}
