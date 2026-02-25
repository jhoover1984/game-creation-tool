use serde::{Deserialize, Serialize};

/// Playback loop mode for an animation clip.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum LoopMode {
    /// Restart from the first frame after the last frame plays.
    #[default]
    Loop,
    /// Stop on the last frame after one pass.
    Once,
    /// Bounce between first and last frames (0→N→0→N…).
    PingPong,
}

/// A named sequence of frame indices and timing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnimationClip {
    /// Ordered sprite-sheet frame indices to display.
    pub frames: Vec<u16>,
    /// How many game ticks to hold each frame before advancing.
    pub frame_duration_ticks: u32,
    pub loop_mode: LoopMode,
}

impl AnimationClip {
    pub fn new(frames: Vec<u16>, frame_duration_ticks: u32, loop_mode: LoopMode) -> Self {
        Self { frames, frame_duration_ticks, loop_mode }
    }

    /// Total number of frames in the clip. Returns 0 for an empty clip.
    pub fn len(&self) -> usize {
        self.frames.len()
    }

    pub fn is_empty(&self) -> bool {
        self.frames.is_empty()
    }
}

/// Runtime playback state for an entity's active animation clip.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnimationState {
    /// Name of the currently active clip (key into `AnimationComponent.clips`).
    pub current_clip_name: String,
    /// Index into the clip's `frames` vec.
    pub current_frame_index: usize,
    /// Ticks elapsed on the current frame (resets when `frame_duration_ticks` is reached).
    pub ticks_in_frame: u32,
    /// Ticks elapsed since entering the current state.
    #[serde(default)]
    pub ticks_in_state: u32,
    /// Whether the animation is advancing. `false` after a `Once` clip finishes.
    pub playing: bool,
    /// Direction flag used only by `PingPong` mode.
    #[serde(default = "bool_true")]
    pub ping_pong_forward: bool,
}

fn bool_true() -> bool { true }

impl AnimationState {
    pub fn new(clip_name: impl Into<String>) -> Self {
        Self {
            current_clip_name: clip_name.into(),
            current_frame_index: 0,
            ticks_in_frame: 0,
            ticks_in_state: 0,
            playing: true,
            ping_pong_forward: true,
        }
    }

    /// Reset state to the beginning of its current clip.
    pub fn reset(&mut self) {
        self.current_frame_index = 0;
        self.ticks_in_frame = 0;
        self.ticks_in_state = 0;
        self.playing = true;
        self.ping_pong_forward = true;
    }
}

/// Outcome returned by [`tick_animation`] each game tick.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnimationTickOutcome {
    /// Still playing; no notable transition this tick.
    Playing,
    /// The clip completed one full pass (Once or PingPong returned to start).
    ClipFinished { clip_name: String },
}

/// Advance `state` by one game tick relative to `clip`.
///
/// Returns [`AnimationTickOutcome::ClipFinished`] on the tick that the clip
/// completes (Once: reaches last frame; PingPong: returns to frame 0 from N).
/// Returns [`AnimationTickOutcome::Playing`] otherwise.
///
/// If the clip is empty or `!state.playing`, returns `Playing` immediately (no-op).
pub fn tick_animation(clip: &AnimationClip, state: &mut AnimationState) -> AnimationTickOutcome {
    if !state.playing || clip.is_empty() {
        return AnimationTickOutcome::Playing;
    }

    state.ticks_in_state = state.ticks_in_state.saturating_add(1);
    state.ticks_in_frame += 1;
    if state.ticks_in_frame < clip.frame_duration_ticks.max(1) {
        return AnimationTickOutcome::Playing;
    }
    state.ticks_in_frame = 0;

    let last = clip.frames.len() - 1;
    match clip.loop_mode {
        LoopMode::Loop => {
            state.current_frame_index = (state.current_frame_index + 1) % clip.frames.len();
            AnimationTickOutcome::Playing
        }
        LoopMode::Once => {
            if state.current_frame_index >= last {
                state.playing = false;
                AnimationTickOutcome::ClipFinished { clip_name: state.current_clip_name.clone() }
            } else {
                state.current_frame_index += 1;
                AnimationTickOutcome::Playing
            }
        }
        LoopMode::PingPong => {
            if last == 0 {
                return AnimationTickOutcome::Playing;
            }
            if state.ping_pong_forward {
                state.current_frame_index += 1;
                if state.current_frame_index >= last {
                    state.ping_pong_forward = false;
                }
                AnimationTickOutcome::Playing
            } else {
                state.current_frame_index = state.current_frame_index.saturating_sub(1);
                if state.current_frame_index == 0 {
                    state.ping_pong_forward = true;
                    AnimationTickOutcome::ClipFinished { clip_name: state.current_clip_name.clone() }
                } else {
                    AnimationTickOutcome::Playing
                }
            }
        }
    }
}

