mod assets;
mod input;
mod scenes;
mod types;

use std::fs;
use std::path::Path;
use std::collections::BTreeMap;

use anyhow::{Context, Result};
use serde_json::json;

use assets::{
    collect_authored_asset_hints, collect_authored_audio_bindings, collect_project_asset_hints,
    infer_assets_from_scenes_and_hints, merge_authored_asset_hints, write_inferred_asset_files,
};
use input::InputEditorState;
use scenes::default_preview_scenes;

pub use types::{
    ExportBundleReport, ExportEntity, ExportOptions, ExportPlaytest, ExportPosition,
    ExportPreviewScene, ExportProfile, ExportSceneOptions, ExportSceneSnapshot, ExportTile,
};

const RUNTIME_TEMPLATE: &str = include_str!("../templates/runtime.js");
const INDEX_TEMPLATE: &str = include_str!("../templates/index.html");

// ── Public API ───────────────────────────────────────────────────────

pub fn build_html5_preview_artifact(
    output_dir: &Path,
    options: &ExportOptions,
) -> Result<ExportBundleReport> {
    build_html5_preview_artifact_with_scenes_assets_and_state(
        output_dir,
        options,
        default_preview_scenes(options.profile),
        false,
        None,
        None,
    )
}

pub fn build_html5_preview_artifact_with_scenes(
    output_dir: &Path,
    options: &ExportOptions,
    scenes: Vec<ExportPreviewScene>,
) -> Result<ExportBundleReport> {
    build_html5_preview_artifact_with_scenes_assets_and_state(
        output_dir, options, scenes, false, None, None,
    )
}

pub fn build_html5_preview_artifact_with_scenes_and_assets(
    output_dir: &Path,
    options: &ExportOptions,
    scenes: Vec<ExportPreviewScene>,
    infer_assets: bool,
) -> Result<ExportBundleReport> {
    build_html5_preview_artifact_with_scenes_assets_and_state(
        output_dir,
        options,
        scenes,
        infer_assets,
        None,
        None,
    )
}

