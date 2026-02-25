use std::path::Path;

use project_core::{
    load_and_migrate_manifest, load_manifest, migrate_project_in_place, project_health,
    save_manifest_atomic, MigrationReport, MigrationRunner, ProjectError, ProjectHealth,
    ProjectManifest,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenProjectResponse {
    pub manifest: ProjectManifest,
    pub health: ProjectHealth,
    pub migration_report: Option<MigrationReport>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveProjectResponse {
    pub manifest: ProjectManifest,
    pub health: ProjectHealth,
    pub backup_created: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectHealthResponse {
    pub health: ProjectHealth,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrateProjectResponse {
    pub manifest: ProjectManifest,
    pub health: ProjectHealth,
    pub migration_report: MigrationReport,
}

pub fn open_project(
    project_dir: &Path,
    apply_migrations: bool,
) -> Result<OpenProjectResponse, ProjectError> {
    let runner = MigrationRunner::with_defaults();

    if !apply_migrations {
        let (manifest, migration_report) = load_and_migrate_manifest(project_dir, &runner, true)?;
        let health = project_health(project_dir)?;
        return Ok(OpenProjectResponse {
            manifest,
            health,
            migration_report: Some(migration_report),
        });
    }

    let (_, preflight) = load_and_migrate_manifest(project_dir, &runner, true)?;
    let migration_report = if preflight.to_version > preflight.from_version {
        Some(migrate_project_in_place(project_dir, &runner)?)
    } else {
        None
    };

    let manifest = load_manifest(project_dir)?;
    let health = project_health(project_dir)?;
    Ok(OpenProjectResponse {
        manifest,
        health,
        migration_report,
    })
}

pub fn save_project(
    project_dir: &Path,
    manifest: &ProjectManifest,
) -> Result<SaveProjectResponse, ProjectError> {
    let report = save_manifest_atomic(project_dir, manifest)?;
    let loaded = load_manifest(project_dir)?;
    let health = project_health(project_dir)?;
    Ok(SaveProjectResponse {
        manifest: loaded,
        health,
        backup_created: report.backup_created.is_some(),
    })
}

pub fn get_project_health(project_dir: &Path) -> Result<ProjectHealthResponse, ProjectError> {
    Ok(ProjectHealthResponse {
        health: project_health(project_dir)?,
    })
}

pub fn migrate_project(project_dir: &Path) -> Result<MigrateProjectResponse, ProjectError> {
    let runner = MigrationRunner::with_defaults();
    let migration_report = migrate_project_in_place(project_dir, &runner)?;
    let manifest = load_manifest(project_dir)?;
    let health = project_health(project_dir)?;
    Ok(MigrateProjectResponse {
        manifest,
        health,
        migration_report,
    })
}

#[cfg(test)]
mod tests {
    use std::fs;

    use project_core::{save_manifest_atomic, CURRENT_SCHEMA_VERSION, PROJECT_FILE_NAME};

    use crate::editor_service;

    use super::*;

    #[test]
    fn open_project_dry_run_reports_migration_for_legacy_file() {
        let dir = tempfile::tempdir().expect("create temp dir");
        fs::write(
            dir.path().join(PROJECT_FILE_NAME),
            r#"{
  "title": "Legacy Project"
}"#,
        )
        .expect("write legacy manifest");

        let response = open_project(dir.path(), false).expect("open project");
        let report = response
            .migration_report
            .expect("migration report should be present");
        assert_eq!(report.from_version, 0);
        assert_eq!(report.to_version, CURRENT_SCHEMA_VERSION);

        // Dry-run must not mutate on-disk schema yet.
        let raw = fs::read_to_string(dir.path().join(PROJECT_FILE_NAME)).expect("read file");
        assert!(raw.contains("\"title\""));
        assert!(!raw.contains("project_schema_version"));
    }

    #[test]
    fn open_project_with_apply_migrates_and_loads_current_manifest() {
        let dir = tempfile::tempdir().expect("create temp dir");
        fs::write(
            dir.path().join(PROJECT_FILE_NAME),
            r#"{
  "title": "Legacy Project"
}"#,
        )
        .expect("write legacy manifest");

        let response = open_project(dir.path(), true).expect("open and migrate");
        assert_eq!(
            response.manifest.project_schema_version,
            CURRENT_SCHEMA_VERSION
        );
        assert_eq!(response.manifest.name, "Legacy Project");
        assert!(response.migration_report.is_some());
    }

    #[test]
    fn open_project_current_schema_has_no_apply_migration_report() {
        let dir = tempfile::tempdir().expect("create temp dir");
        save_manifest_atomic(dir.path(), &ProjectManifest::new("Current")).expect("save manifest");

        let response = open_project(dir.path(), true).expect("open project");
        assert!(response.migration_report.is_none());
        assert_eq!(response.manifest.name, "Current");
    }

    #[test]
    fn save_project_returns_health_and_backup_flag() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let manifest = ProjectManifest::new("Save Test");

        let first = save_project(dir.path(), &manifest).expect("first save");
        assert!(!first.backup_created);
        assert_eq!(first.manifest.name, "Save Test");

        let second = save_project(dir.path(), &manifest).expect("second save");
        assert!(second.backup_created);
    }

    #[test]
    fn get_project_health_returns_missing_file_warning() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let response = get_project_health(dir.path()).expect("health");
        assert!(response
            .health
            .warnings
            .iter()
            .any(|w| w.contains("project.json is missing")));
    }

    #[test]
    fn migrate_project_applies_legacy_migration() {
        let dir = tempfile::tempdir().expect("create temp dir");
        fs::write(
            dir.path().join(PROJECT_FILE_NAME),
            r#"{
  "title": "Migrate Me"
}"#,
        )
        .expect("write legacy manifest");

        let response = migrate_project(dir.path()).expect("migrate");
        assert_eq!(response.manifest.name, "Migrate Me");
        assert_eq!(response.migration_report.to_version, CURRENT_SCHEMA_VERSION);
        assert!(response.migration_report.rollback_snapshot_path.is_some());
    }

    #[test]
    fn end_to_end_open_edit_undo_redo_save_flow() {
        let _guard = editor_service::test_lock();
        editor_service::reset_runtime();
        let dir = tempfile::tempdir().expect("create temp dir");
        save_manifest_atomic(dir.path(), &ProjectManifest::new("Initial")).expect("seed manifest");

        let opened = open_project(dir.path(), true).expect("open project");
        assert!(!opened.manifest.name.trim().is_empty());

        let created = editor_service::create_map_entity(
            "Player".to_string(),
            4,
            4,
            None,
        )
        .expect("create");
        let id = created.entities[0].id;
        let moved = editor_service::move_map_entity(id, 12, 4).expect("move");
        let moved_entity = moved
            .entities
            .iter()
            .find(|entity| entity.id == id)
            .expect("moved entity");
        assert_eq!(moved_entity.position.x, 12);

        let undone = editor_service::undo_map().expect("undo");
        let undone_entity = undone
            .entities
            .iter()
            .find(|entity| entity.id == id)
            .expect("undone entity");
        assert_eq!(undone_entity.position.x, 4);

        let redone = editor_service::redo_map().expect("redo");
        let redone_entity = redone
            .entities
            .iter()
            .find(|entity| entity.id == id)
            .expect("redone entity");
        assert_eq!(redone_entity.position.x, 12);

        let saved =
            save_project(dir.path(), &ProjectManifest::new("Integrated Flow")).expect("save");
        assert_eq!(saved.manifest.name, "Integrated Flow");
    }
}
