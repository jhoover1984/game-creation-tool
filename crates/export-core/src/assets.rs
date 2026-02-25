use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Component, Path, PathBuf};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use crate::input::InputEditorState;
use crate::types::ExportPreviewScene;
use crate::write_utf8;

// ── Internal asset types ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ExportAssetRecord {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub source: String,
    pub path: String,
}

#[derive(Debug, Clone)]
pub(crate) struct ExportAssetBuild {
    pub record: ExportAssetRecord,
    pub copy_from: Option<PathBuf>,
}

#[derive(Debug, Clone, Default)]
pub(crate) struct AuthoredAssetHints {
    pub tile_sources: BTreeMap<u16, PathBuf>,
    pub entity_sources: BTreeMap<String, PathBuf>,
    pub audio_sources: BTreeMap<String, PathBuf>,
    pub audio_ids: BTreeSet<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
struct ProjectAssetManifest {
    #[serde(default)]
    assets: Vec<ProjectAssetManifestEntry>,
    #[serde(default)]
    tiles: BTreeMap<String, String>,
    #[serde(default)]
    entities: BTreeMap<String, String>,
    #[serde(default)]
    audio: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
struct ProjectAssetManifestEntry {
    #[serde(default)]
    id: String,
    #[serde(default)]
    path: String,
    #[serde(default)]
    kind: String,
}

// ── Asset inference ──────────────────────────────────────────────────

pub(crate) fn infer_assets_from_scenes_and_hints(
    scenes: &[ExportPreviewScene],
    hints: Option<&AuthoredAssetHints>,
) -> Vec<ExportAssetBuild> {
    let mut tile_ids = BTreeSet::new();
    let mut entity_names = BTreeSet::new();
    for scene in scenes {
        for tile in &scene.snapshot.tiles {
            tile_ids.insert(tile.tile_id);
        }
        for entity in &scene.snapshot.entities {
            if !entity.name.trim().is_empty() {
                entity_names.insert(entity.name.clone());
            }
        }
    }

    let mut assets = Vec::new();
    for tile_id in tile_ids {
        let id = format!("tile_{tile_id}");
        let copy_from = hints.and_then(|h| h.tile_sources.get(&tile_id)).cloned();
        let (source, path) = if let Some(src) = copy_from.as_ref() {
            (
                format!("project_asset://tiles/{tile_id}"),
                format!("assets/imported/{id}{}", asset_extension(src)),
            )
        } else if has_starter_tile(tile_id) {
            (
                format!("starter_pack://tiles/{tile_id}"),
                format!("assets/starter/{id}.svg"),
            )
        } else {
            (
                format!("generated://tiles/{tile_id}"),
                format!("assets/generated/{id}.svg"),
            )
        };
        assets.push(ExportAssetBuild {
            record: ExportAssetRecord {
                id,
                kind: "tile".to_string(),
                label: format!("Tile {tile_id}"),
                source,
                path,
            },
            copy_from,
        });
    }
    for entity_name in entity_names {
        let slug = asset_slug(&entity_name);
        let id = format!("entity_{slug}");
        let copy_from = hints.and_then(|h| h.entity_sources.get(&id)).cloned();
        let (source, path) = if let Some(src) = copy_from.as_ref() {
            (
                format!("project_asset://entities/{slug}"),
                format!("assets/imported/{id}{}", asset_extension(src)),
            )
        } else if has_starter_entity(&slug) {
            (
                format!("starter_pack://entities/{slug}"),
                format!("assets/starter/{id}.svg"),
            )
        } else {
            (
                format!("generated://entities/{slug}"),
                format!("assets/generated/{id}.svg"),
            )
        };
        assets.push(ExportAssetBuild {
            record: ExportAssetRecord {
                id,
                kind: "entity_sprite".to_string(),
                label: entity_name,
                source,
                path,
            },
            copy_from,
        });
    }
    if let Some(hints) = hints {
        for audio_id in &hints.audio_ids {
            let Some(source_path) = hints.audio_sources.get(audio_id) else {
                continue;
            };
            if !source_path.is_file() {
                continue;
            }
            assets.push(ExportAssetBuild {
                record: ExportAssetRecord {
                    id: audio_id.clone(),
                    kind: "audio_clip".to_string(),
                    label: audio_id.clone(),
                    source: format!("project_asset://audio/{audio_id}"),
                    path: format!("assets/audio/{audio_id}{}", asset_extension(source_path)),
                },
                copy_from: Some(source_path.clone()),
            });
        }
    }
    assets
}

// ── Asset file writing ───────────────────────────────────────────────

pub(crate) fn write_inferred_asset_files(
    output_dir: &Path,
    assets: &[ExportAssetBuild],
) -> Result<()> {
    let generated_dir = output_dir.join("assets").join("generated");
    fs::create_dir_all(&generated_dir).with_context(|| {
        format!(
            "failed creating inferred asset output dir {}",
            generated_dir.display()
        )
    })?;

    for asset in assets {
        let asset_path = asset.record.path.as_str();
        let kind = asset.record.kind.as_str();
        let id = asset.record.id.as_str();
        let color = match kind {
            "tile" => "#7fbc41",
            "entity_sprite" => "#2f7a4a",
            _ => "#9ca3af",
        };
        let svg = format!(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\" viewBox=\"0 0 8 8\"><rect width=\"8\" height=\"8\" fill=\"{color}\"/><path d=\"M1 1h6v6H1z\" fill=\"none\" stroke=\"#1f2937\" stroke-width=\"1\"/><title>{id}</title></svg>"
        );
        let full_path = output_dir.join(asset_path);
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent).with_context(|| {
                format!(
                    "failed creating inferred asset parent dir {}",
                    parent.display()
                )
            })?;
        }
        if let Some(source_path) = asset.copy_from.as_ref() {
            if source_path.is_file() {
                fs::copy(source_path, &full_path).with_context(|| {
                    format!(
                        "failed copying authored asset {} to {}",
                        source_path.display(),
                        full_path.display()
                    )
                })?;
                continue;
            }
        }
        if asset.record.source.starts_with("starter_pack://") {
            if let Some(svg) = starter_svg_for_asset(&asset.record) {
                write_utf8(&full_path, &svg)?;
                continue;
            }
        }
        write_utf8(&full_path, &svg)?;
    }
    Ok(())
}