/// Condition that must hold for an `AnimationTransition` to fire.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum TransitionCondition {
    /// Fires when the named script flag is set to `true`.
    FlagSet { flag: String },
    /// Fires when the named script flag is true and the current state has
    /// been active for at least `min_ticks`.
    FlagSetForTicks { flag: String, min_ticks: u32 },
    /// Fires when the named integer parameter is greater than or equal to `value`.
    IntGte { key: String, value: i32 },
    /// Fires when the named integer parameter is less than or equal to `value`.
    IntLte { key: String, value: i32 },
    /// Fires when the named integer parameter is strictly greater than `value`.
    IntGt { key: String, value: i32 },
    /// Fires when the named integer parameter is strictly less than `value`.
    IntLt { key: String, value: i32 },
    /// Fires when the named integer parameter is exactly equal to `value`.
    IntEq { key: String, value: i32 },
    /// Fires when the named integer parameter is within `[min, max]` inclusive.
    IntBetween { key: String, min: i32, max: i32 },
    /// Fires when the current clip has finished playing (Once / PingPong only).
    ClipFinished,
    /// Never fires — used for authoring placeholders.
    Never,
}

/// An edge in the animation state graph: when `condition` is met while
/// `from_state` is active, the component switches to `to_state`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnimationTransition {
    pub from_state: String,
    pub to_state: String,
    pub condition: TransitionCondition,
}

/// Full animation component attached to an entity.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnimationComponent {
    /// Named animation clips available to this entity.
    pub clips: std::collections::HashMap<String, AnimationClip>,
    /// Current playback state.
    pub state: AnimationState,
    /// Optional binding to a reusable animation graph asset.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub graph_asset_id: Option<String>,
    /// Transition rules evaluated each tick.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub transitions: Vec<AnimationTransition>,
}

impl AnimationComponent {
    /// Create a component with a single initial clip set as the active state.
    pub fn new(clip_name: impl Into<String>, clip: AnimationClip) -> Self {
        let clip_name = clip_name.into();
        let state = AnimationState::new(&clip_name);
        let mut clips = std::collections::HashMap::new();
        clips.insert(clip_name, clip);
        Self { clips, state, graph_asset_id: None, transitions: Vec::new() }
    }

    /// Return the frame index (within the sprite sheet) currently displayed.
    pub fn current_sprite_frame(&self) -> Option<u16> {
        let clip = self.clips.get(&self.state.current_clip_name)?;
        clip.frames.get(self.state.current_frame_index).copied()
    }

