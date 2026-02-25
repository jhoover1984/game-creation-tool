use std::collections::HashMap;

use crate::animation::{tick_animation, AnimationTickOutcome, TransitionCondition};
use crate::animator_params::AnimatorParameters;
use crate::components::ComponentStore;
use crate::EntityId;

/// Events emitted by [`step_animations`] for the caller to handle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnimationEvent {
    /// A clip completed one full pass (Once finished, PingPong returned to start).
    ClipFinished {
        entity_id: EntityId,
        clip_name: String,
    },
    /// A transition fired, switching the entity to a new animation state.
    StateChanged {
        entity_id: EntityId,
        from: String,
        to: String,
    },
}

/// Advance all entity animations by one simulation step.
///
/// For each entity with an `AnimationComponent`:
/// 1. Ticks the active clip forward one step.
/// 2. Syncs `SpriteComponent.frame` to the current animation frame.
/// 3. Evaluates transition rules against `script_flags` and clip-finished status.
/// 4. If a transition fires, switches to the new state and emits `StateChanged`.
/// 5. If a clip finished with no transition consuming it, emits `ClipFinished`.
///
/// Returns all events that fired during this step.
pub fn step_animations(
    component_store: &mut ComponentStore,
    script_flags: &HashMap<String, bool>,
) -> Vec<AnimationEvent> {
    let mut animator_params = AnimatorParameters::default();
    step_animations_with_params(component_store, script_flags, &mut animator_params)
}