// ── Starter pack SVGs ────────────────────────────────────────────────

fn has_starter_tile(tile_id: u16) -> bool {
    matches!(tile_id, 1..=3)
}

fn has_starter_entity(slug: &str) -> bool {
    matches!(slug, "player" | "guide_npc" | "goal_flag")
        || slug.starts_with("tree_prop")
        || slug.starts_with("bush_prop")
        || slug.starts_with("rock_prop")
        || slug.starts_with("crate_prop")
        || slug.starts_with("chest_prop")
}

fn starter_svg_for_asset(asset: &ExportAssetRecord) -> Option<String> {
    if asset.kind == "tile" {
        let tile_id = asset.id.strip_prefix("tile_")?.parse::<u16>().ok()?;
        return starter_tile_svg(tile_id, &asset.id);
    }
    if asset.kind == "entity_sprite" {
        let slug = asset.id.strip_prefix("entity_")?;
        return starter_entity_svg(slug, &asset.id);
    }
    None
}

fn starter_tile_svg(tile_id: u16, title: &str) -> Option<String> {
    let (base, accent, detail) = match tile_id {
        1 => ("#6aa84f", "#81c784", "#4e7f38"),
        2 => ("#4f8fc0", "#69a7d8", "#38698f"),
        3 => ("#b58b54", "#c9a06a", "#8e6b3d"),
        _ => return None,
    };
    Some(format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\" viewBox=\"0 0 8 8\"><rect width=\"8\" height=\"8\" fill=\"{base}\"/><path d=\"M0 5h8v1H0zm0 2h8v1H0z\" fill=\"{accent}\"/><path d=\"M1 1h6v1H1zM1 3h4v1H1z\" fill=\"{detail}\"/><title>{title}</title></svg>"
    ))
}

