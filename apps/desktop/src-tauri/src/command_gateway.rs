use anyhow::{Context, Result};
use serde_json::Value;

use crate::invoke_api;

pub fn execute(command: &str, payload: Value) -> Result<Value> {
    invoke_api::dispatch(command, payload)
        .with_context(|| format!("command dispatch failed for '{command}'"))
}

pub fn execute_json(command: &str, payload_json: &str) -> Result<String> {
    let payload: Value = serde_json::from_str(payload_json).context("invalid JSON payload")?;
    let value = execute(command, payload)?;
    serde_json::to_string_pretty(&value).context("failed to serialize command output")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn execute_json_create_and_select_roundtrip() {
        let _guard = crate::editor_service::test_lock();
        crate::editor_service::reset_runtime();

        let created_json = execute_json("map_create", r#"{"name":"Player","x":3,"y":4}"#)
            .expect("create map entity");
        let created: serde_json::Value =
            serde_json::from_str(&created_json).expect("parse create response");
        let id = created["entities"][0]["id"]
            .as_u64()
            .expect("entity id from response");

        let selected_json =
            execute_json("map_select", &format!(r#"{{"ids":[{}]}}"#, id)).expect("select entity");
        let selected: serde_json::Value =
            serde_json::from_str(&selected_json).expect("parse select response");
        assert_eq!(selected["selection"][0].as_u64().expect("selection id"), id);
    }
}
