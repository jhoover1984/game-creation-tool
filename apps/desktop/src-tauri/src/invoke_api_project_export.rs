use std::path::Path;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{app_service, editor_service};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenProjectPayload {
    #[serde(rename = "projectDir")]
    pub project_dir: String,
    #[serde(rename = "applyMigrations", default)]
    pub apply_migrations: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveProjectPayload {
    #[serde(rename = "projectDir")]
    pub project_dir: String,
    #[serde(rename = "projectName")]
    pub project_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectDirPayload {
    #[serde(rename = "projectDir")]
    pub project_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPreviewPayload {
    #[serde(rename = "outputDir")]
    pub output_dir: String,
    #[serde(rename = "projectDir", default)]
    pub project_dir: Option<String>,
    #[serde(default)]
    pub debug: bool,
    #[serde(default)]
    pub profile: export_core::ExportProfile,
    #[serde(rename = "editorState", default)]
    pub editor_state: Option<Value>,
}

pub fn try_dispatch(command: &str, payload: &Value) -> Result<Option<Value>> {
    let output = match command {
        "open_project" => {
            let payload: OpenProjectPayload = serde_json::from_value(payload.clone())?;
            let response = app_service::open_project(
                Path::new(&payload.project_dir),
                payload.apply_migrations,
            )
            .with_context(|| format!("open_project failed for {}", payload.project_dir))?;
            // Load persisted editor state if available.
            let state_path = Path::new(&payload.project_dir).join("editor-state.json");
            if state_path.exists() {
                let loaded = std::fs::read_to_string(&state_path)
                    .ok()
                    .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok());
                match loaded {
                    Some(saved) => {
                        let name = saved
                            .get("projectName")
                            .or_else(|| saved.get("project_name"))
                            .and_then(|v| v.as_str())
                            .unwrap_or(&response.manifest.name)
                            .to_string();
                        let entities: Vec<(String, i32, i32, Option<engine_core::EntityComponents>)> = saved
                            .get("entities")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|e| {
                                        let n = e.get("name")?.as_str()?.to_string();
                                        let pos = e.get("position")?;
                                        let x = pos.get("x")?.as_i64()? as i32;
                                        let y = pos.get("y")?.as_i64()? as i32;
                                        let components = e.get("components").and_then(|v| {
                                            serde_json::from_value::<engine_core::EntityComponents>(
                                                v.clone(),
                                            )
                                            .ok()
                                        });
                                        Some((n, x, y, components))
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();
                        let tiles: Vec<(i32, i32, u16)> = saved
                            .get("tiles")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|t| {
                                        let x = t.get("x")?.as_i64()? as i32;
                                        let y = t.get("y")?.as_i64()? as i32;
                                        let tid = t.get("tile_id")?.as_u64()? as u16;
                                        Some((x, y, tid))
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();
                        let prefabs: Vec<(String, String, engine_core::EntityComponents)> = saved
                            .get("prefabs")
                            .and_then(|v| v.get("prefabs"))
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|p| {
                                        let id = p.get("id")?.as_str()?.to_string();
                                        let prefab_name = p.get("name")?.as_str()?.to_string();
                                        let default_components = p
                                            .get("default_components")
                                            .cloned()
                                            .unwrap_or_else(|| serde_json::json!({}));
                                        let parsed_components = serde_json::from_value::<
                                            engine_core::EntityComponents,
                                        >(default_components)
                                        .ok()?;
                                        Some((id, prefab_name, parsed_components))
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();
                        let animation_clip_assets: Vec<engine_core::AnimationClipAsset> = saved
                            .get("animation_assets")
                            .and_then(|v| v.get("clips"))
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| {
                                        serde_json::from_value::<engine_core::AnimationClipAsset>(
                                            v.clone(),
                                        )
                                        .ok()
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();
                        let animation_graph_assets: Vec<engine_core::AnimationGraphAsset> = saved
                            .get("animation_assets")
                            .and_then(|v| v.get("graphs"))
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| {
                                        serde_json::from_value::<engine_core::AnimationGraphAsset>(
                                            v.clone(),
                                        )
                                        .ok()
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();
                        let _ = editor_service::load_authored_state(
                            name,
                            entities,
                            tiles,
                            prefabs,
                            animation_clip_assets,
                            animation_graph_assets,
                        );
                        // Restore entity script graphs if present.
                        if let Some(graph_map) =
                            saved.get("entity_graphs").and_then(|v| v.as_object())
                        {
                            for (id_str, graph_val) in graph_map {
                                if let Ok(entity_id) = id_str.parse::<engine_core::EntityId>() {
                                    if let Ok(graph) = serde_json::from_value::<script_core::ScriptGraph>(
                                        graph_val.clone(),
                                    ) {
                                        let _ = editor_service::attach_entity_graph(entity_id, graph);
                                    }
                                }
                            }
                        }
                    }
                    None => {
                        // File exists but is unreadable or corrupt, reset to clean state.
                        let _ = editor_service::load_authored_state(
                            response.manifest.name.clone(),
                            vec![],
                            vec![],
                            vec![],
                            vec![],
                            vec![],
                        );
                    }
                }
            } else {
                // No persisted state; just set the project name from manifest.
                editor_service::set_project_name(response.manifest.name.clone());
            }
            serde_json::to_value(response)?
        }
        "save_project" => {
            let payload: SaveProjectPayload = serde_json::from_value(payload.clone())?;
            let name = payload.project_name.clone();
            let manifest = project_core::ProjectManifest::new(payload.project_name);
            let response = app_service::save_project(Path::new(&payload.project_dir), &manifest)
                .with_context(|| format!("save_project failed for {}", payload.project_dir))?;
            editor_service::set_project_name(name);
            // Persist editor state alongside manifest.
            let editor_state = editor_service::serialize_editor_state().map_err(anyhow::Error::msg)?;
            let state_path = Path::new(&payload.project_dir).join("editor-state.json");
            let state_json = serde_json::to_string_pretty(&editor_state)?;
            std::fs::write(&state_path, state_json).with_context(|| {
                format!(
                    "failed to write editor-state.json to {}",
                    state_path.display()
                )
            })?;
            serde_json::to_value(response)?
        }
        "project_health" => {
            let payload: ProjectDirPayload = serde_json::from_value(payload.clone())?;
            let response = app_service::get_project_health(Path::new(&payload.project_dir))
                .with_context(|| format!("project_health failed for {}", payload.project_dir))?;
            serde_json::to_value(response)?
        }
        "migrate_project" => {
            let payload: ProjectDirPayload = serde_json::from_value(payload.clone())?;
            let response = app_service::migrate_project(Path::new(&payload.project_dir))
                .with_context(|| format!("migrate_project failed for {}", payload.project_dir))?;
            serde_json::to_value(response)?
        }
        "editor_state" => serde_json::to_value(editor_service::get_editor_state().map_err(anyhow::Error::msg)?)?,
        "export_preview_html5" => {
            let payload: ExportPreviewPayload = serde_json::from_value(payload.clone())?;
            let authored_state = if let Some(editor_state) = payload.editor_state {
                editor_state
            } else {
                let editor_state = editor_service::get_editor_state().map_err(anyhow::Error::msg)?;
                serde_json::to_value(editor_state)?
            };
            let authored_scene = export_core::build_authored_preview_scene(payload.profile, &authored_state);
            let report = export_core::build_html5_preview_artifact_with_scenes_assets_and_state(
                Path::new(&payload.output_dir),
                &export_core::ExportOptions {
                    debug: payload.debug,
                    profile: payload.profile,
                },
                vec![authored_scene],
                true,
                Some(&authored_state),
                payload.project_dir.as_deref().map(Path::new),
            )
            .with_context(|| format!("export_preview_html5 failed for {}", payload.output_dir))?;
            serde_json::to_value(report)?
        }
        _ => return Ok(None),
    };
    Ok(Some(output))
}
