mod app_service;
mod command_gateway;
#[allow(dead_code)]
mod editor_runtime;
mod editor_service;
#[allow(dead_code)]
mod editor_session;
mod invoke_api;
mod invoke_api_animation;
mod invoke_api_entities;
mod invoke_api_map_playtest;
mod invoke_api_project_export;
mod invoke_api_scene_script;
#[cfg(test)]
mod invoke_api_tests;
mod playtest_animation_events;
mod playtest_progress;
mod playtest_step_systems;
mod playtest_tick_orchestrator;
mod tauri_bridge;

use std::path::Path;

use anyhow::{Context, Result};

fn main() -> Result<()> {
    #[cfg(feature = "tauri-runtime")]
    {
        let args = std::env::args().collect::<Vec<_>>();
        if args.len() <= 1 {
            return run_tauri();
        }
        return run_cli(args);
    }

    #[cfg(not(feature = "tauri-runtime"))]
    {
        run_cli(std::env::args().collect::<Vec<_>>())
    }
}

#[cfg(feature = "tauri-runtime")]
fn run_tauri() -> Result<()> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![tauri_bridge::invoke_command])
        .run(tauri::generate_context!())
        .map_err(|error| anyhow::anyhow!(error.to_string()))
}

fn run_cli(args: Vec<String>) -> Result<()> {
    if args.len() < 2 {
        println!("gcs-desktop bootstrap");
        println!("usage:");
        println!("  gcs-desktop open <project_dir> [--apply-migrations]");
        println!("  gcs-desktop save <project_dir> <project_name>");
        println!("  gcs-desktop health <project_dir>");
        println!("  gcs-desktop migrate <project_dir>");
        println!("  gcs-desktop map-create <name> <x> <y>");
        println!("  gcs-desktop map-move <id> <x> <y>");
        println!("  gcs-desktop map-batch-move <id:x:y,id:x:y,...>");
        println!("  gcs-desktop map-delete <id,id,...>");
        println!("  gcs-desktop map-paint-tile <x> <y> <tile_id>");
        println!("  gcs-desktop map-erase-tile <x> <y>");
        println!("  gcs-desktop map-undo");
        println!("  gcs-desktop map-redo");
        println!("  gcs-desktop map-reselect");
        println!("  gcs-desktop map-select <id,id,...>");
        println!("  gcs-desktop map-state");
        println!("  gcs-desktop playtest-enter");
        println!("  gcs-desktop playtest-exit");
        println!("  gcs-desktop playtest-toggle-pause");
        println!("  gcs-desktop playtest-step");
        println!("  gcs-desktop playtest-speed <speed>");
        println!("  gcs-desktop playtest-tick <delta_ms>");
        println!("  gcs-desktop playtest-trace <on|off>");
        println!("  gcs-desktop playtest-breakpoints <kind,kind,...>");
        println!(
            "  gcs-desktop export-preview <output_dir> [--debug] [--profile game_boy|nes|snes]"
        );
        println!("  gcs-desktop invoke <command> <json-payload>");
        return Ok(());
    }

    let command = args[1].as_str();

    let output = match command {
        "open" => {
            if args.len() < 3 {
                anyhow::bail!("open requires <project_dir>");
            }
            let project_dir = Path::new(&args[2]);
            let apply_migrations = args.iter().any(|arg| arg == "--apply-migrations");
            let response = app_service::open_project(project_dir, apply_migrations)
                .with_context(|| format!("failed to open project at {}", project_dir.display()))?;
            serde_json::to_string_pretty(&response)?
        }
        "save" => {
            if args.len() < 4 {
                anyhow::bail!("save requires <project_name>");
            }
            let project_dir = Path::new(&args[2]);
            let manifest = project_core::ProjectManifest::new(args[3].clone());
            let response = app_service::save_project(project_dir, &manifest)
                .with_context(|| format!("failed to save project at {}", project_dir.display()))?;
            serde_json::to_string_pretty(&response)?
        }
        "health" => {
            if args.len() < 3 {
                anyhow::bail!("health requires <project_dir>");
            }
            let project_dir = Path::new(&args[2]);
            let response = app_service::get_project_health(project_dir).with_context(|| {
                format!(
                    "failed to load project health for {}",
                    project_dir.display()
                )
            })?;
            serde_json::to_string_pretty(&response)?
        }
        "migrate" => {
            if args.len() < 3 {
                anyhow::bail!("migrate requires <project_dir>");
            }
            let project_dir = Path::new(&args[2]);
            let response = app_service::migrate_project(project_dir).with_context(|| {
                format!("failed to migrate project at {}", project_dir.display())
            })?;
            serde_json::to_string_pretty(&response)?
        }
        "map-create" => {
            if args.len() < 5 {
                anyhow::bail!("map-create requires <name> <x> <y>");
            }
            let name = args[2].clone();
            let x: i32 = args[3].parse().context("invalid x")?;
            let y: i32 = args[4].parse().context("invalid y")?;
            let response = editor_service::create_map_entity(name, x, y, None)
                .map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-move" => {
            if args.len() < 5 {
                anyhow::bail!("map-move requires <id> <x> <y>");
            }
            let id: u64 = args[2].parse().context("invalid id")?;
            let x: i32 = args[3].parse().context("invalid x")?;
            let y: i32 = args[4].parse().context("invalid y")?;
            let response = editor_service::move_map_entity(id, x, y).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-batch-move" => {
            if args.len() < 3 {
                anyhow::bail!("map-batch-move requires <id:x:y,id:x:y,...>");
            }
            let moves = args[2]
                .split(',')
                .filter(|s| !s.trim().is_empty())
                .map(|part| {
                    let pieces = part.split(':').collect::<Vec<_>>();
                    if pieces.len() != 3 {
                        anyhow::bail!("invalid move segment: {part}");
                    }
                    Ok(editor_service::MoveRequest {
                        id: pieces[0].parse().context("invalid move id")?,
                        x: pieces[1].parse().context("invalid move x")?,
                        y: pieces[2].parse().context("invalid move y")?,
                    })
                })
                .collect::<Result<Vec<_>>>()?;
            let response =
                editor_service::batch_move_map_entities(moves).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-delete" => {
            if args.len() < 3 {
                anyhow::bail!("map-delete requires <id,id,...>");
            }
            let ids = args[2]
                .split(',')
                .filter(|s| !s.trim().is_empty())
                .map(|id| id.parse::<u64>().context("invalid delete id"))
                .collect::<Result<Vec<_>>>()?;
            let response = editor_service::delete_map_entities(ids).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-paint-tile" => {
            if args.len() < 5 {
                anyhow::bail!("map-paint-tile requires <x> <y> <tile_id>");
            }
            let x: i32 = args[2].parse().context("invalid x")?;
            let y: i32 = args[3].parse().context("invalid y")?;
            let tile_id: u16 = args[4].parse().context("invalid tile_id")?;
            let response =
                editor_service::paint_map_tile(x, y, tile_id).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-erase-tile" => {
            if args.len() < 4 {
                anyhow::bail!("map-erase-tile requires <x> <y>");
            }
            let x: i32 = args[2].parse().context("invalid x")?;
            let y: i32 = args[3].parse().context("invalid y")?;
            let response = editor_service::erase_map_tile(x, y).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-undo" => {
            let response = editor_service::undo_map().map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-redo" => {
            let response = editor_service::redo_map().map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-reselect" => {
            let response = editor_service::reselect_map_previous().map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-select" => {
            if args.len() < 3 {
                anyhow::bail!("map-select requires <id,id,...>");
            }
            let ids = args[2]
                .split(',')
                .filter(|s| !s.trim().is_empty())
                .map(|id| id.parse::<u64>().context("invalid selection id"))
                .collect::<Result<Vec<_>>>()?;
            let response = editor_service::select_map_entities(ids).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "map-state" => {
            let response = editor_service::get_editor_state().map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "playtest-enter" => {
            let response = editor_service::enter_playtest().map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "playtest-exit" => {
            let response = editor_service::exit_playtest().map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "playtest-toggle-pause" => {
            let response = editor_service::toggle_playtest_pause().map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "playtest-step" => {
            let response = editor_service::step_playtest_frame().map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "playtest-speed" => {
            if args.len() < 3 {
                anyhow::bail!("playtest-speed requires <speed>");
            }
            let speed: f32 = args[2].parse().context("invalid speed")?;
            let response = editor_service::set_playtest_speed(speed).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "playtest-tick" => {
            if args.len() < 3 {
                anyhow::bail!("playtest-tick requires <delta_ms>");
            }
            let delta_ms: u32 = args[2].parse().context("invalid delta_ms")?;
            let response = editor_service::tick_playtest(delta_ms).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "playtest-trace" => {
            if args.len() < 3 {
                anyhow::bail!("playtest-trace requires <on|off>");
            }
            let enabled = match args[2].to_ascii_lowercase().as_str() {
                "on" | "true" | "1" => true,
                "off" | "false" | "0" => false,
                _ => anyhow::bail!("invalid playtest-trace value, use on/off"),
            };
            let response =
                editor_service::set_playtest_trace(enabled).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "playtest-breakpoints" => {
            if args.len() < 3 {
                anyhow::bail!("playtest-breakpoints requires <kind,kind,...>");
            }
            let kinds = args[2]
                .split(',')
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>();
            let response =
                editor_service::set_playtest_breakpoints(kinds).map_err(anyhow::Error::msg)?;
            serde_json::to_string_pretty(&response)?
        }
        "export-preview" => {
            if args.len() < 3 {
                anyhow::bail!("export-preview requires <output_dir>");
            }
            let output_dir = Path::new(&args[2]);
            let debug = args.iter().any(|arg| arg == "--debug");
            let profile = parse_export_profile_flag(&args)?;
            let response = export_core::build_html5_preview_artifact(
                output_dir,
                &export_core::ExportOptions { debug, profile },
            )
            .with_context(|| {
                format!(
                    "failed to build export preview artifact at {}",
                    output_dir.display()
                )
            })?;
            serde_json::to_string_pretty(&response)?
        }
        "invoke" => {
            if args.len() < 4 {
                anyhow::bail!("invoke requires <command> <json-payload>");
            }
            let invoke_command = args[2].as_str();
            tauri_bridge::invoke_command_json(invoke_command, &args[3])?
        }
        _ => anyhow::bail!("unknown command: {command}"),
    };

    println!("{output}");
    Ok(())
}

fn parse_export_profile_flag(args: &[String]) -> Result<export_core::ExportProfile> {
    if let Some(index) = args.iter().position(|arg| arg == "--profile") {
        if index + 1 >= args.len() {
            anyhow::bail!("--profile requires one of: game_boy, nes, snes");
        }
        let parsed = match args[index + 1].to_ascii_lowercase().as_str() {
            "game_boy" | "gb" => export_core::ExportProfile::GameBoy,
            "nes" => export_core::ExportProfile::Nes,
            "snes" => export_core::ExportProfile::Snes,
            other => anyhow::bail!("invalid --profile value '{other}', expected game_boy|nes|snes"),
        };
        return Ok(parsed);
    }
    Ok(export_core::ExportProfile::GameBoy)
}
