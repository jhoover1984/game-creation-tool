use anyhow::Result;
use serde_json::Value;

use crate::{
    invoke_api_animation, invoke_api_entities, invoke_api_map_playtest, invoke_api_project_export,
    invoke_api_scene_script,
};

pub fn dispatch(command: &str, payload: Value) -> Result<Value> {
    if let Some(result) = invoke_api_project_export::try_dispatch(command, &payload)? {
        return Ok(result);
    }
    if let Some(result) = invoke_api_animation::try_dispatch(command, &payload)? {
        return Ok(result);
    }
    if let Some(result) = invoke_api_entities::try_dispatch(command, &payload)? {
        return Ok(result);
    }
    if let Some(result) = invoke_api_map_playtest::try_dispatch(command, &payload)? {
        return Ok(result);
    }
    if let Some(result) = invoke_api_scene_script::try_dispatch(command, &payload)? {
        return Ok(result);
    }

    anyhow::bail!("unknown invoke command: {command}")
}

