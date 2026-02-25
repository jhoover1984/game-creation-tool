use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::editor_service;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityAttachGraphPayload {
    pub entity_id: engine_core::EntityId,
    pub graph: script_core::ScriptGraph,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityIdOnlyPayload {
    pub entity_id: engine_core::EntityId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityIdPayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySetComponentsPayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
    pub components: engine_core::EntityComponents,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefabCreatePayload {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub default_components: engine_core::EntityComponents,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefabUpdatePayload {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub default_components: Option<engine_core::EntityComponents>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefabIdPayload {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefabStampPayload {
    #[serde(rename = "prefabId")]
    pub prefab_id: String,
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnEntityPayload {
    #[serde(rename = "prefabId")]
    pub prefab_id: String,
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DespawnEntityPayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
}

pub fn try_dispatch(command: &str, payload: &Value) -> Result<Option<Value>> {
    let output = match command {
        "entity_get_components" => {
            let payload: EntityIdPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::get_entity_components(payload.entity_id).map_err(anyhow::Error::msg)?,
            )?
        }
        "entity_set_components" => {
            let payload: EntitySetComponentsPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::set_entity_components(payload.entity_id, payload.components)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "entity_attach_graph" => {
            let payload: EntityAttachGraphPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::attach_entity_graph(payload.entity_id, payload.graph)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "entity_detach_graph" => {
            let payload: EntityIdOnlyPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::detach_entity_graph(payload.entity_id).map_err(anyhow::Error::msg)?,
            )?
        }
        "entity_get_graph" => {
            let payload: EntityIdOnlyPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::get_entity_graph(payload.entity_id).map_err(anyhow::Error::msg)?,
            )?
        }
        "entity_get_states" => serde_json::to_value(editor_service::get_entity_states().map_err(anyhow::Error::msg)?)?,
        "prefab_create" => {
            let payload: PrefabCreatePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::prefab_create(payload.id, payload.name, payload.default_components)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "prefab_update" => {
            let payload: PrefabUpdatePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::prefab_update(payload.id, payload.name, payload.default_components)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "prefab_list" => serde_json::to_value(editor_service::prefab_list().map_err(anyhow::Error::msg)?)?,
        "prefab_delete" => {
            let payload: PrefabIdPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(editor_service::prefab_delete(payload.id).map_err(anyhow::Error::msg)?)?
        }
        "prefab_stamp" => {
            let payload: PrefabStampPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::create_entity_from_prefab(payload.prefab_id, payload.x, payload.y)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "spawn_entity" => {
            let payload: SpawnEntityPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::spawn_entity(payload.prefab_id, payload.x, payload.y)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "despawn_entity" => {
            let payload: DespawnEntityPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::despawn_entity(payload.entity_id).map_err(anyhow::Error::msg)?,
            )?
        }
        _ => return Ok(None),
    };
    Ok(Some(output))
}
