use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

use crate::error::ProjectError;
use crate::migration::{MigrationReport, MigrationRunner};
use crate::model::{
    ProjectHealth, ProjectManifest, RecoveryState, SaveReport, BACKUPS_DIR_NAME,
    CURRENT_SCHEMA_VERSION, DEFAULT_MAX_BACKUPS, PROJECT_FILE_NAME,
};

pub fn load_manifest(project_dir: &Path) -> Result<ProjectManifest, ProjectError> {
    let project_file = project_dir.join(PROJECT_FILE_NAME);
    if !project_file.exists() {
        return Err(ProjectError::ProjectFileMissing(project_file));
    }

    let raw = fs::read_to_string(&project_file).map_err(|source| ProjectError::Io {
        path: project_file.clone(),
        source,
    })?;
    let manifest: ProjectManifest =
        serde_json::from_str(&raw).map_err(|source| ProjectError::Parse {
            path: project_file.clone(),
            source,
        })?;
    manifest.validate().map_err(ProjectError::InvalidManifest)?;
    Ok(manifest)
}

pub fn save_manifest_atomic(
    project_dir: &Path,
    manifest: &ProjectManifest,
) -> Result<SaveReport, ProjectError> {
    save_manifest_atomic_with_limit(project_dir, manifest, DEFAULT_MAX_BACKUPS)
}

pub fn save_manifest_atomic_with_limit(
    project_dir: &Path,
    manifest: &ProjectManifest,
    max_backups: usize,
) -> Result<SaveReport, ProjectError> {
    manifest.validate().map_err(ProjectError::InvalidManifest)?;
    fs::create_dir_all(project_dir).map_err(|source| ProjectError::Io {
        path: project_dir.to_path_buf(),
        source,
    })?;

    let project_file = project_dir.join(PROJECT_FILE_NAME);
    let temp_file = project_dir.join(format!("{PROJECT_FILE_NAME}.tmp"));
    let backup_created = create_backup_if_exists(project_dir, &project_file, max_backups)?;

    let json = serde_json::to_string_pretty(manifest).map_err(|source| ProjectError::Parse {
        path: project_file.clone(),
        source,
    })?;

    let mut file = File::create(&temp_file).map_err(|source| ProjectError::Io {
        path: temp_file.clone(),
        source,
    })?;
    file.write_all(json.as_bytes())
        .and_then(|_| file.flush())
        .and_then(|_| file.sync_all())
        .map_err(|source| ProjectError::Io {
            path: temp_file.clone(),
            source,
        })?;

    fs::rename(&temp_file, &project_file).map_err(|source| ProjectError::Io {
        path: project_file.clone(),
        source,
    })?;

    Ok(SaveReport {
        project_file_path: project_file,
        backup_created,
    })
}

pub fn load_and_migrate_manifest(
    project_dir: &Path,
    runner: &MigrationRunner,
    dry_run: bool,
) -> Result<(ProjectManifest, MigrationReport), ProjectError> {
    let project_file = project_dir.join(PROJECT_FILE_NAME);
    if !project_file.exists() {
        return Err(ProjectError::ProjectFileMissing(project_file));
    }

    let raw = fs::read_to_string(&project_file).map_err(|source| ProjectError::Io {
        path: project_file.clone(),
        source,
    })?;
    let value: serde_json::Value =
        serde_json::from_str(&raw).map_err(|source| ProjectError::Parse {
            path: project_file.clone(),
            source,
        })?;
    let (migrated, report) = runner.migrate_to_current(value, dry_run)?;
    let manifest: ProjectManifest =
        serde_json::from_value(migrated).map_err(|source| ProjectError::Parse {
            path: project_file,
            source,
        })?;
    manifest.validate().map_err(ProjectError::InvalidManifest)?;
    Ok((manifest, report))
}

pub fn migrate_project_in_place(
    project_dir: &Path,
    runner: &MigrationRunner,
) -> Result<MigrationReport, ProjectError> {
    let project_file = project_dir.join(PROJECT_FILE_NAME);
    if !project_file.exists() {
        return Err(ProjectError::ProjectFileMissing(project_file));
    }

    let raw = fs::read_to_string(&project_file).map_err(|source| ProjectError::Io {
        path: project_file.clone(),
        source,
    })?;
    let value: serde_json::Value =
        serde_json::from_str(&raw).map_err(|source| ProjectError::Parse {
            path: project_file.clone(),
            source,
        })?;

    let current_version = crate::migration::schema_version(&value);
    if current_version >= CURRENT_SCHEMA_VERSION {
        return Ok(MigrationReport {
            from_version: current_version,
            to_version: current_version,
            applied_steps: Vec::new(),
            changed_files: Vec::new(),
            warnings: Vec::new(),
            rollback_snapshot_path: None,
            dry_run: false,
        });
    }

    fs::create_dir_all(project_dir).map_err(|source| ProjectError::Io {
        path: project_dir.to_path_buf(),
        source,
    })?;

    let rollback_snapshot_path = create_migration_snapshot(project_dir, &project_file)?;
    let (migrated, mut report) = runner.migrate_to_current(value, false)?;
    let migrated_manifest: ProjectManifest =
        serde_json::from_value(migrated).map_err(|source| ProjectError::Parse {
            path: project_file.clone(),
            source,
        })?;
    save_manifest_atomic(project_dir, &migrated_manifest)?;

    report.changed_files.push(project_file);
    report.rollback_snapshot_path = Some(rollback_snapshot_path);
    Ok(report)
}

