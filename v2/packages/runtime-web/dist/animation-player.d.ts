import type { AnimationClipDef, AnimationTransitionDef } from '@gcs/contracts';
/**
 * AnimationPlayer -- TS mirror of Rust AnimationStateMachine.
 * Manages clip playback with transition evaluation per tick.
 */
export declare class AnimationPlayer {
    private clips;
    private transitions;
    private playback;
    private activeTriggers;
    private params;
    constructor(clips: AnimationClipDef[], transitions: AnimationTransitionDef[]);
    /** Set the active clip by name. Resets playback. */
    setClip(name: string): void;
    /** Fire a trigger (consumed after one tick evaluation). */
    setTrigger(name: string): void;
    /** Set a named parameter value. */
    setParam(name: string, value: number): void;
    /** Get the current clip name, if any. */
    currentClip(): string | null;
    /** Get the current frame index. */
    currentFrame(): number;
    /** Whether the current clip has finished (only meaningful for 'once' mode). */
    isFinished(): boolean;
    /** Advance the state machine by `dt` seconds. Returns current frame index. */
    tick(dt: number): number;
}
//# sourceMappingURL=animation-player.d.ts.map