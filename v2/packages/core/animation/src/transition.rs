use serde::{Deserialize, Serialize};

/// Condition that triggers a transition between animation clips.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransitionCondition {
    /// Transition when the current clip finishes.
    OnComplete,
    /// Transition when a named trigger is set.
    OnTrigger(String),
    /// Transition when a parameter crosses a threshold.
    OnThreshold { param: String, above: f32 },
}

/// A transition edge between two clips.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationTransition {
    pub from_clip: String,
    pub to_clip: String,
    pub condition: TransitionCondition,
}

/// Evaluate whether a transition should fire.
pub fn should_transition(
    transition: &AnimationTransition,
    clip_finished: bool,
    active_triggers: &[String],
    params: &[(String, f32)],
) -> bool {
    match &transition.condition {
        TransitionCondition::OnComplete => clip_finished,
        TransitionCondition::OnTrigger(name) => active_triggers.contains(name),
        TransitionCondition::OnThreshold { param, above } => {
            params.iter().any(|(k, v)| k == param && v > above)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn on_complete_fires_when_finished() {
        let t = AnimationTransition {
            from_clip: "idle".into(),
            to_clip: "walk".into(),
            condition: TransitionCondition::OnComplete,
        };
        assert!(should_transition(&t, true, &[], &[]));
        assert!(!should_transition(&t, false, &[], &[]));
    }

    #[test]
    fn on_trigger_fires() {
        let t = AnimationTransition {
            from_clip: "idle".into(),
            to_clip: "attack".into(),
            condition: TransitionCondition::OnTrigger("attack".into()),
        };
        assert!(should_transition(&t, false, &["attack".into()], &[]));
        assert!(!should_transition(&t, false, &["jump".into()], &[]));
    }
}