    /// Switch to a named state, resetting playback from frame 0.
    /// Returns `false` if the named clip does not exist.
    pub fn set_state(&mut self, clip_name: &str) -> bool {
        if !self.clips.contains_key(clip_name) {
            return false;
        }
        self.state = AnimationState::new(clip_name);
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn walk_clip() -> AnimationClip {
        AnimationClip::new(vec![0, 1, 2, 3], 2, LoopMode::Loop)
    }

    fn once_clip() -> AnimationClip {
        AnimationClip::new(vec![10, 11, 12], 1, LoopMode::Once)
    }

    fn ping_pong_clip() -> AnimationClip {
        AnimationClip::new(vec![0, 1, 2], 1, LoopMode::PingPong)
    }

    // ── Loop mode ────────────────────────────────────────────────────

    #[test]
    fn loop_mode_advances_and_wraps() {
        let clip = walk_clip(); // 4 frames, 2 ticks per frame
        let mut state = AnimationState::new("walk");
        // frame 0 for ticks 0-1
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
        assert_eq!(state.current_frame_index, 0);
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
        assert_eq!(state.current_frame_index, 1);
        // advance through all 4 frames (8 ticks total), then back to 0
        for _ in 0..6 { tick_animation(&clip, &mut state); }
        assert_eq!(state.current_frame_index, 0, "should wrap around after 8 ticks");
    }

    #[test]
    fn loop_mode_never_reports_finished() {
        let clip = walk_clip();
        let mut state = AnimationState::new("walk");
        for _ in 0..100 {
            let outcome = tick_animation(&clip, &mut state);
            assert_eq!(outcome, AnimationTickOutcome::Playing);
        }
    }

    // ── Once mode ────────────────────────────────────────────────────

    #[test]
    fn once_mode_stops_at_last_frame() {
        let clip = once_clip(); // 3 frames, 1 tick per frame
        let mut state = AnimationState::new("hit");
        // tick 1 → frame 1
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
        assert_eq!(state.current_frame_index, 1);
        // tick 2 → frame 2
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
        assert_eq!(state.current_frame_index, 2);
        // tick 3 → finished
        let outcome = tick_animation(&clip, &mut state);
        assert_eq!(outcome, AnimationTickOutcome::ClipFinished { clip_name: "hit".into() });
        assert!(!state.playing);
        // further ticks are no-ops
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
        assert_eq!(state.current_frame_index, 2, "stays on last frame");
    }

    // ── PingPong mode ────────────────────────────────────────────────

    #[test]
    fn ping_pong_bounces_and_reports_finished_at_start() {
        let clip = ping_pong_clip(); // frames [0,1,2], 1 tick each
        let mut state = AnimationState::new("idle");
        // forward: 0→1→2
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
        assert_eq!(state.current_frame_index, 1);
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
        assert_eq!(state.current_frame_index, 2);
        // turn around: 2→1
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
        assert_eq!(state.current_frame_index, 1);
        // return to 0 → ClipFinished
        let outcome = tick_animation(&clip, &mut state);
        assert_eq!(outcome, AnimationTickOutcome::ClipFinished { clip_name: "idle".into() });
        assert_eq!(state.current_frame_index, 0);
        assert!(state.ping_pong_forward, "direction resets to forward after completing a cycle");
    }

    #[test]
    fn ping_pong_single_frame_is_noop() {
        let clip = AnimationClip::new(vec![5], 1, LoopMode::PingPong);
        let mut state = AnimationState::new("still");
        for _ in 0..10 {
            assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
            assert_eq!(state.current_frame_index, 0);
        }
    }

    // ── Empty clip / not playing ──────────────────────────────────────

    #[test]
    fn empty_clip_is_noop() {
        let clip = AnimationClip::new(vec![], 1, LoopMode::Loop);
        let mut state = AnimationState::new("empty");
        assert_eq!(tick_animation(&clip, &mut state), AnimationTickOutcome::Playing);
    }

    #[test]
    fn not_playing_is_noop() {
        let clip = walk_clip();
        let mut state = AnimationState::new("walk");
        state.playing = false;
        tick_animation(&clip, &mut state);
        assert_eq!(state.current_frame_index, 0);
    }

    // ── AnimationComponent ───────────────────────────────────────────

    #[test]
    fn component_current_sprite_frame_returns_first_frame() {
        let comp = AnimationComponent::new("walk", walk_clip());
        assert_eq!(comp.current_sprite_frame(), Some(0));
    }

    #[test]
    fn component_set_state_resets_playback() {
        let mut comp = AnimationComponent::new("walk", walk_clip());
        comp.clips.insert("idle".into(), once_clip());
        // Advance walk a few ticks
        if let Some(clip) = comp.clips.get(&comp.state.current_clip_name.clone()) {
            let clip = clip.clone();
            tick_animation(&clip, &mut comp.state);
            tick_animation(&clip, &mut comp.state);
        }
        assert!(comp.state.current_frame_index > 0 || comp.state.ticks_in_frame > 0);
        // Switch to idle
        assert!(comp.set_state("idle"));
        assert_eq!(comp.state.current_clip_name, "idle");
        assert_eq!(comp.state.current_frame_index, 0);
        assert_eq!(comp.state.ticks_in_frame, 0);
    }

    #[test]
    fn component_set_state_returns_false_for_missing_clip() {
        let mut comp = AnimationComponent::new("walk", walk_clip());
        assert!(!comp.set_state("nonexistent"));
        assert_eq!(comp.state.current_clip_name, "walk");
    }

    // ── Serialization ────────────────────────────────────────────────

    #[test]
    fn animation_component_serialization_roundtrip() {
        let comp = AnimationComponent::new("walk", walk_clip());
        let json = serde_json::to_string(&comp).expect("serialize");
        let deser: AnimationComponent = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(comp, deser);
    }

    #[test]
    fn transition_serialization_roundtrip() {
        let t = AnimationTransition {
            from_state: "walk".into(),
            to_state: "idle".into(),
            condition: TransitionCondition::FlagSet { flag: "is_stopped".into() },
        };
        let json = serde_json::to_string(&t).expect("serialize");
        let deser: AnimationTransition = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(t, deser);
    }

    #[test]
    fn ticks_in_state_increments_and_resets_on_state_change() {
        let mut comp = AnimationComponent::new("walk", walk_clip());
        comp.clips.insert("idle".into(), walk_clip());
        let clip = comp.clips.get("walk").expect("walk clip").clone();

        tick_animation(&clip, &mut comp.state);
        tick_animation(&clip, &mut comp.state);
        assert_eq!(comp.state.ticks_in_state, 2);

        assert!(comp.set_state("idle"));
        assert_eq!(comp.state.ticks_in_state, 0);
    }
}
