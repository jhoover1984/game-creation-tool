use crate::{app_service, editor_service};
use crate::invoke_api::dispatch;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn map_create_and_select_dispatch_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let created = dispatch(
            "map_create",
            serde_json::json!({
                "name": "Player",
                "x": 4,
                "y": 5
            }),
        )
        .expect("map_create dispatch");
        let created_state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse create state");
        let id = created_state.entities[0].id;

        let selected = dispatch(
            "map_select",
            serde_json::json!({
                "ids": [id]
            }),
        )
        .expect("map_select dispatch");
        let selected_state: editor_service::EditorStateResponse =
            serde_json::from_value(selected).expect("parse selected state");
        assert_eq!(selected_state.selection, vec![id]);

        let deleted = dispatch(
            "map_delete",
            serde_json::json!({
                "ids": [id]
            }),
        )
        .expect("map_delete dispatch");
        let deleted_state: editor_service::EditorStateResponse =
            serde_json::from_value(deleted).expect("parse deleted state");
        assert!(deleted_state.entities.is_empty());

        let painted = dispatch(
            "map_paint_tile",
            serde_json::json!({
                "x": 1,
                "y": 2,
                "tileId": 1
            }),
        )
        .expect("map_paint_tile dispatch");
        let painted_state: editor_service::EditorStateResponse =
            serde_json::from_value(painted).expect("parse painted state");
        assert_eq!(painted_state.tiles.len(), 1);

        let reset = dispatch("map_reset", serde_json::json!({})).expect("map_reset dispatch");
        let reset_state: editor_service::EditorStateResponse =
            serde_json::from_value(reset).expect("parse reset state");
        assert!(reset_state.entities.is_empty());
        assert!(reset_state.tiles.is_empty());
        assert!(!reset_state.can_undo);

        let entered =
            dispatch("playtest_enter", serde_json::json!({})).expect("playtest_enter dispatch");
        let entered_state: editor_service::EditorStateResponse =
            serde_json::from_value(entered).expect("parse playtest state");
        assert!(entered_state.playtest.active);

        let ticked = dispatch(
            "playtest_tick",
            serde_json::json!({
                "deltaMs": 1000
            }),
        )
        .expect("playtest_tick dispatch");
        let ticked_state: editor_service::EditorStateResponse =
            serde_json::from_value(ticked).expect("parse ticked state");
        assert!(ticked_state.playtest.frame >= 59);

        let traced = dispatch(
            "playtest_set_trace",
            serde_json::json!({
                "enabled": true
            }),
        )
        .expect("playtest_set_trace dispatch");
        let traced_state: editor_service::EditorStateResponse =
            serde_json::from_value(traced).expect("parse traced state");
        assert!(traced_state.playtest.trace_enabled);

        let with_breakpoints = dispatch(
            "playtest_set_breakpoints",
            serde_json::json!({
                "kinds": ["playtest_tick"]
            }),
        )
        .expect("playtest_set_breakpoints dispatch");
        let with_breakpoints_state: editor_service::EditorStateResponse =
            serde_json::from_value(with_breakpoints).expect("parse breakpoints state");
        assert!(with_breakpoints_state
            .playtest_breakpoints
            .iter()
            .any(|entry| entry.key == "playtest_tick" && entry.value));
    }

    #[test]
    fn map_create_with_prefab_dispatch_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let _ = dispatch(
            "prefab_create",
            serde_json::json!({
                "id": "enemy_slime",
                "name": "Slime",
                "default_components": {}
            }),
        )
        .expect("prefab_create dispatch");

        let created = dispatch(
            "map_create",
            serde_json::json!({
                "name": "Slime Custom",
                "x": 10,
                "y": 20,
                "prefabId": "enemy_slime"
            }),
        )
        .expect("map_create prefab dispatch");
        let created_state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse create state");
        assert_eq!(created_state.entities.len(), 1);
        assert_eq!(created_state.entities[0].name, "Slime Custom");
        assert_eq!(created_state.entities[0].position.x, 10);
        assert_eq!(created_state.entities[0].position.y, 20);
        assert_eq!(created_state.selection, vec![created_state.entities[0].id]);
    }

    #[test]
    fn export_preview_dispatch_writes_bundle() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let _ = dispatch(
            "map_create",
            serde_json::json!({
                "name": "Exporter",
                "x": 16,
                "y": 24
            }),
        )
        .expect("seed map entity");
        let dir = tempfile::tempdir().expect("create temp dir");
        let output_dir = dir.path().join("preview-export");
        let value = dispatch(
            "export_preview_html5",
            serde_json::json!({
                "outputDir": output_dir,
                "debug": true,
                "profile": "nes"
            }),
        )
        .expect("export_preview_html5 dispatch");
        let report: export_core::ExportBundleReport =
            serde_json::from_value(value).expect("parse export report");
        assert_eq!(report.scene_count, 1);
        assert!(report.asset_count >= 1);
        assert_eq!(report.profile, "nes");
        assert_eq!(report.mode, "debug");
        assert!(output_dir.join("index.html").exists());
        assert!(output_dir.join("runtime.js").exists());
        assert!(output_dir.join("scenes.json").exists());
        assert!(output_dir.join("metadata.json").exists());
        assert!(output_dir.join("bundle.json").exists());
        assert!(output_dir.join("assets/manifest.json").exists());
        assert!(output_dir
            .join("assets/generated/entity_exporter.svg")
            .exists());
        let scenes: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(output_dir.join("scenes.json")).expect("read scenes"),
        )
        .expect("parse scenes");
        let assets_manifest: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        assert!(assets_manifest["asset_count"].as_u64().unwrap_or(0) >= 1);
        assert!(assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .any(|asset| asset["id"] == "entity_exporter"));
        assert_eq!(scenes[0]["name"], "authored_map_preview");
        assert_eq!(
            scenes[0]["snapshot"]["entities"]
                .as_array()
                .expect("entities")
                .len(),
            1
        );
    }

    #[test]
    fn export_preview_dispatch_includes_prefab_components_in_authored_snapshot() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let _ = dispatch(
            "prefab_create",
            serde_json::json!({
                "id": "enemy_slime",
                "name": "Slime",
                "default_components": {
                    "collision": {
                        "offset_x": 0,
                        "offset_y": 0,
                        "width": 8,
                        "height": 8,
                        "solid": true
                    }
                }
            }),
        )
        .expect("prefab_create dispatch");

        let created = dispatch(
            "map_create",
            serde_json::json!({
                "name": "",
                "x": 16,
                "y": 24,
                "prefabId": "enemy_slime"
            }),
        )
        .expect("map_create with prefab");
        let created_state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse created state");
        let entity_id = created_state.entities[0].id;

        let dir = tempfile::tempdir().expect("create temp dir");
        let output_dir = dir.path().join("preview-export-prefab-components");
        let _ = dispatch(
            "export_preview_html5",
            serde_json::json!({
                "outputDir": output_dir,
                "debug": false,
                "profile": "game_boy"
            }),
        )
        .expect("export_preview_html5 dispatch");

        let scenes: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(output_dir.join("scenes.json")).expect("read scenes"),
        )
        .expect("parse scenes");
        let key = entity_id.to_string();
        assert_eq!(
            scenes[0]["snapshot"]["entity_components"][key]["collision"]["width"],
            8
        );
    }

    #[test]
    fn export_preview_dispatch_uses_starter_pack_for_known_authored_ids() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let dir = tempfile::tempdir().expect("create temp dir");
        let output_dir = dir.path().join("preview-export-starter-pack");
        let value = dispatch(
            "export_preview_html5",
            serde_json::json!({
                "outputDir": output_dir,
                "debug": false,
                "profile": "game_boy",
                "editorState": {
                    "entities": [
                        { "id": 1, "name": "Player", "position": { "x": 16, "y": 16 } },
                        { "id": 2, "name": "Crate Prop (GB)", "position": { "x": 48, "y": 16 } }
                    ],
                    "tiles": [
                        { "x": 0, "y": 0, "tile_id": 1 }
                    ],
                    "playtest": { "frame": 2 }
                }
            }),
        )
        .expect("export_preview_html5 dispatch for starter pack");
        let report: export_core::ExportBundleReport =
            serde_json::from_value(value).expect("parse export report");
        assert!(report.asset_count >= 3);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        let assets = assets_manifest["assets"].as_array().expect("assets array");
        let tile_1 = assets
            .iter()
            .find(|asset| asset["id"] == "tile_1")
            .expect("tile_1 asset");
        let player = assets
            .iter()
            .find(|asset| asset["id"] == "entity_player")
            .expect("entity_player asset");
        let crate_prop = assets
            .iter()
            .find(|asset| asset["id"] == "entity_crate_prop_gb")
            .expect("entity_crate_prop_gb asset");

        assert_eq!(
            tile_1["source"].as_str().unwrap_or_default(),
            "starter_pack://tiles/1"
        );
        assert_eq!(
            player["source"].as_str().unwrap_or_default(),
            "starter_pack://entities/player"
        );
        assert_eq!(
            crate_prop["source"].as_str().unwrap_or_default(),
            "starter_pack://entities/crate_prop_gb"
        );
        assert!(tile_1["path"]
            .as_str()
            .is_some_and(|path| path.starts_with("assets/starter/")));
        assert!(player["path"]
            .as_str()
            .is_some_and(|path| path.starts_with("assets/starter/")));
        assert!(crate_prop["path"]
            .as_str()
            .is_some_and(|path| path.starts_with("assets/starter/")));

        assert!(output_dir.join("assets/starter/tile_1.svg").exists());
        assert!(output_dir.join("assets/starter/entity_player.svg").exists());
        assert!(output_dir
            .join("assets/starter/entity_crate_prop_gb.svg")
            .exists());
    }

    #[test]
    fn export_preview_dispatch_copies_authored_asset_paths() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let dir = tempfile::tempdir().expect("create temp dir");
        let project_dir = dir.path().join("project");
        std::fs::create_dir_all(&project_dir).expect("create project dir");
        let entity_asset = project_dir.join("hero.png");
        let tile_asset = project_dir.join("tile.png");
        std::fs::write(&entity_asset, b"hero-bytes").expect("write entity source");
        std::fs::write(&tile_asset, b"tile-bytes").expect("write tile source");

        let output_dir = dir.path().join("preview-export-copy");
        let value = dispatch(
            "export_preview_html5",
            serde_json::json!({
                "outputDir": output_dir,
                "debug": false,
                "profile": "game_boy",
                "projectDir": project_dir,
                "editorState": {
                    "entities": [
                        { "id": 1, "name": "Hero", "position": { "x": 16, "y": 16 }, "assetPath": entity_asset.display().to_string() }
                    ],
                    "tiles": [
                        { "x": 0, "y": 0, "tile_id": 1, "assetPath": tile_asset.display().to_string() }
                    ],
                    "playtest": { "frame": 2 }
                }
            }),
        )
        .expect("export_preview_html5 dispatch with authored asset paths");
        let report: export_core::ExportBundleReport =
            serde_json::from_value(value).expect("parse export report");
        assert!(report.asset_count >= 2);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        let player_asset = assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .find(|asset| asset["id"] == "entity_hero")
            .expect("entity_hero asset");
        let tile1_asset = assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .find(|asset| asset["id"] == "tile_1")
            .expect("tile_1 asset");
        let player_path = output_dir.join(
            player_asset["path"]
                .as_str()
                .expect("entity_hero asset path"),
        );
        let tile_path = output_dir.join(tile1_asset["path"].as_str().expect("tile_1 asset path"));
        assert!(player_path.exists());
        assert!(tile_path.exists());
        assert_eq!(
            std::fs::read(player_path).expect("read copied entity asset"),
            b"hero-bytes"
        );
        assert_eq!(
            std::fs::read(tile_path).expect("read copied tile asset"),
            b"tile-bytes"
        );
    }

    #[test]
    fn export_preview_dispatch_discovers_project_asset_conventions() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let dir = tempfile::tempdir().expect("create temp dir");
        let project_dir = dir.path().join("project");
        let entities_dir = project_dir.join("assets").join("entities");
        let tiles_dir = project_dir.join("assets").join("tiles");
        std::fs::create_dir_all(&entities_dir).expect("create entities dir");
        std::fs::create_dir_all(&tiles_dir).expect("create tiles dir");
        let hero_asset = entities_dir.join("hero.png");
        let tile_asset = tiles_dir.join("tile_1.png");
        std::fs::write(&hero_asset, b"hero-discovered").expect("write hero source");
        std::fs::write(&tile_asset, b"tile-discovered").expect("write tile source");

        let output_dir = dir.path().join("preview-export-discovered");
        let value = dispatch(
            "export_preview_html5",
            serde_json::json!({
                "outputDir": output_dir,
                "projectDir": project_dir,
                "debug": false,
                "profile": "game_boy",
                "editorState": {
                    "entities": [
                        { "id": 1, "name": "Hero", "position": { "x": 16, "y": 16 } }
                    ],
                    "tiles": [
                        { "x": 0, "y": 0, "tile_id": 1 }
                    ],
                    "audio": [
                        { "id": "theme", "name": "Theme" }
                    ],
                    "playtest": { "frame": 2 }
                }
            }),
        )
        .expect("export_preview_html5 dispatch with projectDir conventions");
        let report: export_core::ExportBundleReport =
            serde_json::from_value(value).expect("parse export report");
        assert!(report.asset_count >= 2);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        let hero = assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .find(|asset| asset["id"] == "entity_hero")
            .expect("entity_hero asset");
        let tile = assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .find(|asset| asset["id"] == "tile_1")
            .expect("tile_1 asset");
        let hero_path = output_dir.join(hero["path"].as_str().expect("hero path"));
        let tile_path = output_dir.join(tile["path"].as_str().expect("tile path"));
        assert!(hero_path.exists());
        assert!(tile_path.exists());
        assert_eq!(
            std::fs::read(hero_path).expect("read copied hero asset"),
            b"hero-discovered"
        );
        assert_eq!(
            std::fs::read(tile_path).expect("read copied tile asset"),
            b"tile-discovered"
        );
    }

    #[test]
    fn export_preview_dispatch_prefers_project_asset_manifest_mappings() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let dir = tempfile::tempdir().expect("create temp dir");
        let project_dir = dir.path().join("project");
        let entities_dir = project_dir.join("assets").join("entities");
        let tiles_dir = project_dir.join("assets").join("tiles");
        let art_dir = project_dir.join("art");
        std::fs::create_dir_all(&entities_dir).expect("create entities dir");
        std::fs::create_dir_all(&tiles_dir).expect("create tiles dir");
        std::fs::create_dir_all(&art_dir).expect("create art dir");

        // Convention files that should be overridden by manifest mappings.
        std::fs::write(entities_dir.join("hero.png"), b"hero-convention")
            .expect("write hero convention");
        std::fs::write(tiles_dir.join("tile_1.png"), b"tile-convention")
            .expect("write tile convention");
        std::fs::write(art_dir.join("hero-manifest.png"), b"hero-manifest")
            .expect("write hero manifest file");
        std::fs::write(art_dir.join("tile-manifest.png"), b"tile-manifest")
            .expect("write tile manifest file");

        let manifest_path = project_dir.join("assets").join("manifest.json");
        std::fs::write(
            &manifest_path,
            serde_json::to_string_pretty(&serde_json::json!({
                "schema_version": 1,
                "assets": [
                    { "id": "entity_hero", "path": "art/hero-manifest.png" },
                    { "id": "tile_1", "path": "art/tile-manifest.png" }
                ]
            }))
            .expect("serialize project asset manifest"),
        )
        .expect("write project asset manifest");

        let output_dir = dir.path().join("preview-export-manifest");
        let value = dispatch(
            "export_preview_html5",
            serde_json::json!({
                "outputDir": output_dir,
                "projectDir": project_dir,
                "debug": false,
                "profile": "game_boy",
                "editorState": {
                    "entities": [
                        { "id": 1, "name": "Hero", "position": { "x": 16, "y": 16 } }
                    ],
                    "tiles": [
                        { "x": 0, "y": 0, "tile_id": 1 }
                    ],
                    "audio": [
                        { "id": "theme", "name": "Theme" }
                    ],
                    "playtest": { "frame": 2 }
                }
            }),
        )
        .expect("export_preview_html5 dispatch with manifest mappings");
        let report: export_core::ExportBundleReport =
            serde_json::from_value(value).expect("parse export report");
        assert!(report.asset_count >= 2);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        let hero = assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .find(|asset| asset["id"] == "entity_hero")
            .expect("entity_hero asset");
        let tile = assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .find(|asset| asset["id"] == "tile_1")
            .expect("tile_1 asset");
        let hero_path = output_dir.join(hero["path"].as_str().expect("hero path"));
        let tile_path = output_dir.join(tile["path"].as_str().expect("tile path"));
        assert_eq!(
            std::fs::read(hero_path).expect("read copied hero asset"),
            b"hero-manifest"
        );
        assert_eq!(
            std::fs::read(tile_path).expect("read copied tile asset"),
            b"tile-manifest"
        );
    }

    #[test]
    fn export_preview_dispatch_packages_project_manifest_audio_assets() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let dir = tempfile::tempdir().expect("create temp dir");
        let project_dir = dir.path().join("project");
        let audio_dir = project_dir.join("audio");
        std::fs::create_dir_all(&audio_dir).expect("create audio dir");
        let theme_path = audio_dir.join("theme.ogg");
        std::fs::write(&theme_path, b"theme-audio").expect("write audio file");

        let manifest_path = project_dir.join("assets").join("manifest.json");
        std::fs::create_dir_all(manifest_path.parent().expect("manifest parent"))
            .expect("create assets dir");
        std::fs::write(
            &manifest_path,
            serde_json::to_string_pretty(&serde_json::json!({
                "schema_version": 1,
                "assets": [
                    { "id": "audio_theme", "kind": "audio", "path": "audio/theme.ogg" }
                ]
            }))
            .expect("serialize project asset manifest"),
        )
        .expect("write project asset manifest");

        let output_dir = dir.path().join("preview-export-audio");
        let value = dispatch(
            "export_preview_html5",
            serde_json::json!({
                "outputDir": output_dir,
                "projectDir": project_dir,
                "debug": false,
                "profile": "game_boy",
                "editorState": {
                    "entities": [
                        { "id": 1, "name": "Hero", "position": { "x": 16, "y": 16 } }
                    ],
                    "tiles": [
                        { "x": 0, "y": 0, "tile_id": 1 }
                    ],
                    "audio": [
                        { "id": "theme", "name": "Theme" }
                    ],
                    "playtest": { "frame": 2 }
                }
            }),
        )
        .expect("export_preview_html5 dispatch with manifest audio");
        let report: export_core::ExportBundleReport =
            serde_json::from_value(value).expect("parse export report");
        assert!(report.asset_count >= 3);

        let assets_manifest: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(output_dir.join("assets/manifest.json"))
                .expect("read assets manifest"),
        )
        .expect("parse assets manifest");
        let audio = assets_manifest["assets"]
            .as_array()
            .expect("assets array")
            .iter()
            .find(|asset| asset["id"] == "audio_theme")
            .expect("audio_theme asset");
        assert_eq!(audio["kind"], "audio_clip");
        assert_eq!(
            audio["source"].as_str().unwrap_or_default(),
            "project_asset://audio/audio_theme"
        );
        let audio_path = output_dir.join(audio["path"].as_str().expect("audio path"));
        assert_eq!(
            std::fs::read(audio_path).expect("read copied audio asset"),
            b"theme-audio"
        );
    }

    #[test]
    fn script_validate_dispatch_reports_missing_nodes() {
        let value = dispatch(
            "script_validate",
            serde_json::json!({
                "graph": {
                    "nodes": [{ "id": "event_start", "kind": "event" }],
                    "edges": [{ "from": "event_start", "to": "action_missing" }]
                }
            }),
        )
        .expect("script_validate dispatch");
        let report: script_core::ValidationReport =
            serde_json::from_value(value).expect("parse script validate report");
        assert!(!report.is_valid());
        assert!(report
            .errors
            .iter()
            .any(|error| error.code == "missing_target_node"));
    }

    #[test]
    fn script_load_fire_unload_dispatch_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        // Load a simple graph
        let loaded = dispatch(
            "script_load_graph",
            serde_json::json!({
                "graph": {
                    "nodes": [
                        { "id": "ev", "kind": "event", "behavior": { "type": "on_event", "event": "interact" } },
                        { "id": "act", "kind": "action", "behavior": { "type": "set_flag", "flag": "door_open", "value": true } }
                    ],
                    "edges": [{ "from": "ev", "to": "act" }]
                }
            }),
        )
        .expect("script_load_graph dispatch");
        let load_response: editor_service::ScriptLoadResponse =
            serde_json::from_value(loaded).expect("parse script load response");
        assert!(load_response.registered_events.contains(&"interact".to_string()));
        assert!(load_response.state.script_loaded);

        // Fire the event
        let fired = dispatch(
            "script_fire_event",
            serde_json::json!({ "event": "interact" }),
        )
        .expect("script_fire_event dispatch");
        let fire_response: editor_service::ScriptFireEventResponse =
            serde_json::from_value(fired).expect("parse script fire event response");
        assert_eq!(fire_response.effects_count, 1);
        assert!(fire_response.nodes_visited.contains(&"act".to_string()));
        assert!(fire_response
            .state
            .watch_flags
            .iter()
            .any(|f| f.key == "door_open" && f.value));

        // Unload
        let unloaded = dispatch("script_unload_graph", serde_json::json!({}))
            .expect("script_unload_graph dispatch");
        let unload_state: editor_service::EditorStateResponse =
            serde_json::from_value(unloaded).expect("parse unload state");
        assert!(!unload_state.script_loaded);
    }

    #[test]
    fn script_load_rejects_invalid_graph() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let result = dispatch(
            "script_load_graph",
            serde_json::json!({
                "graph": {
                    "nodes": [{ "id": "ev", "kind": "event" }],
                    "edges": [{ "from": "ev", "to": "missing_node" }]
                }
            }),
        );
        assert!(result.is_err());
    }

    #[test]
    fn scene_add_list_set_active_remove_dispatch_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        // Add two scenes
        let added = dispatch(
            "scene_add",
            serde_json::json!({ "id": "overworld", "name": "Overworld" }),
        )
        .expect("scene_add dispatch");
        let response: editor_service::SceneListResponse =
            serde_json::from_value(added).expect("parse scene add response");
        assert_eq!(response.scenes.len(), 1);
        assert_eq!(response.active_scene_id, Some("overworld".to_string()));

        let _ = dispatch(
            "scene_add",
            serde_json::json!({ "id": "dungeon", "name": "Dungeon" }),
        )
        .expect("scene_add dungeon dispatch");

        // List scenes
        let listed = dispatch("scene_list", serde_json::json!({}))
            .expect("scene_list dispatch");
        let list_response: editor_service::SceneListResponse =
            serde_json::from_value(listed).expect("parse scene list response");
        assert_eq!(list_response.scenes.len(), 2);

        // Switch active scene
        let switched = dispatch(
            "scene_set_active",
            serde_json::json!({ "id": "dungeon" }),
        )
        .expect("scene_set_active dispatch");
        let switch_response: editor_service::SceneListResponse =
            serde_json::from_value(switched).expect("parse scene switch response");
        assert_eq!(switch_response.active_scene_id, Some("dungeon".to_string()));

        // Add spawn point
        let spawned = dispatch(
            "scene_add_spawn_point",
            serde_json::json!({ "sceneId": "dungeon", "name": "entrance", "x": 32, "y": 64 }),
        )
        .expect("scene_add_spawn_point dispatch");
        let spawn_response: editor_service::SceneListResponse =
            serde_json::from_value(spawned).expect("parse spawn point response");
        let dungeon = spawn_response.scenes.iter().find(|s| s.id == "dungeon").expect("dungeon scene");
        assert_eq!(dungeon.spawn_point_count, 1);

        // Remove a scene
        let removed = dispatch(
            "scene_remove",
            serde_json::json!({ "id": "overworld" }),
        )
        .expect("scene_remove dispatch");
        let remove_response: editor_service::SceneListResponse =
            serde_json::from_value(removed).expect("parse scene remove response");
        assert_eq!(remove_response.scenes.len(), 1);
        assert_eq!(remove_response.active_scene_id, Some("dungeon".to_string()));

        // Set active to nonexistent fails
        let bad = dispatch(
            "scene_set_active",
            serde_json::json!({ "id": "nonexistent" }),
        );
        assert!(bad.is_err());
    }

    #[test]
    fn playtest_key_down_up_dispatch_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let _ = dispatch("playtest_enter", serde_json::json!({}))
            .expect("playtest_enter dispatch");

        let down = dispatch(
            "playtest_key_down",
            serde_json::json!({ "key": "arrow_right" }),
        )
        .expect("playtest_key_down dispatch");
        let _state: editor_service::EditorStateResponse =
            serde_json::from_value(down).expect("parse key_down state");

        let up = dispatch(
            "playtest_key_up",
            serde_json::json!({ "key": "arrow_right" }),
        )
        .expect("playtest_key_up dispatch");
        let _state: editor_service::EditorStateResponse =
            serde_json::from_value(up).expect("parse key_up state");

        let _ = dispatch("playtest_exit", serde_json::json!({}))
            .expect("playtest_exit dispatch");
    }

    #[test]
    fn set_physics_config_dispatch() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let result = dispatch(
            "set_physics_config",
            serde_json::json!({ "gravity": 0.4, "friction": 0.9 }),
        )
        .expect("set_physics_config dispatch");
        let _state: editor_service::EditorStateResponse =
            serde_json::from_value(result).expect("parse physics config state");
    }

    #[test]
    fn prefab_dispatch_crud_and_stamp_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let created = dispatch(
            "prefab_create",
            serde_json::json!({
                "id": "enemy_slime",
                "name": "Slime",
                "default_components": {
                    "collision": {
                        "offset_x": 0,
                        "offset_y": 0,
                        "width": 8,
                        "height": 8,
                        "solid": true
                    }
                }
            }),
        )
        .expect("prefab_create dispatch");
        let created_list: editor_service::PrefabListResponse =
            serde_json::from_value(created).expect("parse prefab_create response");
        assert_eq!(created_list.prefabs.len(), 1);
        assert_eq!(created_list.prefabs[0].id, "enemy_slime");

        let listed = dispatch("prefab_list", serde_json::json!({})).expect("prefab_list dispatch");
        let listed_resp: editor_service::PrefabListResponse =
            serde_json::from_value(listed).expect("parse prefab_list response");
        assert_eq!(listed_resp.prefabs.len(), 1);

        let stamped = dispatch(
            "prefab_stamp",
            serde_json::json!({
                "prefabId": "enemy_slime",
                "x": 24,
                "y": 32
            }),
        )
        .expect("prefab_stamp dispatch");
        let state: editor_service::EditorStateResponse =
            serde_json::from_value(stamped).expect("parse prefab_stamp state");
        assert_eq!(state.entities.len(), 1);
        assert_eq!(state.entities[0].name, "Slime");
        assert_eq!(state.entities[0].position.x, 24);
        assert_eq!(state.entities[0].position.y, 32);

        let deleted = dispatch(
            "prefab_delete",
            serde_json::json!({
                "id": "enemy_slime"
            }),
        )
        .expect("prefab_delete dispatch");
        let deleted_list: editor_service::PrefabListResponse =
            serde_json::from_value(deleted).expect("parse prefab_delete response");
        assert!(deleted_list.prefabs.is_empty());
    }

    #[test]
    fn save_project_persists_editor_state_and_open_restores_it() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let dir = tempfile::tempdir().expect("create temp dir");

        // Create entities and tiles
        let created = dispatch(
            "map_create",
            serde_json::json!({ "name": "Hero", "x": 32, "y": 48 }),
        )
        .expect("create entity");
        let created_state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse created state");
        let entity_id = created_state.entities[0].id;
        let _ = dispatch(
            "map_paint_tile",
            serde_json::json!({ "x": 1, "y": 2, "tileId": 3 }),
        )
        .expect("paint tile");
        let _ = dispatch(
            "prefab_create",
            serde_json::json!({
                "id": "enemy_slime",
                "name": "Slime",
                "default_components": {
                    "collision": {
                        "offset_x": 0,
                        "offset_y": 0,
                        "width": 8,
                        "height": 8,
                        "solid": true
                    }
                }
            }),
        )
        .expect("create prefab");
        let _ = dispatch(
            "animation_asset_clip_upsert",
            serde_json::json!({
                "clip": {
                    "id": "clip_idle",
                    "name": "Idle",
                    "frames": [0],
                    "frame_duration_ticks": 1,
                    "loop_mode": "loop",
                    "sprite_sheet_id": "sheet_player"
                }
            }),
        )
        .expect("create animation clip asset");
        let _ = dispatch(
            "animation_asset_graph_upsert",
            serde_json::json!({
                "graph": {
                    "id": "graph_player",
                    "name": "Player Graph",
                    "states": { "idle": "clip_idle" },
                    "transitions": [],
                    "default_state": "idle"
                }
            }),
        )
        .expect("create animation graph asset");
        let _ = dispatch(
            "animation_bind_graph",
            serde_json::json!({
                "entityId": entity_id,
                "graphAssetId": "graph_player"
            }),
        )
        .expect("bind entity animation graph");

        // Save project
        let _ = dispatch(
            "save_project",
            serde_json::json!({ "projectDir": dir.path(), "projectName": "Persist Test" }),
        )
        .expect("save project");

        // Verify editor-state.json exists
        let state_path = dir.path().join("editor-state.json");
        assert!(state_path.exists(), "editor-state.json should exist after save");
        let raw = std::fs::read_to_string(&state_path).expect("read editor-state.json");
        let saved: serde_json::Value = serde_json::from_str(&raw).expect("parse saved state");
        assert!(saved.get("entities").is_some());
        assert!(saved.get("tiles").is_some());
        assert!(saved.get("prefabs").is_some());
        assert!(saved.get("animation_assets").is_some());
        assert_eq!(
            saved["entities"][0]["components"]["animation"]["graph_asset_id"]
                .as_str()
                .unwrap_or_default(),
            "graph_player"
        );

        // Reset runtime and reopen
        editor_service::reset_runtime();
        let opened = dispatch(
            "open_project",
            serde_json::json!({ "projectDir": dir.path(), "applyMigrations": false }),
        )
        .expect("open project");
        let _open_response: app_service::OpenProjectResponse =
            serde_json::from_value(opened).expect("parse open response");

        // Verify editor state was restored
        let state = editor_service::get_editor_state().expect("get editor state after open");
        assert_eq!(state.entities.len(), 1, "entity should be restored");
        assert_eq!(state.entities[0].name, "Hero");
        assert_eq!(state.entities[0].position.x, 32);
        assert_eq!(state.entities[0].position.y, 48);
        assert_eq!(
            state.entities[0]
                .components
                .animation
                .as_ref()
                .and_then(|a| a.graph_asset_id.clone())
                .as_deref(),
            Some("graph_player")
        );
        assert_eq!(state.tiles.len(), 1, "tile should be restored");
        assert_eq!(state.tiles[0].x, 1);
        assert_eq!(state.tiles[0].y, 2);
        assert_eq!(state.tiles[0].tile_id, 3);
        assert_eq!(state.project_name, "Persist Test");
        // Undo history should be clean after load
        assert!(!state.can_undo);

        let prefabs = dispatch("prefab_list", serde_json::json!({})).expect("prefab_list");
        let prefabs: editor_service::PrefabListResponse =
            serde_json::from_value(prefabs).expect("parse prefab list");
        assert_eq!(prefabs.prefabs.len(), 1);
        assert_eq!(prefabs.prefabs[0].id, "enemy_slime");

        let assets = dispatch("animation_asset_list", serde_json::json!({}))
            .expect("animation_asset_list");
        let assets: editor_service::AnimationAssetListResponse =
            serde_json::from_value(assets).expect("parse animation asset list");
        assert_eq!(assets.clips.len(), 1);
        assert_eq!(assets.graphs.len(), 1);
    }

    #[test]
    fn entity_get_components_dispatch_returns_empty_for_unknown() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let result = dispatch(
            "entity_get_components",
            serde_json::json!({ "entityId": 999 }),
        )
        .expect("entity_get_components dispatch");
        let components: editor_service::ComponentsDto =
            serde_json::from_value(result).expect("parse components");
        assert_eq!(components.entity_id, 999);
        assert!(components.collision.is_none());
        assert!(components.sprite.is_none());
        assert!(!components.has_movement);
        assert!(!components.has_velocity);
    }

    #[test]
    fn entity_set_components_dispatch_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let created = dispatch(
            "map_create",
            serde_json::json!({
                "name": "OverrideTarget",
                "x": 3,
                "y": 4
            }),
        )
        .expect("map_create dispatch");
        let created_state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse created state");
        let entity_id = created_state.entities[0].id;

        dispatch(
            "entity_set_components",
            serde_json::json!({
                "entityId": entity_id,
                "components": {
                    "collision": { "offset_x": 1, "offset_y": 2, "width": 10, "height": 12, "solid": true },
                    "movement": { "mode": "grid_snap", "speed": 8.0, "facing": "down", "step_cooldown": 0, "step_interval": 8 }
                }
            }),
        )
        .expect("entity_set_components dispatch");

        let result = dispatch(
            "entity_get_components",
            serde_json::json!({ "entityId": entity_id }),
        )
        .expect("entity_get_components dispatch");
        let components: editor_service::ComponentsDto =
            serde_json::from_value(result).expect("parse components");
        assert_eq!(components.entity_id, entity_id);
        assert!(components.collision.is_some());
        assert_eq!(components.collision.as_ref().map(|c| c.width), Some(10));
        assert!(components.has_movement);
    }

    #[test]
    fn spawn_and_despawn_entity_dispatch_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        // Create a prefab to spawn from.
        dispatch(
            "prefab_create",
            serde_json::json!({
                "id": "grunt",
                "name": "Grunt",
                "default_components": {}
            }),
        )
        .expect("prefab_create dispatch");

        // Spawn an entity from that prefab.
        let spawned = dispatch(
            "spawn_entity",
            serde_json::json!({ "prefabId": "grunt", "x": 10, "y": 20 }),
        )
        .expect("spawn_entity dispatch");
        let spawned_state: editor_service::EditorStateResponse =
            serde_json::from_value(spawned).expect("parse spawn_entity response");
        assert_eq!(spawned_state.entities.len(), 1);
        assert_eq!(spawned_state.entities[0].name, "Grunt");
        assert_eq!(spawned_state.entities[0].position.x, 10);
        assert_eq!(spawned_state.entities[0].position.y, 20);
        let entity_id = spawned_state.entities[0].id;

        // Despawn the entity by id.
        let despawned = dispatch(
            "despawn_entity",
            serde_json::json!({ "entityId": entity_id }),
        )
        .expect("despawn_entity dispatch");
        let despawned_state: editor_service::EditorStateResponse =
            serde_json::from_value(despawned).expect("parse despawn_entity response");
        assert!(despawned_state.entities.is_empty(), "entity should be removed after despawn");

        // Despawning an unknown id returns an error.
        let err = dispatch("despawn_entity", serde_json::json!({ "entityId": entity_id }));
        assert!(err.is_err(), "despawning unknown entity id should return an error");
    }

    #[test]
    fn animation_dispatch_add_clip_set_state_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        // Create an entity to attach animation to.
        let created = dispatch(
            "map_create",
            serde_json::json!({ "name": "Hero", "x": 0, "y": 0 }),
        )
        .expect("map_create dispatch");
        let state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse state");
        let entity_id = state.entities[0].id;

        // Add a walk clip.
        let after_clip = dispatch(
            "animation_add_clip",
            serde_json::json!({
                "entityId": entity_id,
                "clipName": "walk",
                "clip": { "frames": [0, 1, 2, 3], "frame_duration_ticks": 4, "loop_mode": "loop" }
            }),
        )
        .expect("animation_add_clip dispatch");
        let _state: editor_service::EditorStateResponse =
            serde_json::from_value(after_clip).expect("parse after_clip state");

        // Add an idle clip.
        dispatch(
            "animation_add_clip",
            serde_json::json!({
                "entityId": entity_id,
                "clipName": "idle",
                "clip": { "frames": [4], "frame_duration_ticks": 1, "loop_mode": "loop" }
            }),
        )
        .expect("animation_add_clip idle dispatch");

        // Switch to idle state.
        let after_set = dispatch(
            "animation_set_state",
            serde_json::json!({ "entityId": entity_id, "stateName": "idle" }),
        )
        .expect("animation_set_state dispatch");
        let _state: editor_service::EditorStateResponse =
            serde_json::from_value(after_set).expect("parse after_set state");

        // Set transitions.
        dispatch(
            "animation_set_transitions",
            serde_json::json!({
                "entityId": entity_id,
                "transitions": [
                    {
                        "from_state": "idle",
                        "to_state": "walk",
                        "condition": { "kind": "flag_set", "flag": "is_moving" }
                    },
                    {
                        "from_state": "walk",
                        "to_state": "run",
                        "condition": { "kind": "flag_set_for_ticks", "flag": "is_running", "min_ticks": 6 }
                    }
                ]
            }),
        )
        .expect("animation_set_transitions dispatch");

        // Unknown state should return an error.
        let err = dispatch(
            "animation_set_state",
            serde_json::json!({ "entityId": entity_id, "stateName": "run" }),
        );
        assert!(err.is_err(), "setting unknown animation state should error");
    }

    #[test]
    fn animation_binding_dispatch_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let created = dispatch(
            "map_create",
            serde_json::json!({ "name": "Hero", "x": 0, "y": 0 }),
        )
        .expect("map_create dispatch");
        let state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse state");
        let entity_id = state.entities[0].id;

        dispatch(
            "animation_asset_graph_upsert",
            serde_json::json!({
                "graph": {
                    "id": "graph_player",
                    "name": "Player Graph",
                    "states": { "idle": "clip_idle" },
                    "transitions": [],
                    "default_state": "idle"
                }
            }),
        )
        .expect("animation_asset_graph_upsert");

        dispatch(
            "animation_bind_graph",
            serde_json::json!({
                "entityId": entity_id,
                "graphAssetId": "graph_player"
            }),
        )
        .expect("animation_bind_graph dispatch");

        let binding = dispatch(
            "animation_get_binding",
            serde_json::json!({ "entityId": entity_id }),
        )
        .expect("animation_get_binding dispatch");
        let binding: editor_service::AnimationBindingResponse =
            serde_json::from_value(binding).expect("parse animation binding response");
        assert_eq!(binding.graph_asset_id.as_deref(), Some("graph_player"));

        dispatch(
            "animation_unbind_graph",
            serde_json::json!({ "entityId": entity_id }),
        )
        .expect("animation_unbind_graph dispatch");

        let binding = dispatch(
            "animation_get_binding",
            serde_json::json!({ "entityId": entity_id }),
        )
        .expect("animation_get_binding dispatch");
        let binding: editor_service::AnimationBindingResponse =
            serde_json::from_value(binding).expect("parse animation binding response");
        assert_eq!(binding.graph_asset_id, None);
    }

    #[test]
    fn animation_dispatch_param_commands_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let bool_resp = dispatch(
            "animation_set_bool_param",
            serde_json::json!({ "key": "is_moving", "value": true }),
        )
        .expect("animation_set_bool_param dispatch");
        let _state: editor_service::EditorStateResponse =
            serde_json::from_value(bool_resp).expect("parse bool param state");

        let int_resp = dispatch(
            "animation_set_int_param",
            serde_json::json!({ "key": "speed_tier", "value": 2 }),
        )
        .expect("animation_set_int_param dispatch");
        let _state: editor_service::EditorStateResponse =
            serde_json::from_value(int_resp).expect("parse int param state");

        let trig_resp = dispatch(
            "animation_fire_trigger",
            serde_json::json!({ "key": "jump_pressed" }),
        )
        .expect("animation_fire_trigger dispatch");
        let _state: editor_service::EditorStateResponse =
            serde_json::from_value(trig_resp).expect("parse trigger state");
    }

    #[test]
    fn animation_int_param_can_drive_transition() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let created = dispatch(
            "map_create",
            serde_json::json!({ "name": "Hero", "x": 0, "y": 0 }),
        )
        .expect("map_create dispatch");
        let state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse state");
        let entity_id = state.entities[0].id;

        dispatch(
            "animation_add_clip",
            serde_json::json!({
                "entityId": entity_id,
                "clipName": "idle",
                "clip": { "frames": [0], "frame_duration_ticks": 1, "loop_mode": "loop" }
            }),
        )
        .expect("animation_add_clip idle dispatch");

        dispatch(
            "animation_add_clip",
            serde_json::json!({
                "entityId": entity_id,
                "clipName": "run",
                "clip": { "frames": [1, 2], "frame_duration_ticks": 1, "loop_mode": "loop" }
            }),
        )
        .expect("animation_add_clip run dispatch");

        dispatch(
            "animation_set_state",
            serde_json::json!({ "entityId": entity_id, "stateName": "idle" }),
        )
        .expect("animation_set_state idle dispatch");

        dispatch(
            "animation_set_transitions",
            serde_json::json!({
                "entityId": entity_id,
                "transitions": [{
                    "from_state": "idle",
                    "to_state": "run",
                    "condition": { "kind": "int_gte", "key": "speed_tier", "value": 2 }
                }]
            }),
        )
        .expect("animation_set_transitions dispatch");

        let _ = dispatch("playtest_enter", serde_json::json!({}))
            .expect("playtest_enter dispatch");
        dispatch(
            "animation_set_int_param",
            serde_json::json!({ "key": "speed_tier", "value": 2 }),
        )
        .expect("animation_set_int_param dispatch");
        let ticked = dispatch(
            "playtest_tick",
            serde_json::json!({ "deltaMs": 34 }),
        )
        .expect("playtest_tick dispatch");
        let ticked_state: editor_service::EditorStateResponse =
            serde_json::from_value(ticked).expect("parse ticked state");

        let hero = ticked_state
            .entities
            .iter()
            .find(|e| e.id == entity_id)
            .expect("hero exists");
        let clip_name = hero
            .components
            .animation
            .as_ref()
            .map(|a| a.state.current_clip_name.as_str())
            .unwrap_or("");
        assert_eq!(clip_name, "run");
    }

    #[test]
    fn animation_int_between_transition_is_inclusive() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let created = dispatch(
            "map_create",
            serde_json::json!({ "name": "Hero", "x": 0, "y": 0 }),
        )
        .expect("map_create dispatch");
        let state: editor_service::EditorStateResponse =
            serde_json::from_value(created).expect("parse state");
        let entity_id = state.entities[0].id;

        dispatch(
            "animation_add_clip",
            serde_json::json!({
                "entityId": entity_id,
                "clipName": "idle",
                "clip": { "frames": [0], "frame_duration_ticks": 1, "loop_mode": "loop" }
            }),
        )
        .expect("animation_add_clip idle dispatch");

        dispatch(
            "animation_add_clip",
            serde_json::json!({
                "entityId": entity_id,
                "clipName": "walk",
                "clip": { "frames": [1, 2], "frame_duration_ticks": 1, "loop_mode": "loop" }
            }),
        )
        .expect("animation_add_clip walk dispatch");

        dispatch(
            "animation_set_state",
            serde_json::json!({ "entityId": entity_id, "stateName": "idle" }),
        )
        .expect("animation_set_state idle dispatch");

        dispatch(
            "animation_set_transitions",
            serde_json::json!({
                "entityId": entity_id,
                "transitions": [{
                    "from_state": "idle",
                    "to_state": "walk",
                    "condition": { "kind": "int_between", "key": "speed_tier", "min": 1, "max": 2 }
                }]
            }),
        )
        .expect("animation_set_transitions int_between dispatch");

        let _ = dispatch("playtest_enter", serde_json::json!({}))
            .expect("playtest_enter dispatch");
        dispatch(
            "animation_set_int_param",
            serde_json::json!({ "key": "speed_tier", "value": 1 }),
        )
        .expect("animation_set_int_param dispatch");
        let ticked = dispatch("playtest_tick", serde_json::json!({ "deltaMs": 34 }))
            .expect("playtest_tick dispatch");
        let ticked_state: editor_service::EditorStateResponse =
            serde_json::from_value(ticked).expect("parse ticked state");

        let hero = ticked_state
            .entities
            .iter()
            .find(|e| e.id == entity_id)
            .expect("hero exists");
        let clip_name = hero
            .components
            .animation
            .as_ref()
            .map(|a| a.state.current_clip_name.as_str())
            .unwrap_or("");
        assert_eq!(clip_name, "walk");
    }

    #[test]
    fn animation_asset_dispatch_crud_roundtrip() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();

        let clip_resp = dispatch(
            "animation_asset_clip_upsert",
            serde_json::json!({
                "clip": {
                    "id": "clip_walk",
                    "name": "Walk",
                    "frames": [0, 1, 2],
                    "frame_duration_ticks": 2,
                    "loop_mode": "loop",
                    "sprite_sheet_id": "sheet_player"
                }
            }),
        )
        .expect("animation_asset_clip_upsert dispatch");
        let clip_list: editor_service::AnimationAssetListResponse =
            serde_json::from_value(clip_resp).expect("parse clip list");
        assert_eq!(clip_list.clips.len(), 1);

        let graph_resp = dispatch(
            "animation_asset_graph_upsert",
            serde_json::json!({
                "graph": {
                    "id": "graph_player",
                    "name": "Player Graph",
                    "states": { "walk": "clip_walk" },
                    "transitions": [],
                    "default_state": "walk"
                }
            }),
        )
        .expect("animation_asset_graph_upsert dispatch");
        let graph_list: editor_service::AnimationAssetListResponse =
            serde_json::from_value(graph_resp).expect("parse graph list");
        assert_eq!(graph_list.graphs.len(), 1);

        let listed = dispatch("animation_asset_list", serde_json::json!({}))
            .expect("animation_asset_list dispatch");
        let listed: editor_service::AnimationAssetListResponse =
            serde_json::from_value(listed).expect("parse listed assets");
        assert_eq!(listed.clips.len(), 1);
        assert_eq!(listed.graphs.len(), 1);

        let deleted_graph = dispatch(
            "animation_asset_graph_delete",
            serde_json::json!({ "id": "graph_player" }),
        )
        .expect("animation_asset_graph_delete dispatch");
        let deleted_graph: editor_service::AnimationAssetListResponse =
            serde_json::from_value(deleted_graph).expect("parse deleted graph response");
        assert!(deleted_graph.graphs.is_empty());

        let deleted_clip = dispatch(
            "animation_asset_clip_delete",
            serde_json::json!({ "id": "clip_walk" }),
        )
        .expect("animation_asset_clip_delete dispatch");
        let deleted_clip: editor_service::AnimationAssetListResponse =
            serde_json::from_value(deleted_clip).expect("parse deleted clip response");
        assert!(deleted_clip.clips.is_empty());
    }
}