pub fn build_html5_preview_artifact_with_scenes_assets_and_state(
    output_dir: &Path,
    options: &ExportOptions,
    mut scenes: Vec<ExportPreviewScene>,
    infer_assets: bool,
    authored_state: Option<&serde_json::Value>,
    project_dir: Option<&Path>,
) -> Result<ExportBundleReport> {
    fs::create_dir_all(output_dir)
        .with_context(|| format!("failed creating export output dir {}", output_dir.display()))?;

    if scenes.is_empty() {
        scenes = default_preview_scenes(options.profile);
    }
    let state_hints = authored_state.map(|state| collect_authored_asset_hints(state, project_dir));
    let project_hints = project_dir.map(|dir| {
        collect_project_asset_hints(dir, &scenes, state_hints.as_ref().map(|h| &h.audio_ids))
    });
    let hints = merge_authored_asset_hints(project_hints.as_ref(), state_hints.as_ref());
    let assets = if infer_assets {
        infer_assets_from_scenes_and_hints(&scenes, Some(&hints))
    } else {
        Vec::new()
    };
    let authored_audio_bindings = authored_state
        .map(collect_authored_audio_bindings)
        .unwrap_or_default();
    let mode = if options.debug { "debug" } else { "release" };
    let metadata = json!({
      "schema_version": 1,
      "profile": options.profile.as_str(),
      "mode": mode,
      "scene_count": scenes.len(),
      "audio_bindings": authored_audio_bindings,
    });
    let bundle = json!({
      "schema_version": 1,
      "kind": "html5_profile_preview",
      "profile": options.profile.as_str(),
      "mode": mode,
      "entrypoint": "index.html",
      "runtime": "runtime.js",
      "scenes": "scenes.json",
      "metadata": "metadata.json",
      "assets": "assets/manifest.json",
    });
    let assets_manifest = json!({
      "schema_version": 1,
      "generated_by": "gcs-export-core",
      "profile": options.profile.as_str(),
      "asset_count": assets.len(),
      "assets": assets
        .iter()
        .map(|asset| serde_json::to_value(&asset.record).unwrap_or_else(|_| json!({})))
        .collect::<Vec<_>>(),
    });
    let scenes_path = output_dir.join("scenes.json");
    let metadata_path = output_dir.join("metadata.json");
    let bundle_path = output_dir.join("bundle.json");
    let assets_dir = output_dir.join("assets");
    let assets_manifest_path = assets_dir.join("manifest.json");
    let runtime_path = output_dir.join("runtime.js");
    let html_path = output_dir.join("index.html");

    let scenes_json = serde_json::to_string_pretty(&scenes)
        .context("failed serializing export preview scenes")?;
    let metadata_json = serde_json::to_string_pretty(&metadata)
        .context("failed serializing export preview metadata")?;
    let bundle_json = serde_json::to_string_pretty(&bundle)
        .context("failed serializing export bundle manifest")?;
    let assets_manifest_json = serde_json::to_string_pretty(&assets_manifest)
        .context("failed serializing export assets manifest")?;
    fs::create_dir_all(&assets_dir)
        .with_context(|| format!("failed creating export assets dir {}", assets_dir.display()))?;
    if infer_assets {
        write_inferred_asset_files(output_dir, &assets)
            .context("failed writing inferred export asset files")?;
    }
    write_utf8(&scenes_path, &scenes_json)?;
    write_utf8(&metadata_path, &metadata_json)?;
    write_utf8(&bundle_path, &bundle_json)?;
    write_utf8(&assets_manifest_path, &assets_manifest_json)?;
    write_utf8(&runtime_path, &runtime_source(options.debug))?;
    write_utf8(&html_path, &index_html(options.debug, options.profile))?;

    Ok(ExportBundleReport {
        output_dir: output_dir.display().to_string(),
        files: vec![
            "index.html".to_string(),
            "runtime.js".to_string(),
            "scenes.json".to_string(),
            "metadata.json".to_string(),
            "bundle.json".to_string(),
            "assets/manifest.json".to_string(),
        ],
        scene_count: scenes.len(),
        asset_count: assets_manifest["assets"].as_array().map_or(0, Vec::len),
        profile: options.profile.as_str().to_string(),
        mode: mode.to_string(),
    })
}

pub fn build_authored_preview_scene(
    profile: ExportProfile,
    editor_state: &serde_json::Value,
) -> ExportPreviewScene {
    let (width, height) = profile.viewport();
    let parsed: InputEditorState = serde_json::from_value(editor_state.clone()).unwrap_or_default();
    let mut entity_components = BTreeMap::new();
    let entities = parsed
        .entities
        .into_iter()
        .map(|entity| {
            let name = if entity.name.trim().is_empty() {
                format!("Entity {}", entity.id)
            } else {
                entity.name
            };
            entity_components.insert(entity.id.to_string(), entity.components.clone());
            ExportEntity {
                id: entity.id,
                name,
                position: ExportPosition {
                    x: entity.position.x,
                    y: entity.position.y,
                },
            }
        })
        .collect::<Vec<_>>();
    let tiles = parsed
        .tiles
        .into_iter()
        .map(|tile| ExportTile {
            x: tile.x,
            y: tile.y,
            tile_id: tile.tile_id,
        })
        .collect::<Vec<_>>();
    ExportPreviewScene {
        name: "authored_map_preview".to_string(),
        options: ExportSceneOptions {
            width,
            height,
            tile_px: 8,
        },
        snapshot: ExportSceneSnapshot {
            tiles,
            entities,
            entity_components,
            playtest: ExportPlaytest {
                frame: parsed.playtest.frame,
            },
        },
    }
}

// ── Internal helpers ─────────────────────────────────────────────────

