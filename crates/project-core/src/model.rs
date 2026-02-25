use serde::{Deserialize, Serialize};

pub const CURRENT_SCHEMA_VERSION: u32 = 1;
pub const PROJECT_FILE_NAME: &str = "project.json";
pub const BACKUPS_DIR_NAME: &str = "backups";
pub const DEFAULT_MAX_BACKUPS: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectManifest {
    pub project_schema_version: u32,
    pub name: String,
}

impl ProjectManifest {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            project_schema_version: CURRENT_SCHEMA_VERSION,
            name: name.into(),
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("project name must not be empty".to_string());
        }
        if self.project_schema_version == 0 {
            return Err("project_schema_version must be greater than zero".to_string());
        }
        if self.project_schema_version > CURRENT_SCHEMA_VERSION {
            return Err(format!(
                "project_schema_version {} is newer than supported version {}; upgrade the tool first",
                self.project_schema_version, CURRENT_SCHEMA_VERSION
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SaveReport {
    pub project_file_path: std::path::PathBuf,
    pub backup_created: Option<std::path::PathBuf>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecoveryState {
    pub temp_file_present: bool,
    pub backup_count: usize,
    pub latest_backup: Option<std::path::PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct ProjectHealth {
    pub warnings: Vec<String>,
    pub near_limits: Vec<String>,
    pub missing_assets: Vec<std::path::PathBuf>,
    pub trashed_refs: Vec<String>,
}