fn starter_entity_svg(slug: &str, title: &str) -> Option<String> {
    let (base, accent, outline) = if slug == "player" {
        ("#2f6fb1", "#f5d08a", "#133657")
    } else if slug == "guide_npc" {
        ("#7a5ea8", "#f0d4a3", "#3f2f5c")
    } else if slug == "goal_flag" {
        ("#e1c542", "#b73f3f", "#5f4a19")
    } else if slug.starts_with("tree_prop") {
        ("#3d8a4f", "#76b05a", "#1d4d2b")
    } else if slug.starts_with("bush_prop") {
        ("#4f9952", "#78ba62", "#2a5e31")
    } else if slug.starts_with("rock_prop") {
        ("#7c8794", "#a1a9b3", "#4e5763")
    } else if slug.starts_with("crate_prop") {
        ("#9c6a3f", "#c48a52", "#5f3c22")
    } else if slug.starts_with("chest_prop") {
        ("#8a5b2a", "#d2b24c", "#4a3018")
    } else {
        return None;
    };

    let body = if slug == "goal_flag" {
        "<path d=\"M1 1h1v6H1z\" fill=\"#d9d9d9\"/><path d=\"M2 1h4l-1 1 1 1H2z\" fill=\"#b73f3f\"/>"
    } else if slug.starts_with("tree_prop") {
        "<rect x=\"3\" y=\"5\" width=\"2\" height=\"3\" fill=\"#5a3e22\"/><rect x=\"1\" y=\"1\" width=\"6\" height=\"5\" fill=\"#4f9952\"/>"
    } else if slug.starts_with("bush_prop") {
        "<rect x=\"1\" y=\"3\" width=\"6\" height=\"4\" fill=\"#4f9952\"/><rect x=\"2\" y=\"2\" width=\"4\" height=\"2\" fill=\"#78ba62\"/>"
    } else if slug.starts_with("rock_prop") {
        "<path d=\"M1 4l2-2h3l1 1v3H1z\" fill=\"#8f98a3\"/>"
    } else if slug.starts_with("crate_prop") {
        "<rect x=\"1\" y=\"1\" width=\"6\" height=\"6\" fill=\"#b27745\"/><path d=\"M1 1l6 6M7 1L1 7\" stroke=\"#6b4427\" stroke-width=\"0.8\"/>"
    } else if slug.starts_with("chest_prop") {
        "<rect x=\"1\" y=\"3\" width=\"6\" height=\"4\" fill=\"#9c6a3f\"/><rect x=\"1\" y=\"2\" width=\"6\" height=\"2\" fill=\"#c9a14c\"/><rect x=\"3\" y=\"4\" width=\"2\" height=\"2\" fill=\"#f1d36b\"/>"
    } else {
        "<rect x=\"2\" y=\"1\" width=\"4\" height=\"3\" fill=\"#f0d4a3\"/><rect x=\"2\" y=\"4\" width=\"4\" height=\"3\" fill=\"#2f6fb1\"/>"
    };

    Some(format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\" viewBox=\"0 0 8 8\"><rect width=\"8\" height=\"8\" fill=\"{base}\"/><rect x=\"0\" y=\"0\" width=\"8\" height=\"2\" fill=\"{accent}\"/>{body}<rect x=\"0.5\" y=\"0.5\" width=\"7\" height=\"7\" fill=\"none\" stroke=\"{outline}\" stroke-width=\"1\"/><title>{title}</title></svg>"
    ))
}

// ── Authored asset hint collection ───────────────────────────────────

pub(crate) fn collect_authored_asset_hints(
    editor_state: &serde_json::Value,
    project_dir: Option<&Path>,
) -> AuthoredAssetHints {
    let parsed: InputEditorState = serde_json::from_value(editor_state.clone()).unwrap_or_default();
    let mut hints = AuthoredAssetHints::default();
    for tile in parsed.tiles {
        if tile.tile_id == 0 {
            continue;
        }
        let Some(path) = tile.asset_path.as_deref() else {
            continue;
        };
        let Some(resolved) = project_dir.and_then(|dir| resolve_project_asset_path(dir, path)) else {
            continue;
        };
        hints.tile_sources.entry(tile.tile_id).or_insert(resolved);
    }
    for entity in parsed.entities {
        let Some(path) = entity.asset_path.as_deref() else {
            continue;
        };
        let Some(resolved) = project_dir.and_then(|dir| resolve_project_asset_path(dir, path)) else {
            continue;
        };
        let slug = asset_slug(&entity.name);
        let id = format!("entity_{slug}");
        hints.entity_sources.entry(id).or_insert(resolved);
    }
    for (index, clip) in parsed.audio.into_iter().enumerate() {
        let id = normalize_audio_asset_key(&clip.id, &clip.name, index);
        hints.audio_ids.insert(id.clone());
        let Some(path) = clip.asset_path.as_deref() else {
            continue;
        };
        let Some(resolved) = project_dir.and_then(|dir| resolve_project_asset_path(dir, path)) else {
            continue;
        };
        hints.audio_sources.entry(id).or_insert(resolved);
    }
    hints
}