fn create_backup_if_exists(
    project_dir: &Path,
    project_file: &Path,
    max_backups: usize,
) -> Result<Option<PathBuf>, ProjectError> {
    // Explicit contract: max_backups=0 disables backup creation entirely.
    if max_backups == 0 {
        return Ok(None);
    }

    if !project_file.exists() {
        return Ok(None);
    }

    let backup_dir = project_dir.join(BACKUPS_DIR_NAME);
    fs::create_dir_all(&backup_dir).map_err(|source| ProjectError::Io {
        path: backup_dir.clone(),
        source,
    })?;

    let stamp_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let backup_path = backup_dir.join(format!("project-{stamp_ms}-{}.json", Uuid::new_v4()));

    fs::copy(project_file, &backup_path).map_err(|source| ProjectError::Io {
        path: backup_path.clone(),
        source,
    })?;
    prune_backup_dir(&backup_dir, max_backups)?;
    Ok(Some(backup_path))
}

pub fn is_current_schema(manifest: &ProjectManifest) -> bool {
    manifest.project_schema_version == CURRENT_SCHEMA_VERSION
}

pub fn recovery_state(project_dir: &Path) -> Result<RecoveryState, ProjectError> {
    let temp_file_present = project_dir
        .join(format!("{PROJECT_FILE_NAME}.tmp"))
        .exists();
    let backup_dir = project_dir.join(BACKUPS_DIR_NAME);
    let backups = list_backups(&backup_dir)?;
    let latest_backup = backups.last().cloned();

    Ok(RecoveryState {
        temp_file_present,
        backup_count: backups.len(),
        latest_backup,
    })
}

pub fn restore_latest_backup(project_dir: &Path) -> Result<Option<PathBuf>, ProjectError> {
    let project_file = project_dir.join(PROJECT_FILE_NAME);
    let backup_dir = project_dir.join(BACKUPS_DIR_NAME);
    let backups = list_backups(&backup_dir)?;
    let Some(latest) = backups.last() else {
        return Ok(None);
    };

    fs::copy(latest, &project_file).map_err(|source| ProjectError::Io {
        path: project_file.clone(),
        source,
    })?;
    Ok(Some(latest.clone()))
}

pub fn project_health(project_dir: &Path) -> Result<ProjectHealth, ProjectError> {
    let project_file = project_dir.join(PROJECT_FILE_NAME);
    let mut health = ProjectHealth::default();

    if project_dir
        .join(format!("{PROJECT_FILE_NAME}.tmp"))
        .exists()
    {
        health
            .warnings
            .push("incomplete save temp file detected".to_string());
    }

    if !project_file.exists() {
        health
            .warnings
            .push("project.json is missing; project cannot load".to_string());
        return Ok(health);
    }

    let raw = fs::read_to_string(&project_file).map_err(|source| ProjectError::Io {
        path: project_file.clone(),
        source,
    })?;
    let value: serde_json::Value =
        serde_json::from_str(&raw).map_err(|source| ProjectError::Parse {
            path: project_file.clone(),
            source,
        })?;

    let version = crate::migration::schema_version(&value);
    if version < CURRENT_SCHEMA_VERSION {
        health.warnings.push(format!(
            "project schema is outdated ({} < {}), migration required",
            version, CURRENT_SCHEMA_VERSION
        ));
    }

    let assets_dir = project_dir.join("assets");
    if !assets_dir.exists() {
        health
            .warnings
            .push("assets directory is missing".to_string());
    }

    Ok(health)
}

fn create_migration_snapshot(
    project_dir: &Path,
    project_file: &Path,
) -> Result<PathBuf, ProjectError> {
    let backup_dir = project_dir.join(BACKUPS_DIR_NAME).join("migrations");
    fs::create_dir_all(&backup_dir).map_err(|source| ProjectError::Io {
        path: backup_dir.clone(),
        source,
    })?;

    let stamp_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let snapshot_path = backup_dir.join(format!(
        "project-pre-migration-{stamp_ms}-{}.json",
        Uuid::new_v4()
    ));

    fs::copy(project_file, &snapshot_path).map_err(|source| ProjectError::Io {
        path: snapshot_path.clone(),
        source,
    })?;
    Ok(snapshot_path)
}

fn prune_backup_dir(backup_dir: &Path, max_backups: usize) -> Result<(), ProjectError> {
    debug_assert!(
        max_backups > 0,
        "max_backups=0 should short-circuit before pruning"
    );
    if max_backups == 0 {
        return Ok(());
    }

    let mut files = fs::read_dir(backup_dir)
        .map_err(|source| ProjectError::Io {
            path: backup_dir.to_path_buf(),
            source,
        })?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "json"))
        .collect::<Vec<_>>();

    if files.len() <= max_backups {
        return Ok(());
    }

    files.sort_by_key(|entry| {
        entry
            .metadata()
            .and_then(|m| m.modified())
            .unwrap_or(UNIX_EPOCH)
    });

    let remove_count = files.len() - max_backups;
    for entry in files.into_iter().take(remove_count) {
        let path = entry.path();
        fs::remove_file(&path).map_err(|source| ProjectError::Io { path, source })?;
    }

    Ok(())
}

fn list_backups(backup_dir: &Path) -> Result<Vec<PathBuf>, ProjectError> {
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut files = fs::read_dir(backup_dir)
        .map_err(|source| ProjectError::Io {
            path: backup_dir.to_path_buf(),
            source,
        })?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "json"))
        .map(|entry| entry.path())
        .collect::<Vec<_>>();

    files.sort_by_key(|path| {
        fs::metadata(path)
            .and_then(|m| m.modified())
            .unwrap_or(UNIX_EPOCH)
    });
    Ok(files)
}