/// Same as [`step_animations`] but allows callers to provide/consume typed
/// animator parameters (bool/int/trigger) for transition evaluation.
pub fn step_animations_with_params(
    component_store: &mut ComponentStore,
    script_flags: &HashMap<String, bool>,
    animator_params: &mut AnimatorParameters,
) -> Vec<AnimationEvent> {
    let mut events = Vec::new();
    let entity_ids = component_store.entities_with_animation();

    for entity_id in entity_ids {
        // 1. Tick the animation clip.
        let outcome = {
            let Some(anim) = component_store.animation_mut(entity_id) else {
                continue;
            };
            let clip_name = anim.state.current_clip_name.clone();
            let Some(clip) = anim.clips.get(&clip_name).cloned() else {
                continue;
            };
            tick_animation(&clip, &mut anim.state)
        };

        // 2. Sync sprite frame.
        if let Some(anim) = component_store.animation(entity_id) {
            if let Some(frame) = anim.current_sprite_frame() {
                if let Some(ec) = component_store.get_mut(entity_id) {
                    if let Some(sprite) = ec.sprite.as_mut() {
                        sprite.frame = frame as u32;
                    }
                }
            }
        }

        // 3. Evaluate transitions.
        let next_state: Option<String> = {
            let Some(anim) = component_store.animation(entity_id) else {
                continue;
            };
            let current = anim.state.current_clip_name.clone();
            let clip_done = matches!(outcome, AnimationTickOutcome::ClipFinished { .. });
            anim.transitions
                .iter()
                .find(|t| {
                    t.from_state == current
                        && match &t.condition {
                            TransitionCondition::ClipFinished => clip_done,
                            TransitionCondition::FlagSet { flag } => {
                                script_flags.get(flag).copied().unwrap_or(false)
                                    || animator_params.get_bool(flag)
                                    || animator_params.consume_trigger(flag)
                            }
                            TransitionCondition::FlagSetForTicks { flag, min_ticks } => {
                                let flag_set = script_flags.get(flag).copied().unwrap_or(false)
                                    || animator_params.get_bool(flag)
                                    || animator_params.consume_trigger(flag);
                                flag_set && anim.state.ticks_in_state >= *min_ticks
                            }
                            TransitionCondition::IntGte { key, value } => {
                                animator_params.get_int(key) >= *value
                            }
                            TransitionCondition::IntLte { key, value } => {
                                animator_params.get_int(key) <= *value
                            }
                            TransitionCondition::IntGt { key, value } => {
                                animator_params.get_int(key) > *value
                            }
                            TransitionCondition::IntLt { key, value } => {
                                animator_params.get_int(key) < *value
                            }
                            TransitionCondition::IntEq { key, value } => {
                                animator_params.get_int(key) == *value
                            }
                            TransitionCondition::IntBetween { key, min, max } => {
                                let value = animator_params.get_int(key);
                                value >= *min && value <= *max
                            }
                            TransitionCondition::Never => false,
                        }
                })
                .map(|t| t.to_state.clone())
        };

        // 4-5. Apply transition or emit clip-finished.
        if let Some(to_state) = next_state {
            if let Some(anim) = component_store.animation_mut(entity_id) {
                let prev = anim.state.current_clip_name.clone();
                if anim.set_state(&to_state) {
                    events.push(AnimationEvent::StateChanged {
                        entity_id,
                        from: prev,
                        to: to_state,
                    });
                }
            }
        } else if let AnimationTickOutcome::ClipFinished { clip_name } = outcome {
            events.push(AnimationEvent::ClipFinished {
                entity_id,
                clip_name,
            });
        }
    }

    events
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::animation::{
        AnimationClip, AnimationComponent, AnimationTransition, LoopMode, TransitionCondition,
    };
    use crate::components::{ComponentStore, SpriteComponent};

    fn make_store_with_loop_clip() -> (ComponentStore, EntityId) {
        let mut store = ComponentStore::new();
        let entity_id: EntityId = 1;
        let clip = AnimationClip::new(vec![0, 1, 2, 3], 1, LoopMode::Loop);
        store.set_animation(entity_id, AnimationComponent::new("walk", clip));
        store.set_sprite(entity_id, SpriteComponent::new("player"));
        (store, entity_id)
    }

    #[test]
    fn loop_clip_advances_frame_each_step() {
        let (mut store, eid) = make_store_with_loop_clip();
        let flags = HashMap::new();

        let events = step_animations(&mut store, &flags);
        assert!(events.is_empty(), "Loop mode never emits events");
        assert_eq!(store.sprite(eid).unwrap().frame, 1);

        step_animations(&mut store, &flags);
        assert_eq!(store.sprite(eid).unwrap().frame, 2);
    }

    #[test]
    fn once_clip_emits_clip_finished_and_stops() {
        let mut store = ComponentStore::new();
        let eid: EntityId = 1;
        let clip = AnimationClip::new(vec![10, 11, 12], 1, LoopMode::Once);
        store.set_animation(eid, AnimationComponent::new("hit", clip));
        store.set_sprite(eid, SpriteComponent::new("player"));
        let flags = HashMap::new();

        // Tick to frame 1, 2, then finish
        assert!(step_animations(&mut store, &flags).is_empty());
        assert_eq!(store.sprite(eid).unwrap().frame, 11);
        assert!(step_animations(&mut store, &flags).is_empty());
        assert_eq!(store.sprite(eid).unwrap().frame, 12);

        let events = step_animations(&mut store, &flags);
        assert_eq!(events.len(), 1);
        assert_eq!(
            events[0],
            AnimationEvent::ClipFinished {
                entity_id: eid,
                clip_name: "hit".into(),
            }
        );

        // Further ticks are no-ops
        let events = step_animations(&mut store, &flags);
        assert!(events.is_empty());
    }

    #[test]
    fn flag_set_transition_emits_state_changed() {
        let mut store = ComponentStore::new();
        let eid: EntityId = 1;
        let walk = AnimationClip::new(vec![0, 1, 2, 3], 1, LoopMode::Loop);
        let idle = AnimationClip::new(vec![10, 11], 1, LoopMode::Loop);
        let mut comp = AnimationComponent::new("walk", walk);
        comp.clips.insert("idle".into(), idle);
        comp.transitions.push(AnimationTransition {
            from_state: "walk".into(),
            to_state: "idle".into(),
            condition: TransitionCondition::FlagSet {
                flag: "is_stopped".into(),
            },
        });
        store.set_animation(eid, comp);
        store.set_sprite(eid, SpriteComponent::new("player"));

        // Without flag set — no transition
        let flags = HashMap::new();
        let events = step_animations(&mut store, &flags);
        assert!(events.is_empty());
        assert_eq!(
            store.animation(eid).unwrap().state.current_clip_name,
            "walk"
        );

        // With flag set — transition fires
        let mut flags = HashMap::new();
        flags.insert("is_stopped".into(), true);
        let events = step_animations(&mut store, &flags);
        assert_eq!(events.len(), 1);
        assert_eq!(
            events[0],
            AnimationEvent::StateChanged {
                entity_id: eid,
                from: "walk".into(),
                to: "idle".into(),
            }
        );
        assert_eq!(
            store.animation(eid).unwrap().state.current_clip_name,
            "idle"
        );
    }

    #[test]
    fn empty_store_is_noop() {
        let mut store = ComponentStore::new();
        let flags = HashMap::new();
        let events = step_animations(&mut store, &flags);
        assert!(events.is_empty());
    }

    #[test]
    fn entity_without_sprite_still_advances_animation() {
        let mut store = ComponentStore::new();
        let eid: EntityId = 1;
        let clip = AnimationClip::new(vec![0, 1, 2], 1, LoopMode::Loop);
        store.set_animation(eid, AnimationComponent::new("walk", clip));
        // No sprite component set

        let flags = HashMap::new();
        let events = step_animations(&mut store, &flags);
        assert!(events.is_empty());
        assert_eq!(
            store.animation(eid).unwrap().state.current_frame_index,
            1
        );
    }

    #[test]
    fn trigger_param_can_drive_flagset_transition_once() {
        let mut store = ComponentStore::new();
        let eid: EntityId = 1;
        let walk = AnimationClip::new(vec![0, 1], 1, LoopMode::Loop);
        let jump = AnimationClip::new(vec![10, 11], 1, LoopMode::Loop);
        let mut comp = AnimationComponent::new("walk", walk);
        comp.clips.insert("jump".into(), jump);
        comp.transitions.push(AnimationTransition {
            from_state: "walk".into(),
            to_state: "jump".into(),
            condition: TransitionCondition::FlagSet {
                flag: "jump_pressed".into(),
            },
        });
        store.set_animation(eid, comp);

        let mut params = AnimatorParameters::default();
        params.set_trigger("jump_pressed");
        let events = step_animations_with_params(&mut store, &HashMap::new(), &mut params);
        assert_eq!(events.len(), 1);
        assert_eq!(
            store.animation(eid).unwrap().state.current_clip_name,
            "jump"
        );
        assert!(
            !params.consume_trigger("jump_pressed"),
            "trigger should be one-shot"
        );
    }

    #[test]
    fn flag_set_for_ticks_waits_for_state_dwell() {
        let mut store = ComponentStore::new();
        let eid: EntityId = 1;
        let walk = AnimationClip::new(vec![0, 1], 1, LoopMode::Loop);
        let run = AnimationClip::new(vec![2, 3], 1, LoopMode::Loop);
        let mut comp = AnimationComponent::new("walk", walk);
        comp.clips.insert("run".into(), run);
        comp.transitions.push(AnimationTransition {
            from_state: "walk".into(),
            to_state: "run".into(),
            condition: TransitionCondition::FlagSetForTicks {
                flag: "is_running".into(),
                min_ticks: 3,
            },
        });
        store.set_animation(eid, comp);

        let mut flags = HashMap::new();
        flags.insert("is_running".into(), true);

        assert!(step_animations(&mut store, &flags).is_empty());
        assert_eq!(store.animation(eid).unwrap().state.current_clip_name, "walk");
        assert!(step_animations(&mut store, &flags).is_empty());
        assert_eq!(store.animation(eid).unwrap().state.current_clip_name, "walk");

        let events = step_animations(&mut store, &flags);
        assert_eq!(events.len(), 1);
        assert_eq!(store.animation(eid).unwrap().state.current_clip_name, "run");
    }

    #[test]
    fn int_threshold_conditions_respect_animator_int_params() {
        let mut store = ComponentStore::new();
        let eid: EntityId = 1;
        let idle = AnimationClip::new(vec![0], 1, LoopMode::Loop);
        let walk = AnimationClip::new(vec![1, 2], 1, LoopMode::Loop);
        let mut comp = AnimationComponent::new("idle", idle);
        comp.clips.insert("walk".into(), walk);
        comp.transitions.push(AnimationTransition {
            from_state: "idle".into(),
            to_state: "walk".into(),
            condition: TransitionCondition::IntGte {
                key: "speed_tier".into(),
                value: 2,
            },
        });
        store.set_animation(eid, comp);

        let mut params = AnimatorParameters::default();
        params.set_int("speed_tier", 1);
        assert!(step_animations_with_params(&mut store, &HashMap::new(), &mut params).is_empty());
        assert_eq!(store.animation(eid).unwrap().state.current_clip_name, "idle");

        params.set_int("speed_tier", 2);
        let events = step_animations_with_params(&mut store, &HashMap::new(), &mut params);
        assert_eq!(events.len(), 1);
        assert_eq!(store.animation(eid).unwrap().state.current_clip_name, "walk");
    }

    #[test]
    fn int_comparison_conditions_cover_gt_lt_eq_between() {
        let mut store = ComponentStore::new();
        let eid: EntityId = 1;
        let idle = AnimationClip::new(vec![0], 1, LoopMode::Loop);
        let active = AnimationClip::new(vec![1], 1, LoopMode::Loop);
        let mut comp = AnimationComponent::new("idle", idle);
        comp.clips.insert("active".into(), active);
        comp.transitions.push(AnimationTransition {
            from_state: "idle".into(),
            to_state: "active".into(),
            condition: TransitionCondition::IntGt {
                key: "score".into(),
                value: 9,
            },
        });
        store.set_animation(eid, comp);

        let mut params = AnimatorParameters::default();
        params.set_int("score", 9);
        assert!(step_animations_with_params(&mut store, &HashMap::new(), &mut params).is_empty());
        assert_eq!(store.animation(eid).unwrap().state.current_clip_name, "idle");
        params.set_int("score", 10);
        let events = step_animations_with_params(&mut store, &HashMap::new(), &mut params);
        assert_eq!(events.len(), 1);
        assert_eq!(store.animation(eid).unwrap().state.current_clip_name, "active");

        // Re-arm on idle and test IntLt.
        store.animation_mut(eid).unwrap().set_state("idle");
        store.animation_mut(eid).unwrap().transitions[0].condition = TransitionCondition::IntLt {
            key: "score".into(),
            value: 5,
        };
        params.set_int("score", 5);
        assert!(step_animations_with_params(&mut store, &HashMap::new(), &mut params).is_empty());
        params.set_int("score", 4);
        let events = step_animations_with_params(&mut store, &HashMap::new(), &mut params);
        assert_eq!(events.len(), 1);

        // Re-arm on idle and test IntEq.
        store.animation_mut(eid).unwrap().set_state("idle");
        store.animation_mut(eid).unwrap().transitions[0].condition = TransitionCondition::IntEq {
            key: "score".into(),
            value: 42,
        };
        params.set_int("score", 41);
        assert!(step_animations_with_params(&mut store, &HashMap::new(), &mut params).is_empty());
        params.set_int("score", 42);
        let events = step_animations_with_params(&mut store, &HashMap::new(), &mut params);
        assert_eq!(events.len(), 1);

        // Re-arm on idle and test IntBetween (inclusive bounds).
        store.animation_mut(eid).unwrap().set_state("idle");
        store.animation_mut(eid).unwrap().transitions[0].condition =
            TransitionCondition::IntBetween {
                key: "score".into(),
                min: 3,
                max: 7,
            };
        params.set_int("score", 2);
        assert!(step_animations_with_params(&mut store, &HashMap::new(), &mut params).is_empty());
        params.set_int("score", 3);
        let events = step_animations_with_params(&mut store, &HashMap::new(), &mut params);
        assert_eq!(events.len(), 1);
    }
}
