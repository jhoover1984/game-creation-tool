function newPlayback(clip) {
    return {
        clipName: clip.name,
        currentFrame: 0,
        elapsed: 0,
        finished: false,
        direction: 1,
    };
}
function tickPlayback(state, clip, dt) {
    if (state.finished)
        return state.currentFrame;
    state.elapsed += dt;
    const frameDuration = 1 / clip.fps;
    while (state.elapsed >= frameDuration) {
        state.elapsed -= frameDuration;
        const next = state.currentFrame + state.direction;
        switch (clip.loopMode) {
            case 'once':
                if (next >= clip.frameCount) {
                    state.currentFrame = clip.frameCount - 1;
                    state.finished = true;
                    return state.currentFrame;
                }
                state.currentFrame = next;
                break;
            case 'loop':
                state.currentFrame = ((next % clip.frameCount) + clip.frameCount) % clip.frameCount;
                break;
            case 'pingpong':
                if (next >= clip.frameCount) {
                    state.direction = -1;
                    state.currentFrame = Math.max(0, clip.frameCount - 2);
                }
                else if (next < 0) {
                    state.direction = 1;
                    state.currentFrame = Math.min(1, clip.frameCount - 1);
                }
                else {
                    state.currentFrame = next;
                }
                break;
        }
    }
    return state.currentFrame;
}
function shouldTransition(condition, clipFinished, triggers, params) {
    switch (condition.type) {
        case 'onComplete':
            return clipFinished;
        case 'onTrigger':
            return triggers.includes(condition.trigger);
        case 'onThreshold': {
            const val = params.get(condition.param);
            return val !== undefined && val > condition.above;
        }
    }
}
/**
 * AnimationPlayer -- TS mirror of Rust AnimationStateMachine.
 * Manages clip playback with transition evaluation per tick.
 */
export class AnimationPlayer {
    clips;
    transitions;
    playback = null;
    activeTriggers = [];
    params = new Map();
    constructor(clips, transitions) {
        this.clips = clips;
        this.transitions = transitions;
        if (clips.length > 0) {
            this.playback = newPlayback(clips[0]);
        }
    }
    /** Set the active clip by name. Resets playback. */
    setClip(name) {
        const clip = this.clips.find((c) => c.name === name);
        if (clip) {
            this.playback = newPlayback(clip);
        }
    }
    /** Fire a trigger (consumed after one tick evaluation). */
    setTrigger(name) {
        this.activeTriggers.push(name);
    }
    /** Set a named parameter value. */
    setParam(name, value) {
        this.params.set(name, value);
    }
    /** Get the current clip name, if any. */
    currentClip() {
        return this.playback?.clipName ?? null;
    }
    /** Get the current frame index. */
    currentFrame() {
        return this.playback?.currentFrame ?? 0;
    }
    /** Whether the current clip has finished (only meaningful for 'once' mode). */
    isFinished() {
        return this.playback?.finished ?? true;
    }
    /** Advance the state machine by `dt` seconds. Returns current frame index. */
    tick(dt) {
        if (!this.playback)
            return 0;
        const clip = this.clips.find((c) => c.name === this.playback.clipName);
        if (!clip)
            return 0;
        const frame = tickPlayback(this.playback, clip, dt);
        // Check transitions
        const currentName = this.playback.clipName;
        const clipFinished = this.playback.finished;
        const fired = this.transitions.find((t) => t.fromClip === currentName &&
            shouldTransition(t.condition, clipFinished, this.activeTriggers, this.params));
        if (fired) {
            const nextClip = this.clips.find((c) => c.name === fired.toClip);
            if (nextClip) {
                this.playback = newPlayback(nextClip);
            }
        }
        // Consume triggers
        this.activeTriggers.length = 0;
        return this.playback?.currentFrame ?? frame;
    }
}
//# sourceMappingURL=animation-player.js.map