// ── Audio binding collection ─────────────────────────────────────────

pub(crate) fn collect_authored_audio_bindings(
    editor_state: &serde_json::Value,
) -> BTreeMap<String, String> {
    let parsed: InputEditorState = serde_json::from_value(editor_state.clone()).unwrap_or_default();
    let mut bindings = BTreeMap::new();

    for (event, target) in parsed.audio_bindings {
        let Some(event_key) = normalize_audio_binding_event_key(&event) else {
            continue;
        };
        let Some(audio_id) = normalize_audio_binding_target(&target) else {
            continue;
        };
        bindings.insert(event_key, audio_id);
    }

    for binding in parsed.audio_events {
        let Some(event_key) = normalize_audio_binding_event_key(&binding.event) else {
            continue;
        };
        let Some(audio_id) = normalize_audio_binding_target(&binding.audio_id) else {
            continue;
        };
        bindings.entry(event_key).or_insert(audio_id);
    }

    bindings
}

// ── Hint merging ─────────────────────────────────────────────────────

pub(crate) fn merge_authored_asset_hints(
    project_hints: Option<&AuthoredAssetHints>,
    state_hints: Option<&AuthoredAssetHints>,
) -> AuthoredAssetHints {
    let mut merged = project_hints.cloned().unwrap_or_default();
    if let Some(state) = state_hints {
        // Explicit editor-state paths override convention-based project discovery.
        for (tile_id, path) in &state.tile_sources {
            merged.tile_sources.insert(*tile_id, path.clone());
        }
        for (entity_id, path) in &state.entity_sources {
            merged
                .entity_sources
                .insert(entity_id.clone(), path.clone());
        }
        for (audio_id, path) in &state.audio_sources {
            merged.audio_sources.insert(audio_id.clone(), path.clone());
        }
        for audio_id in &state.audio_ids {
            merged.audio_ids.insert(audio_id.clone());
        }
    }
    merged
}

// ── Project asset discovery ──────────────────────────────────────────

pub(crate) fn collect_project_asset_hints(
    project_dir: &Path,
    scenes: &[ExportPreviewScene],
    requested_audio_ids: Option<&BTreeSet<String>>,
) -> AuthoredAssetHints {
    let mut tile_ids = BTreeSet::new();
    let mut entity_names = BTreeSet::new();
    for scene in scenes {
        for tile in &scene.snapshot.tiles {
            if tile.tile_id > 0 {
                tile_ids.insert(tile.tile_id);
            }
        }
        for entity in &scene.snapshot.entities {
            if !entity.name.trim().is_empty() {
                entity_names.insert(entity.name.clone());
            }
        }
    }

    let manifest_hints = read_project_asset_manifest_hints(project_dir);
    let mut hints = AuthoredAssetHints::default();
    for tile_id in tile_ids {
        if let Some(path) = manifest_hints.tile_sources.get(&tile_id) {
            hints.tile_sources.insert(tile_id, path.clone());
            continue;
        }
        if let Some(path) = find_project_tile_asset(project_dir, tile_id) {
            hints.tile_sources.insert(tile_id, path);
        }
    }
    for entity_name in entity_names {
        let slug = asset_slug(&entity_name);
        let entity_id = format!("entity_{slug}");
        if let Some(path) = manifest_hints.entity_sources.get(&entity_id) {
            hints.entity_sources.insert(entity_id, path.clone());
            continue;
        }
        if let Some(path) = find_project_entity_asset(project_dir, &slug) {
            hints.entity_sources.insert(entity_id, path);
        }
    }
    for audio_id in requested_audio_ids.into_iter().flatten() {
        hints.audio_ids.insert(audio_id.clone());
        if let Some(path) = manifest_hints.audio_sources.get(audio_id) {
            hints.audio_sources.insert(audio_id.clone(), path.clone());
            continue;
        }
        if let Some(path) = find_project_audio_asset(project_dir, audio_id) {
            hints.audio_sources.insert(audio_id.clone(), path);
        }
    }
    hints
}

