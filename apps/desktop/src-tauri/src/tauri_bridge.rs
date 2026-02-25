use anyhow::Result;

use crate::command_gateway;

pub fn invoke_command_json(command: &str, payload_json: &str) -> Result<String> {
    command_gateway::execute_json(command, payload_json)
}

#[cfg(feature = "tauri-runtime")]
#[tauri::command]
pub fn invoke_command(command: String, payload_json: String) -> Result<String, String> {
    invoke_command_json(&command, &payload_json).map_err(|err| err.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invoke_command_json_supports_map_tile_edit_commands() {
        let _guard = crate::editor_service::test_lock();
        crate::editor_service::reset_runtime();

        let painted = invoke_command_json("map_paint_tile", r#"{"x":3,"y":4,"tileId":1}"#)
            .expect("paint tile");
        let painted_value: serde_json::Value =
            serde_json::from_str(&painted).expect("parse painted response");
        assert_eq!(painted_value["tiles"].as_array().expect("tiles").len(), 1);

        let erased = invoke_command_json("map_erase_tile", r#"{"x":3,"y":4}"#).expect("erase tile");
        let erased_value: serde_json::Value =
            serde_json::from_str(&erased).expect("parse erased response");
        assert_eq!(erased_value["tiles"].as_array().expect("tiles").len(), 0);
    }
}
