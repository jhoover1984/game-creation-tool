use serde::{Deserialize, Serialize};

/// Visual effect applied during a scene transition.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransitionEffect {
    /// No visual transition — instant cut.
    None,
    /// Screen fades to black (opacity 0 → 1).
    FadeOut,
    /// Screen fades from black (opacity 1 → 0).
    FadeIn,
}

impl Default for TransitionEffect {
    fn default() -> Self {
        Self::None
    }
}

/// Tracks the progress of an active screen transition.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TransitionState {
    pub active: bool,
    pub effect: TransitionEffect,
    /// Progress from 0.0 (just started) to 1.0 (complete).
    pub progress: f32,
    /// Total ticks the transition should last.
    pub duration_ticks: u32,
    /// Ticks elapsed so far.
    pub elapsed_ticks: u32,
}

impl Default for TransitionState {
    fn default() -> Self {
        Self {
            active: false,
            effect: TransitionEffect::None,
            progress: 0.0,
            duration_ticks: 0,
            elapsed_ticks: 0,
        }
    }
}

impl TransitionState {
    /// Begin a new transition with the given effect and duration.
    pub fn start(&mut self, effect: TransitionEffect, duration_ticks: u32) {
        if matches!(effect, TransitionEffect::None) || duration_ticks == 0 {
            self.active = false;
            self.effect = TransitionEffect::None;
            self.progress = 0.0;
            self.duration_ticks = 0;
            self.elapsed_ticks = 0;
            return;
        }
        self.active = true;
        self.effect = effect;
        self.progress = 0.0;
        self.duration_ticks = duration_ticks;
        self.elapsed_ticks = 0;
    }

    /// Advance the transition by one tick.
    /// Returns `true` when the transition has just completed.
    pub fn tick(&mut self) -> bool {
        if !self.active {
            return false;
        }
        self.elapsed_ticks += 1;
        self.progress = if self.duration_ticks == 0 {
            1.0
        } else {
            (self.elapsed_ticks as f32 / self.duration_ticks as f32).min(1.0)
        };
        if self.elapsed_ticks >= self.duration_ticks {
            self.active = false;
            self.progress = 1.0;
            return true;
        }
        false
    }

    /// Returns the overlay opacity for the current transition state.
    /// - FadeOut: 0 → 1 (screen darkens)
    /// - FadeIn: 1 → 0 (screen brightens)
    /// - None / inactive: 0
    pub fn opacity(&self) -> f32 {
        if !self.active && self.progress >= 1.0 {
            // Transition just completed — return final opacity
            return match self.effect {
                TransitionEffect::FadeOut => 1.0,
                TransitionEffect::FadeIn => 0.0,
                TransitionEffect::None => 0.0,
            };
        }
        if !self.active {
            return 0.0;
        }
        match self.effect {
            TransitionEffect::FadeOut => self.progress,
            TransitionEffect::FadeIn => 1.0 - self.progress,
            TransitionEffect::None => 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_inactive() {
        let state = TransitionState::default();
        assert!(!state.active);
        assert_eq!(state.opacity(), 0.0);
    }

    #[test]
    fn start_none_stays_inactive() {
        let mut state = TransitionState::default();
        state.start(TransitionEffect::None, 10);
        assert!(!state.active);
    }

    #[test]
    fn start_zero_duration_stays_inactive() {
        let mut state = TransitionState::default();
        state.start(TransitionEffect::FadeOut, 0);
        assert!(!state.active);
    }

    #[test]
    fn fade_out_progress() {
        let mut state = TransitionState::default();
        state.start(TransitionEffect::FadeOut, 4);
        assert!(state.active);
        assert_eq!(state.opacity(), 0.0);

        // Tick 1: 25%
        assert!(!state.tick());
        assert!((state.opacity() - 0.25).abs() < 0.01);

        // Tick 2: 50%
        assert!(!state.tick());
        assert!((state.opacity() - 0.5).abs() < 0.01);

        // Tick 3: 75%
        assert!(!state.tick());
        assert!((state.opacity() - 0.75).abs() < 0.01);

        // Tick 4: completes
        assert!(state.tick());
        assert!(!state.active);
        assert_eq!(state.opacity(), 1.0);
    }

    #[test]
    fn fade_in_progress() {
        let mut state = TransitionState::default();
        state.start(TransitionEffect::FadeIn, 4);
        assert!(state.active);
        assert_eq!(state.opacity(), 1.0);

        // Tick 1: 75%
        assert!(!state.tick());
        assert!((state.opacity() - 0.75).abs() < 0.01);

        // Tick 2: 50%
        assert!(!state.tick());
        assert!((state.opacity() - 0.5).abs() < 0.01);

        // Tick 3: 25%
        assert!(!state.tick());
        assert!((state.opacity() - 0.25).abs() < 0.01);

        // Tick 4: completes
        assert!(state.tick());
        assert!(!state.active);
        assert_eq!(state.opacity(), 0.0);
    }

    #[test]
    fn tick_while_inactive_returns_false() {
        let mut state = TransitionState::default();
        assert!(!state.tick());
        assert_eq!(state.elapsed_ticks, 0);
    }

    #[test]
    fn restart_resets_progress() {
        let mut state = TransitionState::default();
        state.start(TransitionEffect::FadeOut, 10);
        state.tick();
        state.tick();
        assert!(state.elapsed_ticks > 0);

        // Restart with new transition
        state.start(TransitionEffect::FadeIn, 5);
        assert!(state.active);
        assert_eq!(state.elapsed_ticks, 0);
        assert_eq!(state.progress, 0.0);
        assert_eq!(state.duration_ticks, 5);
    }

    #[test]
    fn serialization_roundtrip() {
        let mut state = TransitionState::default();
        state.start(TransitionEffect::FadeOut, 10);
        state.tick();
        let json = serde_json::to_string(&state).unwrap();
        let deserialized: TransitionState = serde_json::from_str(&json).unwrap();
        assert_eq!(state, deserialized);
    }
}
