use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::editor_service;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptValidatePayload {
    pub graph: script_core::ScriptGraph,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptLoadGraphPayload {
    pub graph: script_core::ScriptGraph,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptFireEventPayload {
    pub event: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneAddPayload {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneIdPayload {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneAddSpawnPointPayload {
    #[serde(rename = "sceneId")]
    pub scene_id: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
}

pub fn try_dispatch(command: &str, payload: &Value) -> Result<Option<Value>> {
    let output = match command {
        "scene_add" => {
            let payload: SceneAddPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::add_scene(payload.id, payload.name).map_err(anyhow::Error::msg)?,
            )?
        }
        "scene_remove" => {
            let payload: SceneIdPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::remove_scene(&payload.id).map_err(anyhow::Error::msg)?,
            )?
        }
        "scene_set_active" => {
            let payload: SceneIdPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::set_active_scene(&payload.id).map_err(anyhow::Error::msg)?,
            )?
        }
        "scene_list" => serde_json::to_value(editor_service::list_scenes().map_err(anyhow::Error::msg)?)?,
        "scene_add_spawn_point" => {
            let payload: SceneAddSpawnPointPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::add_spawn_point(&payload.scene_id, payload.name, payload.x, payload.y)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "script_validate" => {
            let payload: ScriptValidatePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(payload.graph.validate())?
        }
        "script_load_graph" => {
            let payload: ScriptLoadGraphPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::load_script_graph(&payload.graph).map_err(anyhow::Error::msg)?,
            )?
        }
        "script_unload_graph" => {
            serde_json::to_value(editor_service::unload_script_graph().map_err(anyhow::Error::msg)?)?
        }
        "script_fire_event" => {
            let payload: ScriptFireEventPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::fire_script_event(&payload.event).map_err(anyhow::Error::msg)?,
            )?
        }
        _ => return Ok(None),
    };
    Ok(Some(output))
}
