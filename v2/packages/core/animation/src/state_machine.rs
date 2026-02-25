use crate::clip::{AnimationClip, PlaybackState};
use crate::transition::{should_transition, AnimationTransition};

/// Animation state machine: manages a set of clips connected by transitions.
/// Each tick, it advances the current clip and checks if any transition fires.
pub struct AnimationStateMachine {
    clips: Vec<AnimationClip>,
    transitions: Vec<AnimationTransition>,
    playback: Option<PlaybackState>,
    active_triggers: Vec<String>,
    params: Vec<(String, f32)>,
}

impl AnimationStateMachine {
    pub fn new(clips: Vec<AnimationClip>, transitions: Vec<AnimationTransition>) -> Self {
        let playback = clips.first().map(PlaybackState::new);
        Self {
            clips,
            transitions,
            playback,
            active_triggers: Vec::new(),
            params: Vec::new(),
        }
    }

    /// Set the active clip by name. Resets playback.
    pub fn set_clip(&mut self, name: &str) {
        if let Some(clip) = self.clips.iter().find(|c| c.name == name) {
            self.playback = Some(PlaybackState::new(clip));
        }
    }

    /// Fire a trigger (consumed after one tick evaluation).
    pub fn set_trigger(&mut self, name: &str) {
        self.active_triggers.push(name.to_string());
    }

    /// Set a named parameter value.
    pub fn set_param(&mut self, name: &str, value: f32) {
        if let Some(entry) = self.params.iter_mut().find(|(k, _)| k == name) {
            entry.1 = value;
        } else {
            self.params.push((name.to_string(), value));
        }
    }

    /// Get the current clip name, if any.
    pub fn current_clip(&self) -> Option<&str> {
        self.playback.as_ref().map(|p| p.clip_name.as_str())
    }

    /// Get the current frame index.
    pub fn current_frame(&self) -> u32 {
        self.playback.as_ref().map_or(0, |p| p.current_frame)
    }

    /// Whether the current clip has finished (only meaningful for Once mode).
    pub fn is_finished(&self) -> bool {
        self.playback.as_ref().is_none_or(|p| p.finished)
    }

    /// Advance the state machine by `dt` seconds.
    /// Returns the current frame index after the tick.
    pub fn tick(&mut self, dt: f32) -> u32 {
        let playback = match &mut self.playback {
            Some(p) => p,
            None => return 0,
        };

        // Find the current clip
        let clip = match self.clips.iter().find(|c| c.name == playback.clip_name) {
            Some(c) => c,
            None => return 0,
        };

        // Advance playback
        let frame = playback.tick(clip, dt);

        // Check transitions from current clip
        let clip_finished = playback.finished;
        let current_name = playback.clip_name.clone();

        let fired = self.transitions.iter().find(|t| {
            t.from_clip == current_name
                && should_transition(t, clip_finished, &self.active_triggers, &self.params)
        });

        if let Some(transition) = fired {
            let to_name = transition.to_clip.clone();
            if let Some(next_clip) = self.clips.iter().find(|c| c.name == to_name) {
                self.playback = Some(PlaybackState::new(next_clip));
            }
        }

        // Consume triggers
        self.active_triggers.clear();

        self.playback.as_ref().map_or(frame, |p| p.current_frame)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::clip::LoopMode;
    use crate::transition::TransitionCondition;

    fn idle_clip() -> AnimationClip {
        AnimationClip {
            name: "idle".into(),
            frame_count: 2,
            fps: 10.0,
            loop_mode: LoopMode::Loop,
        }
    }

    fn walk_clip() -> AnimationClip {
        AnimationClip {
            name: "walk".into(),
            frame_count: 4,
            fps: 10.0,
            loop_mode: LoopMode::Loop,
        }
    }

    fn attack_clip() -> AnimationClip {
        AnimationClip {
            name: "attack".into(),
            frame_count: 3,
            fps: 10.0,
            loop_mode: LoopMode::Once,
        }
    }

    #[test]
    fn starts_on_first_clip() {
        let sm = AnimationStateMachine::new(vec![idle_clip(), walk_clip()], vec![]);
        assert_eq!(sm.current_clip(), Some("idle"));
        assert_eq!(sm.current_frame(), 0);
    }

    #[test]
    fn tick_advances_frames() {
        let mut sm = AnimationStateMachine::new(vec![idle_clip()], vec![]);
        sm.tick(0.1); // 1 frame at 10fps
        assert_eq!(sm.current_frame(), 1);
    }

    #[test]
    fn trigger_transitions_clip() {
        let mut sm = AnimationStateMachine::new(
            vec![idle_clip(), attack_clip()],
            vec![AnimationTransition {
                from_clip: "idle".into(),
                to_clip: "attack".into(),
                condition: TransitionCondition::OnTrigger("attack".into()),
            }],
        );

        assert_eq!(sm.current_clip(), Some("idle"));
        sm.set_trigger("attack");
        sm.tick(0.01);
        assert_eq!(sm.current_clip(), Some("attack"));
    }

    #[test]
    fn on_complete_transitions_when_finished() {
        let mut sm = AnimationStateMachine::new(
            vec![attack_clip(), idle_clip()],
            vec![AnimationTransition {
                from_clip: "attack".into(),
                to_clip: "idle".into(),
                condition: TransitionCondition::OnComplete,
            }],
        );

        assert_eq!(sm.current_clip(), Some("attack"));
        // Tick enough to finish (3 frames at 10fps = 0.3s)
        for _ in 0..5 {
            sm.tick(0.1);
        }
        assert_eq!(sm.current_clip(), Some("idle"));
    }

    #[test]
    fn threshold_transitions_on_param() {
        let mut sm = AnimationStateMachine::new(
            vec![idle_clip(), walk_clip()],
            vec![AnimationTransition {
                from_clip: "idle".into(),
                to_clip: "walk".into(),
                condition: TransitionCondition::OnThreshold {
                    param: "speed".into(),
                    above: 0.1,
                },
            }],
        );

        sm.set_param("speed", 0.0);
        sm.tick(0.01);
        assert_eq!(sm.current_clip(), Some("idle")); // below threshold

        sm.set_param("speed", 0.5);
        sm.tick(0.01);
        assert_eq!(sm.current_clip(), Some("walk")); // above threshold
    }

    #[test]
    fn set_clip_resets_playback() {
        let mut sm = AnimationStateMachine::new(vec![idle_clip(), walk_clip()], vec![]);
        sm.tick(0.1);
        assert_eq!(sm.current_clip(), Some("idle"));
        assert_eq!(sm.current_frame(), 1);

        sm.set_clip("walk");
        assert_eq!(sm.current_clip(), Some("walk"));
        assert_eq!(sm.current_frame(), 0);
    }

    #[test]
    fn triggers_consumed_after_tick() {
        let mut sm = AnimationStateMachine::new(
            vec![idle_clip(), attack_clip(), walk_clip()],
            vec![
                AnimationTransition {
                    from_clip: "idle".into(),
                    to_clip: "attack".into(),
                    condition: TransitionCondition::OnTrigger("attack".into()),
                },
                AnimationTransition {
                    from_clip: "attack".into(),
                    to_clip: "walk".into(),
                    condition: TransitionCondition::OnTrigger("attack".into()),
                },
            ],
        );

        sm.set_trigger("attack");
        sm.tick(0.01);
        assert_eq!(sm.current_clip(), Some("attack"));

        // Trigger was consumed -- shouldn't transition again without new trigger
        sm.tick(0.01);
        assert_eq!(sm.current_clip(), Some("attack"));
    }
}

