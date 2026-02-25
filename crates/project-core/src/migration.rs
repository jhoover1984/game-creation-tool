use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::error::ProjectError;
use crate::model::CURRENT_SCHEMA_VERSION;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MigrationReport {
    pub from_version: u32,
    pub to_version: u32,
    pub applied_steps: Vec<String>,
    pub changed_files: Vec<PathBuf>,
    pub warnings: Vec<String>,
    pub rollback_snapshot_path: Option<PathBuf>,
    pub dry_run: bool,
}

pub trait MigrationStep: Send + Sync {
    #[allow(clippy::wrong_self_convention)]
    fn from_version(&self) -> u32;
    fn to_version(&self) -> u32;
    fn apply(&self, input: Value) -> Result<Value, ProjectError>;
}

#[derive(Default)]
pub struct MigrationRunner {
    steps: Vec<Box<dyn MigrationStep>>,
}

impl MigrationRunner {
    pub fn with_defaults() -> Self {
        let mut runner = Self::default();
        runner.register(Box::new(V0ToV1Migration));
        runner
    }

    pub fn register(&mut self, step: Box<dyn MigrationStep>) {
        let key = step.from_version();
        let insert_at = self
            .steps
            .binary_search_by_key(&key, |s| s.from_version())
            .unwrap_or_else(|idx| idx);
        self.steps.insert(insert_at, step);
    }

    pub fn migrate_to_current(
        &self,
        value: Value,
        dry_run: bool,
    ) -> Result<(Value, MigrationReport), ProjectError> {
        let start_version = schema_version(&value);
        let mut current = value;
        let mut applied_steps = Vec::new();

        while schema_version(&current) < CURRENT_SCHEMA_VERSION {
            let from = schema_version(&current);
            let step = self
                .steps
                .iter()
                .find(|s| s.from_version() == from)
                .ok_or_else(|| {
                    ProjectError::Migration(format!(
                        "no migration step registered from version {from}"
                    ))
                })?;
            current = step.apply(current)?;
            applied_steps.push(format!("{}->{}", step.from_version(), step.to_version()));
        }

        let report = MigrationReport {
            from_version: start_version,
            to_version: schema_version(&current),
            applied_steps,
            changed_files: Vec::new(),
            warnings: Vec::new(),
            rollback_snapshot_path: None,
            dry_run,
        };
        Ok((current, report))
    }
}

pub fn schema_version(value: &Value) -> u32 {
    value
        .get("project_schema_version")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
        .unwrap_or(0)
}

struct V0ToV1Migration;

impl MigrationStep for V0ToV1Migration {
    fn from_version(&self) -> u32 {
        0
    }

    fn to_version(&self) -> u32 {
        1
    }

    fn apply(&self, input: Value) -> Result<Value, ProjectError> {
        let mut map = input
            .as_object()
            .cloned()
            .ok_or_else(|| ProjectError::Migration("project root must be an object".to_string()))?;

        if !map.contains_key("name") {
            if let Some(title) = map.get("title").and_then(|v| v.as_str()) {
                map.insert("name".to_string(), json!(title));
            } else {
                map.insert("name".to_string(), json!("Untitled Project"));
            }
        }

        map.insert(
            "project_schema_version".to_string(),
            json!(self.to_version()),
        );
        Ok(Value::Object(map))
    }
}
