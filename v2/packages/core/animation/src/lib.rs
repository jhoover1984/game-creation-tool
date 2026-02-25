//! Animation runtime: clip playback, loop modes, transitions, state machine.

pub mod clip;
pub mod state_machine;
pub mod transition;

pub use clip::{AnimationClip, LoopMode, PlaybackState};
pub use state_machine::AnimationStateMachine;
pub use transition::{AnimationTransition, TransitionCondition};