fn read_project_asset_manifest_hints(project_dir: &Path) -> AuthoredAssetHints {
    let manifest_path = project_dir.join("assets").join("manifest.json");
    if !manifest_path.is_file() {
        return AuthoredAssetHints::default();
    }
    let raw = match fs::read_to_string(&manifest_path) {
        Ok(value) => value,
        Err(_) => return AuthoredAssetHints::default(),
    };
    let manifest: ProjectAssetManifest = match serde_json::from_str(&raw) {
        Ok(value) => value,
        Err(_) => return AuthoredAssetHints::default(),
    };
    let mut hints = AuthoredAssetHints::default();

    for (key, path) in manifest.tiles {
        let Some(tile_id) = parse_manifest_tile_key(&key) else {
            continue;
        };
        let Some(resolved) = resolve_project_asset_path(project_dir, &path) else {
            continue;
        };
        hints.tile_sources.entry(tile_id).or_insert(resolved);
    }
    for (key, path) in manifest.entities {
        let entity_id = normalize_manifest_entity_key(&key);
        let Some(resolved) = resolve_project_asset_path(project_dir, &path) else {
            continue;
        };
        hints.entity_sources.entry(entity_id).or_insert(resolved);
    }
    for (key, path) in manifest.audio {
        let audio_id = normalize_manifest_audio_key(&key);
        let Some(resolved) = resolve_project_asset_path(project_dir, &path) else {
            continue;
        };
        hints.audio_sources.entry(audio_id).or_insert(resolved);
    }
    for entry in manifest.assets {
        if entry.id.trim().is_empty() || entry.path.trim().is_empty() {
            continue;
        }
        let Some(resolved) = resolve_project_asset_path(project_dir, &entry.path) else {
            continue;
        };
        if let Some(tile_id) = parse_manifest_tile_key(&entry.id) {
            hints.tile_sources.entry(tile_id).or_insert(resolved);
            continue;
        }
        if entry.kind.eq_ignore_ascii_case("audio")
            || entry.id.trim().to_ascii_lowercase().starts_with("audio_")
        {
            let audio_id = normalize_manifest_audio_key(&entry.id);
            hints.audio_sources.entry(audio_id).or_insert(resolved);
            continue;
        }
        let entity_id = normalize_manifest_entity_key(&entry.id);
        hints.entity_sources.entry(entity_id).or_insert(resolved);
    }

    hints
}

// ── Path / naming utilities ──────────────────────────────────────────

fn parse_manifest_tile_key(key: &str) -> Option<u16> {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Some(suffix) = trimmed.strip_prefix("tile_") {
        return suffix.parse::<u16>().ok();
    }
    trimmed.parse::<u16>().ok()
}

fn normalize_manifest_entity_key(key: &str) -> String {
    let trimmed = key.trim();
    if trimmed.starts_with("entity_") {
        return trimmed.to_string();
    }
    format!("entity_{}", asset_slug(trimmed))
}

fn normalize_manifest_audio_key(key: &str) -> String {
    let trimmed = key.trim();
    if trimmed.starts_with("audio_") {
        return trimmed.to_string();
    }
    format!("audio_{}", asset_slug(trimmed))
}

fn normalize_audio_asset_key(id: &str, name: &str, index: usize) -> String {
    let id_trimmed = id.trim();
    if !id_trimmed.is_empty() {
        return normalize_manifest_audio_key(id_trimmed);
    }
    let name_trimmed = name.trim();
    if !name_trimmed.is_empty() {
        return format!("audio_{}", asset_slug(name_trimmed));
    }
    format!("audio_clip_{}", index + 1)
}

fn normalize_audio_binding_event_key(raw: &str) -> Option<String> {
    let lower = raw.trim().to_ascii_lowercase();
    if lower.is_empty() {
        return None;
    }
    let normalized = lower
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '_' })
        .collect::<String>();
    let compact = normalized.trim_matches('_').to_string();
    if compact.is_empty() {
        None
    } else {
        Some(compact)
    }
}

fn normalize_audio_binding_target(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(normalize_manifest_audio_key(trimmed))
}