fn write_utf8(path: &Path, contents: &str) -> Result<()> {
    fs::write(path, contents).with_context(|| format!("failed writing {}", path.display()))
}

fn runtime_source(debug: bool) -> String {
    let mut runtime = RUNTIME_TEMPLATE.to_string();
    let debug_comment = if debug { "// debug export build\n" } else { "" };
    runtime = runtime.replace("__GCS_DEBUG_COMMENT__", debug_comment);
    runtime
}

fn index_html(debug: bool, profile: ExportProfile) -> String {
    let mode_label = if debug { "Debug" } else { "Release" };
    let profile_label = profile.as_str();
    let html = INDEX_TEMPLATE.replace("__GCS_MODE_LABEL__", mode_label);
    html.replace("__GCS_PROFILE_LABEL__", profile_label)
}

// ── Tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_dir(name: &str) -> PathBuf {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        std::env::temp_dir().join(format!("gcs-export-core-{name}-{ts}"))
    }

    #[test]
    fn builds_html5_preview_export_bundle() {
        let output_dir = unique_temp_dir("bundle");
        let report = build_html5_preview_artifact(&output_dir, &ExportOptions::default())
            .expect("build export artifact");

        assert_eq!(report.files.len(), 6);
        assert!(report.scene_count >= 2);
        assert_eq!(report.asset_count, 0);
        assert_eq!(report.profile, "game_boy");
        assert_eq!(report.mode, "release");
        assert!(output_dir.join("index.html").exists());
        assert!(output_dir.join("runtime.js").exists());
        assert!(output_dir.join("scenes.json").exists());
        assert!(output_dir.join("metadata.json").exists());
        assert!(output_dir.join("bundle.json").exists());
        assert!(output_dir.join("assets/manifest.json").exists());

        let runtime = fs::read_to_string(output_dir.join("runtime.js")).expect("read runtime");
        assert!(runtime.contains("window.__exportPreview"));
        assert!(runtime.contains("fetch(\"./scenes.json\""));
        assert!(runtime.contains("fetch(\"./assets/manifest.json\""));
        assert!(runtime.contains("movePrimaryEntity"));
        assert!(runtime.contains("getLoadedAssetCount"));
        assert!(runtime.contains("getLoadedAudioCount"));
        assert!(runtime.contains("playAudioById"));
        assert!(runtime.contains("stopAudioById"));
        assert!(runtime.contains("getAudioPlaybackEventCount"));
        assert!(runtime.contains("triggerGameplayEventAudio"));
        assert!(runtime.contains("getAudioBindings"));
        assert!(runtime.contains("window.addEventListener(\"keydown\""));

        let scenes: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("scenes.json")).expect("read scenes"),
        )
        .expect("parse scenes json");
        assert!(scenes.as_array().expect("scenes array").len() >= 2);
        let metadata: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("metadata.json")).expect("read metadata"),
        )
        .expect("parse metadata json");
        assert_eq!(metadata["profile"], "game_boy");
        assert_eq!(metadata["mode"], "release");
        let bundle: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("bundle.json")).expect("read bundle"),
        )
        .expect("parse bundle json");
        assert_eq!(bundle["kind"], "html5_profile_preview");
        assert_eq!(bundle["entrypoint"], "index.html");
        assert_eq!(bundle["profile"], "game_boy");
        assert_eq!(bundle["assets"], "assets/manifest.json");
        let assets_manifest: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest json");
        assert_eq!(assets_manifest["schema_version"], 1);
        assert_eq!(assets_manifest["asset_count"], 0);

        let _ = fs::remove_dir_all(output_dir);
    }

    #[test]
    fn debug_mode_marks_runtime_and_html() {
        let output_dir = unique_temp_dir("debug");
        let report = build_html5_preview_artifact(
            &output_dir,
            &ExportOptions {
                debug: true,
                profile: ExportProfile::Nes,
            },
        )
        .expect("build debug export artifact");
        assert!(report.scene_count >= 6);
        assert_eq!(report.asset_count, 0);
        assert_eq!(report.profile, "nes");
        assert_eq!(report.mode, "debug");

        let runtime = fs::read_to_string(output_dir.join("runtime.js")).expect("read runtime");
        let html = fs::read_to_string(output_dir.join("index.html")).expect("read html");
        let metadata = fs::read_to_string(output_dir.join("metadata.json")).expect("read metadata");
        let bundle = fs::read_to_string(output_dir.join("bundle.json")).expect("read bundle");
        assert!(runtime.contains("// debug export build"));
        assert!(html.contains("Mode: Debug"));
        assert!(html.contains("Profile: nes"));
        assert!(metadata.contains("\"profile\": \"nes\""));
        assert!(metadata.contains("\"mode\": \"debug\""));
        assert!(bundle.contains("\"kind\": \"html5_profile_preview\""));
        assert!(bundle.contains("\"profile\": \"nes\""));

        let _ = fs::remove_dir_all(output_dir);
    }

    #[test]
    fn authored_scene_builder_preserves_tiles_entities_and_frame() {
        let output_dir = unique_temp_dir("authored");
        let editor_state = json!({
            "entities": [
                {
                    "id": 7,
                    "name": "Player",
                    "position": { "x": 24, "y": 32 },
                    "components": {
                        "collision": {
                            "offset_x": 0,
                            "offset_y": 0,
                            "width": 8,
                            "height": 8,
                            "solid": true
                        }
                    }
                }
            ],
            "tiles": [
                { "x": 1, "y": 2, "tile_id": 1 },
                { "x": 2, "y": 2, "tile_id": 1 }
            ],
            "playtest": { "frame": 42 }
        });
        let authored = build_authored_preview_scene(ExportProfile::GameBoy, &editor_state);
        let report = build_html5_preview_artifact_with_scenes(
            &output_dir,
            &ExportOptions::default(),
            vec![authored],
        )
        .expect("build authored export artifact");

        assert_eq!(report.scene_count, 1);
        let scenes: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("scenes.json")).expect("read authored scenes"),
        )
        .expect("parse authored scenes");
        assert_eq!(scenes[0]["name"], "authored_map_preview");
        assert_eq!(
            scenes[0]["snapshot"]["tiles"]
                .as_array()
                .expect("tiles")
                .len(),
            2
        );
        assert_eq!(
            scenes[0]["snapshot"]["entities"]
                .as_array()
                .expect("entities")
                .len(),
            1
        );
        assert_eq!(
            scenes[0]["snapshot"]["entity_components"]["7"]["collision"]["width"],
            8
        );
        assert_eq!(scenes[0]["snapshot"]["playtest"]["frame"], 42);

        let _ = fs::remove_dir_all(output_dir);
    }

    #[test]
    fn inferred_assets_are_emitted_for_authored_export() {
        let output_dir = unique_temp_dir("assets");
        let editor_state = json!({
            "entities": [
                { "id": 1, "name": "Player", "position": { "x": 16, "y": 16 } },
                { "id": 2, "name": "Chest Prop (GB)", "position": { "x": 48, "y": 16 } }
            ],
            "tiles": [
                { "x": 1, "y": 2, "tile_id": 1 },
                { "x": 2, "y": 2, "tile_id": 2 }
            ],
            "playtest": { "frame": 9 }
        });
        let authored = build_authored_preview_scene(ExportProfile::GameBoy, &editor_state);
        let report = build_html5_preview_artifact_with_scenes_and_assets(
            &output_dir,
            &ExportOptions::default(),
            vec![authored],
            true,
        )
        .expect("build authored export with inferred assets");

        assert!(report.asset_count >= 4);
        let assets_manifest: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        assert_eq!(assets_manifest["asset_count"], report.asset_count as u64);
        assert!(assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .any(|asset| asset["id"] == "tile_1"));
        assert!(assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .any(|asset| asset["id"] == "entity_player"));
        assert!(assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .all(|asset| asset["path"]
                .as_str()
                .is_some_and(|path| path.ends_with(".svg"))));
        let assets = assets_manifest["assets"].as_array().expect("assets array");
        let tile_1 = assets
            .iter()
            .find(|asset| asset["id"] == "tile_1")
            .expect("tile_1 asset");
        let entity_player = assets
            .iter()
            .find(|asset| asset["id"] == "entity_player")
            .expect("entity_player asset");
        assert_eq!(
            tile_1["source"].as_str().unwrap_or_default(),
            "starter_pack://tiles/1"
        );
        assert_eq!(
            entity_player["source"].as_str().unwrap_or_default(),
            "starter_pack://entities/player"
        );
        assert!(tile_1["path"]
            .as_str()
            .is_some_and(|path| path.starts_with("assets/starter/")));
        assert!(entity_player["path"]
            .as_str()
            .is_some_and(|path| path.starts_with("assets/starter/")));
        assert!(output_dir.join("assets/starter/tile_1.svg").exists());
        assert!(output_dir.join("assets/starter/entity_player.svg").exists());

        let _ = fs::remove_dir_all(output_dir);
    }

    #[test]
    fn authored_asset_paths_are_copied_into_export_when_present() {
        let output_dir = unique_temp_dir("asset-copy");
        let project_dir = unique_temp_dir("asset-copy-project");
        fs::create_dir_all(&project_dir).expect("create project dir");
        let player_png = project_dir.join("player.png");
        let tile_png = project_dir.join("tile1.png");
        fs::write(&player_png, b"png-player").expect("write player asset");
        fs::write(&tile_png, b"png-tile").expect("write tile asset");

        let editor_state = json!({
            "entities": [
                { "id": 1, "name": "Player", "position": { "x": 16, "y": 16 }, "assetPath": player_png.display().to_string() }
            ],
            "tiles": [
                { "x": 1, "y": 2, "tile_id": 1, "assetPath": tile_png.display().to_string() }
            ],
            "playtest": { "frame": 12 }
        });

        let authored = build_authored_preview_scene(ExportProfile::GameBoy, &editor_state);
        let report = build_html5_preview_artifact_with_scenes_assets_and_state(
            &output_dir,
            &ExportOptions::default(),
            vec![authored],
            true,
            Some(&editor_state),
            Some(&project_dir),
        )
        .expect("build authored export with copied assets");
        assert!(report.asset_count >= 2);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        let assets = assets_manifest["assets"].as_array().expect("assets array");
        let player_asset = assets
            .iter()
            .find(|asset| asset["id"] == "entity_player")
            .expect("entity_player asset");
        let tile_asset = assets
            .iter()
            .find(|asset| asset["id"] == "tile_1")
            .expect("tile_1 asset");

        let player_path = output_dir.join(player_asset["path"].as_str().expect("player path"));
        let tile_path = output_dir.join(tile_asset["path"].as_str().expect("tile path"));
        assert!(player_path.exists());
        assert!(tile_path.exists());
        assert_eq!(
            fs::read(player_path).expect("read copied player"),
            b"png-player"
        );
        assert_eq!(fs::read(tile_path).expect("read copied tile"), b"png-tile");
        assert_eq!(
            player_asset["source"].as_str().unwrap_or_default(),
            "project_asset://entities/player"
        );
        assert_eq!(
            tile_asset["source"].as_str().unwrap_or_default(),
            "project_asset://tiles/1"
        );

        let _ = fs::remove_dir_all(output_dir);
        let _ = fs::remove_dir_all(project_dir);
    }

    #[test]
    fn project_dir_asset_conventions_are_discovered_and_copied() {
        let output_dir = unique_temp_dir("project-discovery-out");
        let project_dir = unique_temp_dir("project-discovery-project");
        let entities_dir = project_dir.join("assets").join("entities");
        let tiles_dir = project_dir.join("assets").join("tiles");
        fs::create_dir_all(&entities_dir).expect("create entities dir");
        fs::create_dir_all(&tiles_dir).expect("create tiles dir");

        let player_asset = entities_dir.join("player.png");
        let tile_asset = tiles_dir.join("tile_1.png");
        fs::write(&player_asset, b"player-bytes").expect("write player asset");
        fs::write(&tile_asset, b"tile-bytes").expect("write tile asset");

        let editor_state = json!({
            "entities": [
                { "id": 1, "name": "Player", "position": { "x": 16, "y": 16 } }
            ],
            "tiles": [
                { "x": 1, "y": 2, "tile_id": 1 }
            ],
            "audio": [
                { "id": "theme", "name": "Theme" }
            ],
            "playtest": { "frame": 5 }
        });
        let authored = build_authored_preview_scene(ExportProfile::GameBoy, &editor_state);
        let report = build_html5_preview_artifact_with_scenes_assets_and_state(
            &output_dir,
            &ExportOptions::default(),
            vec![authored],
            true,
            Some(&editor_state),
            Some(&project_dir),
        )
        .expect("build authored export with project discovery");
        assert!(report.asset_count >= 2);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        let assets = assets_manifest["assets"].as_array().expect("assets array");
        let player = assets
            .iter()
            .find(|asset| asset["id"] == "entity_player")
            .expect("entity_player asset");
        let tile = assets
            .iter()
            .find(|asset| asset["id"] == "tile_1")
            .expect("tile_1 asset");
        assert_eq!(
            player["source"].as_str().unwrap_or_default(),
            "project_asset://entities/player"
        );
        assert_eq!(
            tile["source"].as_str().unwrap_or_default(),
            "project_asset://tiles/1"
        );

        let player_out = output_dir.join(player["path"].as_str().expect("player path"));
        let tile_out = output_dir.join(tile["path"].as_str().expect("tile path"));
        assert!(player_out.exists());
        assert!(tile_out.exists());
        assert_eq!(
            fs::read(player_out).expect("read player out"),
            b"player-bytes"
        );
        assert_eq!(fs::read(tile_out).expect("read tile out"), b"tile-bytes");

        let _ = fs::remove_dir_all(output_dir);
        let _ = fs::remove_dir_all(project_dir);
    }

    #[test]
    fn project_manifest_asset_mappings_are_preferred_over_conventions() {
        let output_dir = unique_temp_dir("project-manifest-out");
        let project_dir = unique_temp_dir("project-manifest-project");
        let entities_dir = project_dir.join("assets").join("entities");
        let tiles_dir = project_dir.join("assets").join("tiles");
        let art_dir = project_dir.join("art");
        fs::create_dir_all(&entities_dir).expect("create entities dir");
        fs::create_dir_all(&tiles_dir).expect("create tiles dir");
        fs::create_dir_all(&art_dir).expect("create art dir");

        // Convention files (should be ignored when manifest mappings exist).
        fs::write(entities_dir.join("player.png"), b"player-convention").expect("write convention");
        fs::write(tiles_dir.join("tile_1.png"), b"tile-convention").expect("write convention");
        // Manifest-target files (should be used).
        fs::write(art_dir.join("player-manifest.png"), b"player-manifest")
            .expect("write manifest player");
        fs::write(art_dir.join("tile-manifest.png"), b"tile-manifest")
            .expect("write manifest tile");

        let manifest = json!({
            "schema_version": 1,
            "assets": [
                { "id": "entity_player", "path": "art/player-manifest.png" },
                { "id": "tile_1", "path": "art/tile-manifest.png" }
            ]
        });
        let manifest_path = project_dir.join("assets").join("manifest.json");
        fs::write(
            &manifest_path,
            serde_json::to_string_pretty(&manifest).expect("serialize manifest"),
        )
        .expect("write project asset manifest");

        let editor_state = json!({
            "entities": [
                { "id": 1, "name": "Player", "position": { "x": 16, "y": 16 } }
            ],
            "tiles": [
                { "x": 1, "y": 2, "tile_id": 1 }
            ],
            "audio": [
                { "id": "theme", "name": "Theme" }
            ],
            "playtest": { "frame": 5 }
        });
        let authored = build_authored_preview_scene(ExportProfile::GameBoy, &editor_state);
        let report = build_html5_preview_artifact_with_scenes_assets_and_state(
            &output_dir,
            &ExportOptions::default(),
            vec![authored],
            true,
            Some(&editor_state),
            Some(&project_dir),
        )
        .expect("build authored export with manifest discovery");
        assert!(report.asset_count >= 2);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read output assets manifest"),
        )
        .expect("parse output assets manifest");
        let assets = assets_manifest["assets"].as_array().expect("assets array");
        let player = assets
            .iter()
            .find(|asset| asset["id"] == "entity_player")
            .expect("entity_player asset");
        let tile = assets
            .iter()
            .find(|asset| asset["id"] == "tile_1")
            .expect("tile_1 asset");
        let player_out = output_dir.join(player["path"].as_str().expect("player path"));
        let tile_out = output_dir.join(tile["path"].as_str().expect("tile path"));
        assert_eq!(
            fs::read(player_out).expect("read copied manifest player"),
            b"player-manifest"
        );
        assert_eq!(
            fs::read(tile_out).expect("read copied manifest tile"),
            b"tile-manifest"
        );

        let _ = fs::remove_dir_all(output_dir);
        let _ = fs::remove_dir_all(project_dir);
    }

    #[test]
    fn authored_audio_asset_paths_are_copied_into_export_when_present() {
        let output_dir = unique_temp_dir("audio-copy");
        let project_dir = unique_temp_dir("audio-copy-project");
        fs::create_dir_all(&project_dir).expect("create project dir");
        let music_ogg = project_dir.join("theme.ogg");
        fs::write(&music_ogg, b"ogg-bytes").expect("write audio asset");

        let editor_state = json!({
            "entities": [
                { "id": 1, "name": "Player", "position": { "x": 16, "y": 16 } }
            ],
            "tiles": [
                { "x": 1, "y": 2, "tile_id": 1 }
            ],
            "audio": [
                { "id": "theme", "name": "Theme", "assetPath": music_ogg.display().to_string() }
            ],
            "playtest": { "frame": 12 }
        });

        let authored = build_authored_preview_scene(ExportProfile::GameBoy, &editor_state);
        let report = build_html5_preview_artifact_with_scenes_assets_and_state(
            &output_dir,
            &ExportOptions::default(),
            vec![authored],
            true,
            Some(&editor_state),
            Some(&project_dir),
        )
        .expect("build authored export with copied audio");
        assert!(report.asset_count >= 3);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        let assets = assets_manifest["assets"].as_array().expect("assets array");
        let audio_asset = assets
            .iter()
            .find(|asset| asset["id"] == "audio_theme")
            .expect("audio_theme asset");
        assert_eq!(audio_asset["kind"], "audio_clip");
        assert_eq!(
            audio_asset["source"].as_str().unwrap_or_default(),
            "project_asset://audio/audio_theme"
        );
        let audio_path = output_dir.join(audio_asset["path"].as_str().expect("audio path"));
        assert!(audio_path.exists());
        assert_eq!(
            fs::read(audio_path).expect("read copied audio"),
            b"ogg-bytes"
        );

        let _ = fs::remove_dir_all(output_dir);
        let _ = fs::remove_dir_all(project_dir);
    }

    #[test]
    fn authored_audio_bindings_are_emitted_into_export_metadata() {
        let output_dir = unique_temp_dir("audio-bindings");
        let editor_state = json!({
            "entities": [
                { "id": 1, "name": "Player", "position": { "x": 16, "y": 16 } }
            ],
            "tiles": [
                { "x": 1, "y": 2, "tile_id": 1 }
            ],
            "audio": [
                { "id": "theme", "name": "Theme" },
                { "id": "pickup", "name": "Pickup" }
            ],
            "audioBindings": {
                "item pickup": "pickup",
                "quest_state": "theme"
            },
            "audioEvents": [
                { "event": "battle_start", "audioId": "theme" }
            ],
            "playtest": { "frame": 3 }
        });
        let authored = build_authored_preview_scene(ExportProfile::GameBoy, &editor_state);
        build_html5_preview_artifact_with_scenes_assets_and_state(
            &output_dir,
            &ExportOptions::default(),
            vec![authored],
            true,
            Some(&editor_state),
            None,
        )
        .expect("build authored export with audio bindings");

        let metadata: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("metadata.json")).expect("read metadata"),
        )
        .expect("parse metadata");
        assert_eq!(
            metadata["audio_bindings"]["item_pickup"],
            serde_json::Value::String("audio_pickup".to_string())
        );
        assert_eq!(
            metadata["audio_bindings"]["quest_state"],
            serde_json::Value::String("audio_theme".to_string())
        );
        assert_eq!(
            metadata["audio_bindings"]["battle_start"],
            serde_json::Value::String("audio_theme".to_string())
        );

        let _ = fs::remove_dir_all(output_dir);
    }

    #[test]
    fn project_manifest_audio_assets_are_packaged_in_authored_export() {
        let output_dir = unique_temp_dir("project-manifest-audio-out");
        let project_dir = unique_temp_dir("project-manifest-audio-project");
        let audio_dir = project_dir.join("audio");
        fs::create_dir_all(&audio_dir).expect("create audio dir");
        let music_ogg = audio_dir.join("theme.ogg");
        fs::write(&music_ogg, b"manifest-audio").expect("write manifest audio");

        let manifest = json!({
            "schema_version": 1,
            "assets": [
                { "id": "audio_theme", "kind": "audio", "path": "audio/theme.ogg" }
            ]
        });
        let manifest_path = project_dir.join("assets").join("manifest.json");
        fs::create_dir_all(manifest_path.parent().expect("manifest parent"))
            .expect("create assets dir");
        fs::write(
            &manifest_path,
            serde_json::to_string_pretty(&manifest).expect("serialize manifest"),
        )
        .expect("write project asset manifest");

        let editor_state = json!({
            "entities": [
                { "id": 1, "name": "Player", "position": { "x": 16, "y": 16 } }
            ],
            "tiles": [
                { "x": 1, "y": 2, "tile_id": 1 }
            ],
            "audio": [
                { "id": "theme", "name": "Theme" }
            ],
            "playtest": { "frame": 5 }
        });
        let authored = build_authored_preview_scene(ExportProfile::GameBoy, &editor_state);
        let report = build_html5_preview_artifact_with_scenes_assets_and_state(
            &output_dir,
            &ExportOptions::default(),
            vec![authored],
            true,
            Some(&editor_state),
            Some(&project_dir),
        )
        .expect("build authored export with manifest audio");
        assert!(report.asset_count >= 3);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read output assets manifest"),
        )
        .expect("parse output assets manifest");
        let assets = assets_manifest["assets"].as_array().expect("assets array");
        let audio = assets
            .iter()
            .find(|asset| asset["id"] == "audio_theme")
            .expect("audio_theme asset");
        assert_eq!(audio["kind"], "audio_clip");
        assert_eq!(
            audio["source"].as_str().unwrap_or_default(),
            "project_asset://audio/audio_theme"
        );
        let audio_out = output_dir.join(audio["path"].as_str().expect("audio path"));
        assert_eq!(
            fs::read(audio_out).expect("read copied manifest audio"),
            b"manifest-audio"
        );

        let _ = fs::remove_dir_all(output_dir);
        let _ = fs::remove_dir_all(project_dir);
    }
}
