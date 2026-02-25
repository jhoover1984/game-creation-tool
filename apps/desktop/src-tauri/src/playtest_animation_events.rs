use engine_core::AnimationEvent;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum RuntimeAnimationAction {
    Trace { kind: String, message: String },
    FireScript { event_name: &'static str },
}

pub(crate) fn derive_runtime_animation_actions(
    events: Vec<AnimationEvent>,
    script_runtime_loaded: bool,
) -> Vec<RuntimeAnimationAction> {
    let mut actions = Vec::new();

    for event in events {
        match event {
            AnimationEvent::ClipFinished { .. } => {
                if script_runtime_loaded {
                    actions.push(RuntimeAnimationAction::FireScript {
                        event_name: "animation_finished",
                    });
                }
            }
            AnimationEvent::StateChanged {
                entity_id,
                from,
                to,
            } => {
                actions.push(RuntimeAnimationAction::Trace {
                    kind: "animation_state_changed".to_string(),
                    message: format!("entity {entity_id}: '{from}' -> '{to}'"),
                });
                if script_runtime_loaded {
                    actions.push(RuntimeAnimationAction::FireScript {
                        event_name: "animation_state_changed",
                    });
                }
            }
        }
    }

    actions
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_changed_generates_trace_then_script_event() {
        let events = vec![AnimationEvent::StateChanged {
            entity_id: 7,
            from: "idle".to_string(),
            to: "run".to_string(),
        }];
        let actions = derive_runtime_animation_actions(events, true);
        assert_eq!(
            actions,
            vec![
                RuntimeAnimationAction::Trace {
                    kind: "animation_state_changed".to_string(),
                    message: "entity 7: 'idle' -> 'run'".to_string(),
                },
                RuntimeAnimationAction::FireScript {
                    event_name: "animation_state_changed",
                },
            ]
        );
    }

    #[test]
    fn clip_finished_only_fires_when_script_runtime_is_loaded() {
        let events = vec![AnimationEvent::ClipFinished {
            entity_id: 1,
            clip_name: "attack".to_string(),
        }];
        let loaded = derive_runtime_animation_actions(events.clone(), true);
        let unloaded = derive_runtime_animation_actions(events, false);
        assert_eq!(
            loaded,
            vec![RuntimeAnimationAction::FireScript {
                event_name: "animation_finished",
            }]
        );
        assert!(unloaded.is_empty());
    }
}
