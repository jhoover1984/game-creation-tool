use std::path::PathBuf;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProjectError {
    #[error("project manifest is invalid: {0}")]
    InvalidManifest(String),
    #[error("project file not found: {0}")]
    ProjectFileMissing(PathBuf),
    #[error("I/O failure at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
    #[error("failed to parse project JSON at {path}: {source}")]
    Parse {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },
    #[error("migration error: {0}")]
    Migration(String),
}