fn resolve_project_asset_path(project_dir: &Path, raw_path: &str) -> Option<PathBuf> {
    let trimmed = raw_path.trim();
    if trimmed.is_empty() {
        return None;
    }
    let candidate = if let Some(rest) = trimmed.strip_prefix("file://") {
        let normalized = if cfg!(windows) {
            rest.strip_prefix('/').unwrap_or(rest)
        } else {
            rest
        };
        PathBuf::from(normalized)
    } else {
        PathBuf::from(trimmed)
    };
    if candidate.is_absolute() {
        if candidate.starts_with(project_dir) {
            return Some(candidate);
        }
        return None;
    }
    if candidate
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return None;
    }
    Some(project_dir.join(candidate))
}


fn find_project_tile_asset(project_dir: &Path, tile_id: u16) -> Option<PathBuf> {
    let mut candidates = Vec::new();
    for ext in ["png", "jpg", "jpeg", "webp", "gif", "svg"] {
        candidates.push(
            project_dir
                .join("assets")
                .join("tiles")
                .join(format!("tile_{tile_id}.{ext}")),
        );
        candidates.push(
            project_dir
                .join("assets")
                .join("tiles")
                .join(format!("{tile_id}.{ext}")),
        );
        candidates.push(
            project_dir
                .join("assets")
                .join("sprites")
                .join(format!("tile_{tile_id}.{ext}")),
        );
    }
    first_existing_file(candidates)
}

fn find_project_entity_asset(project_dir: &Path, slug: &str) -> Option<PathBuf> {
    let mut candidates = Vec::new();
    for ext in ["png", "jpg", "jpeg", "webp", "gif", "svg"] {
        candidates.push(
            project_dir
                .join("assets")
                .join("entities")
                .join(format!("{slug}.{ext}")),
        );
        candidates.push(
            project_dir
                .join("assets")
                .join("entities")
                .join(format!("entity_{slug}.{ext}")),
        );
        candidates.push(
            project_dir
                .join("assets")
                .join("sprites")
                .join(format!("{slug}.{ext}")),
        );
        candidates.push(
            project_dir
                .join("assets")
                .join("sprites")
                .join(format!("entity_{slug}.{ext}")),
        );
    }
    first_existing_file(candidates)
}

fn find_project_audio_asset(project_dir: &Path, audio_id: &str) -> Option<PathBuf> {
    let slug = audio_id.strip_prefix("audio_").unwrap_or(audio_id);
    let mut candidates = Vec::new();
    for ext in ["ogg", "wav", "mp3", "flac", "m4a"] {
        candidates.push(
            project_dir
                .join("assets")
                .join("audio")
                .join(format!("{slug}.{ext}")),
        );
        candidates.push(
            project_dir
                .join("assets")
                .join("audio")
                .join(format!("{audio_id}.{ext}")),
        );
        candidates.push(project_dir.join("audio").join(format!("{slug}.{ext}")));
        candidates.push(project_dir.join("music").join(format!("{slug}.{ext}")));
    }
    first_existing_file(candidates)
}

fn first_existing_file(candidates: Vec<PathBuf>) -> Option<PathBuf> {
    candidates.into_iter().find(|path| path.is_file())
}

pub(crate) fn asset_extension(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
    {
        Some(ref ext) if ext == "png" => ".png",
        Some(ref ext) if ext == "jpg" => ".jpg",
        Some(ref ext) if ext == "jpeg" => ".jpeg",
        Some(ref ext) if ext == "webp" => ".webp",
        Some(ref ext) if ext == "gif" => ".gif",
        Some(ref ext) if ext == "svg" => ".svg",
        Some(ref ext) if ext == "wav" => ".wav",
        Some(ref ext) if ext == "mp3" => ".mp3",
        Some(ref ext) if ext == "ogg" => ".ogg",
        _ => ".bin",
    }
}

pub(crate) fn asset_slug(input: &str) -> String {
    let mut out = String::new();
    let mut prev_underscore = false;
    for ch in input.chars() {
        let lowered = ch.to_ascii_lowercase();
        if lowered.is_ascii_alphanumeric() {
            out.push(lowered);
            prev_underscore = false;
        } else if !prev_underscore {
            out.push('_');
            prev_underscore = true;
        }
    }
    let trimmed = out.trim_matches('_').to_string();
    if trimmed.is_empty() {
        "unnamed".to_string()
    } else {
        trimmed
    }
}
