mod error;
mod migration;
mod model;
mod storage;

pub use error::ProjectError;
pub use migration::{schema_version, MigrationReport, MigrationRunner, MigrationStep};
pub use model::{
    ProjectHealth, ProjectManifest, RecoveryState, SaveReport, BACKUPS_DIR_NAME,
    CURRENT_SCHEMA_VERSION, DEFAULT_MAX_BACKUPS, PROJECT_FILE_NAME,
};
pub use storage::{
    is_current_schema, load_and_migrate_manifest, load_manifest, migrate_project_in_place,
    project_health, recovery_state, restore_latest_backup, save_manifest_atomic,
    save_manifest_atomic_with_limit,
};

#[cfg(test)]
mod tests {
    use std::fs;

    use serde_json::json;

    use super::*;

    #[test]
    fn manifest_validation_rejects_empty_name() {
        let manifest = ProjectManifest {
            project_schema_version: CURRENT_SCHEMA_VERSION,
            name: "   ".to_string(),
        };
        assert!(manifest.validate().is_err());
    }

    #[test]
    fn manifest_validation_rejects_future_schema_version() {
        let manifest = ProjectManifest {
            project_schema_version: CURRENT_SCHEMA_VERSION + 1,
            name: "Future Project".to_string(),
        };
        let error = manifest.validate().expect_err("future schema should fail");
        assert!(error.contains("newer than supported version"));
    }

    #[test]
    fn atomic_save_and_load_roundtrip() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let manifest = ProjectManifest::new("Test Project");

        let report = save_manifest_atomic(dir.path(), &manifest).expect("save manifest");
        assert!(report.project_file_path.exists());
        assert!(report.backup_created.is_none());

        let loaded = load_manifest(dir.path()).expect("load manifest");
        assert_eq!(loaded, manifest);
    }

    #[test]
    fn second_save_creates_backup() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let manifest = ProjectManifest::new("Test Project");

        save_manifest_atomic(dir.path(), &manifest).expect("initial save");
        let report = save_manifest_atomic(dir.path(), &manifest).expect("second save");

        let backup = report.backup_created.expect("backup path should exist");
        assert!(backup.exists());
    }

    #[test]
    fn backup_rotation_keeps_only_configured_count() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let manifest = ProjectManifest::new("Rotation Test");

        save_manifest_atomic(dir.path(), &manifest).expect("initial save");
        for _ in 0..5 {
            save_manifest_atomic_with_limit(dir.path(), &manifest, 2).expect("rotating save");
        }

        let backup_dir = dir.path().join(BACKUPS_DIR_NAME);
        let backup_count = fs::read_dir(backup_dir)
            .expect("read backup dir")
            .filter_map(Result::ok)
            .count();
        assert!(
            backup_count <= 2,
            "expected <=2 backups, got {backup_count}"
        );
    }

    #[test]
    fn max_backups_zero_disables_backup_creation() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let manifest = ProjectManifest::new("No Backups");

        save_manifest_atomic_with_limit(dir.path(), &manifest, 0).expect("initial save");
        let report =
            save_manifest_atomic_with_limit(dir.path(), &manifest, 0).expect("second save");

        assert!(report.backup_created.is_none());
        assert!(!dir.path().join(BACKUPS_DIR_NAME).exists());
    }

    #[test]
    fn migration_v0_to_v1_sets_defaults() {
        let runner = MigrationRunner::with_defaults();
        let input = json!({
            "title": "Legacy Title"
        });

        let (output, report) = runner
            .migrate_to_current(input, true)
            .expect("migration should succeed");
        assert_eq!(report.from_version, 0);
        assert_eq!(report.to_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(output["name"], "Legacy Title");
        assert_eq!(output["project_schema_version"], CURRENT_SCHEMA_VERSION);
    }

    #[test]
    fn load_and_migrate_manifest_reads_legacy_document() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let project_file = dir.path().join(PROJECT_FILE_NAME);
        fs::write(
            &project_file,
            r#"{
  "title": "Legacy Project"
}"#,
        )
        .expect("write project file");

        let runner = MigrationRunner::with_defaults();
        let (manifest, report) =
            load_and_migrate_manifest(dir.path(), &runner, true).expect("load and migrate");

        assert_eq!(manifest.name, "Legacy Project");
        assert_eq!(manifest.project_schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(report.from_version, 0);
        assert_eq!(report.to_version, CURRENT_SCHEMA_VERSION);
        assert!(report.changed_files.is_empty());
        assert!(report.rollback_snapshot_path.is_none());
    }

    #[test]
    fn recovery_state_reports_backups() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let manifest = ProjectManifest::new("Recovery Test");
        save_manifest_atomic(dir.path(), &manifest).expect("initial save");
        save_manifest_atomic(dir.path(), &manifest).expect("backup-creating save");

        let state = recovery_state(dir.path()).expect("recovery state");
        assert!(!state.temp_file_present);
        assert!(state.backup_count >= 1);
        assert!(state.latest_backup.is_some());
    }

    #[test]
    fn restore_latest_backup_recovers_project_file() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let manifest = ProjectManifest::new("Restore Test");
        save_manifest_atomic(dir.path(), &manifest).expect("initial save");
        save_manifest_atomic(dir.path(), &manifest).expect("backup save");

        let project_file = dir.path().join(PROJECT_FILE_NAME);
        fs::remove_file(&project_file).expect("remove project file");

        let restored = restore_latest_backup(dir.path()).expect("restore backup");
        assert!(restored.is_some());
        assert!(project_file.exists());

        let loaded = load_manifest(dir.path()).expect("load restored file");
        assert_eq!(loaded.name, "Restore Test");
    }

    #[test]
    fn migrate_project_in_place_creates_snapshot_and_updates_file() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let project_file = dir.path().join(PROJECT_FILE_NAME);
        fs::write(
            &project_file,
            r#"{
  "title": "Legacy Project"
}"#,
        )
        .expect("write legacy project file");

        let report = migrate_project_in_place(dir.path(), &MigrationRunner::with_defaults())
            .expect("migrate");
        assert_eq!(report.from_version, 0);
        assert_eq!(report.to_version, CURRENT_SCHEMA_VERSION);
        assert!(!report.changed_files.is_empty());
        assert!(report.rollback_snapshot_path.is_some());

        let loaded = load_manifest(dir.path()).expect("load migrated project");
        assert_eq!(loaded.name, "Legacy Project");
        assert_eq!(loaded.project_schema_version, CURRENT_SCHEMA_VERSION);
    }

    #[test]
    fn project_health_warns_when_assets_dir_missing() {
        let dir = tempfile::tempdir().expect("create temp dir");
        save_manifest_atomic(dir.path(), &ProjectManifest::new("Health Test"))
            .expect("save manifest");

        let health = project_health(dir.path()).expect("project health");
        assert!(health
            .warnings
            .iter()
            .any(|w| w.contains("assets directory")));
    }
}
