use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::editor_service;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationAddClipPayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
    #[serde(rename = "clipName")]
    pub clip_name: String,
    pub clip: editor_service::AnimationClipDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationSetStatePayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
    #[serde(rename = "stateName")]
    pub state_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationSetTransitionsPayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
    pub transitions: Vec<editor_service::AnimationTransitionDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationBindGraphPayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
    #[serde(rename = "graphAssetId")]
    pub graph_asset_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationUnbindGraphPayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationGetBindingPayload {
    #[serde(rename = "entityId")]
    pub entity_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationSetBoolParamPayload {
    pub key: String,
    pub value: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationSetIntParamPayload {
    pub key: String,
    pub value: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationFireTriggerPayload {
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationAssetClipUpsertPayload {
    pub clip: engine_core::AnimationClipAsset,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationAssetGraphUpsertPayload {
    pub graph: engine_core::AnimationGraphAsset,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationAssetDeletePayload {
    pub id: String,
}

pub fn try_dispatch(command: &str, payload: &Value) -> Result<Option<Value>> {
    let output = match command {
        "animation_add_clip" => {
            let payload: AnimationAddClipPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_add_clip(payload.entity_id, payload.clip_name, payload.clip)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_set_state" => {
            let payload: AnimationSetStatePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_set_state(payload.entity_id, payload.state_name)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_set_transitions" => {
            let payload: AnimationSetTransitionsPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_set_transitions(payload.entity_id, payload.transitions)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_bind_graph" => {
            let payload: AnimationBindGraphPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_bind_graph(payload.entity_id, payload.graph_asset_id)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_unbind_graph" => {
            let payload: AnimationUnbindGraphPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_unbind_graph(payload.entity_id)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_get_binding" => {
            let payload: AnimationGetBindingPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_get_binding(payload.entity_id)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_set_bool_param" => {
            let payload: AnimationSetBoolParamPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_set_bool_param(payload.key, payload.value)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_set_int_param" => {
            let payload: AnimationSetIntParamPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_set_int_param(payload.key, payload.value)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_fire_trigger" => {
            let payload: AnimationFireTriggerPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_fire_trigger(payload.key)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_asset_list" => {
            serde_json::to_value(editor_service::animation_asset_list().map_err(anyhow::Error::msg)?)?
        }
        "animation_asset_clip_upsert" => {
            let payload: AnimationAssetClipUpsertPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_asset_clip_upsert(payload.clip)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_asset_clip_delete" => {
            let payload: AnimationAssetDeletePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_asset_clip_delete(payload.id)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_asset_graph_upsert" => {
            let payload: AnimationAssetGraphUpsertPayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_asset_graph_upsert(payload.graph)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        "animation_asset_graph_delete" => {
            let payload: AnimationAssetDeletePayload = serde_json::from_value(payload.clone())?;
            serde_json::to_value(
                editor_service::animation_asset_graph_delete(payload.id)
                    .map_err(anyhow::Error::msg)?,
            )?
        }
        _ => return Ok(None),
    };
    Ok(Some(output))
}
