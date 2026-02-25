/// Playtest lifecycle: enter, exit, pause, tick.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlaytestState {
    Stopped,
    Running,
    Paused,
}

/// Manages the playtest session lifecycle.
#[derive(Debug)]
pub struct PlaytestSession {
    state: PlaytestState,
    tick_count: u64,
    stale_guard_max_ticks: u64,
}

impl Default for PlaytestSession {
    fn default() -> Self {
        Self::new()
    }
}

impl PlaytestSession {
    pub fn new() -> Self {
        Self {
            state: PlaytestState::Stopped,
            tick_count: 0,
            stale_guard_max_ticks: 60 * 60 * 5, // 5 min at 60fps
        }
    }

    pub fn state(&self) -> PlaytestState {
        self.state
    }

    pub fn tick_count(&self) -> u64 {
        self.tick_count
    }

    pub fn enter(&mut self) -> Result<(), &'static str> {
        match self.state {
            PlaytestState::Stopped => {
                self.state = PlaytestState::Running;
                self.tick_count = 0;
                Ok(())
            }
            _ => Err("Cannot enter playtest: already running or paused"),
        }
    }

    pub fn exit(&mut self) {
        self.state = PlaytestState::Stopped;
        self.tick_count = 0;
    }

    pub fn pause(&mut self) -> Result<(), &'static str> {
        match self.state {
            PlaytestState::Running => {
                self.state = PlaytestState::Paused;
                Ok(())
            }
            _ => Err("Cannot pause: not running"),
        }
    }

    pub fn resume(&mut self) -> Result<(), &'static str> {
        match self.state {
            PlaytestState::Paused => {
                self.state = PlaytestState::Running;
                Ok(())
            }
            _ => Err("Cannot resume: not paused"),
        }
    }

    /// Advance one tick. Returns false if stale guard triggered.
    pub fn tick(&mut self) -> bool {
        if self.state != PlaytestState::Running {
            return false;
        }
        self.tick_count += 1;
        self.tick_count < self.stale_guard_max_ticks
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lifecycle_flow() {
        let mut session = PlaytestSession::new();
        assert_eq!(session.state(), PlaytestState::Stopped);

        session.enter().unwrap();
        assert_eq!(session.state(), PlaytestState::Running);

        assert!(session.tick());
        assert_eq!(session.tick_count(), 1);

        session.pause().unwrap();
        assert_eq!(session.state(), PlaytestState::Paused);
        assert!(!session.tick()); // can't tick while paused

        session.resume().unwrap();
        assert_eq!(session.state(), PlaytestState::Running);

        session.exit();
        assert_eq!(session.state(), PlaytestState::Stopped);
    }

    #[test]
    fn double_enter_fails() {
        let mut session = PlaytestSession::new();
        session.enter().unwrap();
        assert!(session.enter().is_err());
    }
}
