use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum LoopMode {
    Once,
    Loop,
    PingPong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationClip {
    pub name: String,
    pub frame_count: u32,
    pub fps: f32,
    pub loop_mode: LoopMode,
}

#[derive(Debug, Clone)]
pub struct PlaybackState {
    pub clip_name: String,
    pub current_frame: u32,
    pub elapsed: f32,
    pub finished: bool,
    direction: i8, // 1 = forward, -1 = reverse (pingpong)
}

impl PlaybackState {
    pub fn new(clip: &AnimationClip) -> Self {
        Self {
            clip_name: clip.name.clone(),
            current_frame: 0,
            elapsed: 0.0,
            finished: false,
            direction: 1,
        }
    }

    /// Advance the playback by `dt` seconds. Returns the current frame index.
    pub fn tick(&mut self, clip: &AnimationClip, dt: f32) -> u32 {
        if self.finished {
            return self.current_frame;
        }

        self.elapsed += dt;
        let frame_duration = 1.0 / clip.fps;
        let total_frames = clip.frame_count;

        while self.elapsed >= frame_duration {
            self.elapsed -= frame_duration;

            let next = self.current_frame as i32 + self.direction as i32;

            match clip.loop_mode {
                LoopMode::Once => {
                    if next >= total_frames as i32 {
                        self.current_frame = total_frames - 1;
                        self.finished = true;
                        return self.current_frame;
                    }
                    self.current_frame = next as u32;
                }
                LoopMode::Loop => {
                    self.current_frame = next.rem_euclid(total_frames as i32) as u32;
                }
                LoopMode::PingPong => {
                    if next >= total_frames as i32 {
                        self.direction = -1;
                        self.current_frame = total_frames.saturating_sub(2);
                    } else if next < 0 {
                        self.direction = 1;
                        self.current_frame = 1.min(total_frames - 1);
                    } else {
                        self.current_frame = next as u32;
                    }
                }
            }
        }

        self.current_frame
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_clip(mode: LoopMode) -> AnimationClip {
        AnimationClip {
            name: "walk".into(),
            frame_count: 4,
            fps: 10.0,
            loop_mode: mode,
        }
    }

    #[test]
    fn once_finishes() {
        let clip = test_clip(LoopMode::Once);
        let mut state = PlaybackState::new(&clip);
        // Advance enough to finish all frames
        for _ in 0..10 {
            state.tick(&clip, 0.1);
        }
        assert!(state.finished);
        assert_eq!(state.current_frame, 3);
    }

    #[test]
    fn pingpong_reverses() {
        let clip = test_clip(LoopMode::PingPong);
        let mut state = PlaybackState::new(&clip);
        let mut frames = vec![state.current_frame];
        // Advance through forward + reverse (8 ticks covers a full cycle)
        for _ in 0..8 {
            state.tick(&clip, 0.1);
            frames.push(state.current_frame);
        }
        // Should go 0,1,2,3,2,1,0,1,2
        assert!(!state.finished);
        // Verify it reversed at some point
        assert!(frames.windows(2).any(|w| w[1] < w[0]), "should reverse: {frames:?}");
    }

    #[test]
    fn loop_wraps() {
        let clip = test_clip(LoopMode::Loop);
        let mut state = PlaybackState::new(&clip);
        // Advance past frame_count
        for _ in 0..6 {
            state.tick(&clip, 0.1);
        }
        assert!(!state.finished);
        assert!(state.current_frame < 4);
    }
}
