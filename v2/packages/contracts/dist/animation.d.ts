/** Loop mode for animation clips. Must match Rust LoopMode enum. */
export type LoopMode = 'once' | 'loop' | 'pingpong';
/**
 * A single keyframe for a named anchor point on an animation clip (ANIM-ANCHOR-001).
 * Matches the animation.clip.v2.json schema anchor item shape.
 */
export interface AnchorKeyframe {
    frame: number;
    pos: {
        x: number;
        y: number;
    };
    rot?: number;
    flip?: boolean;
}
/** Animation clip definition. */
export interface AnimationClipDef {
    id: string;
    name: string;
    frameCount: number;
    fps: number;
    loopMode: LoopMode;
    /** Named attachment points, keyed by anchor name, with per-frame keyframes (ANIM-ANCHOR-001). */
    anchors?: Record<string, AnchorKeyframe[]>;
}
/** Transition condition types. Must match Rust TransitionCondition enum. */
export type TransitionCondition = {
    type: 'onComplete';
} | {
    type: 'onTrigger';
    trigger: string;
} | {
    type: 'onThreshold';
    param: string;
    above: number;
};
/** Animation transition between clips. */
export interface AnimationTransitionDef {
    fromClip: string;
    toClip: string;
    condition: TransitionCondition;
}
//# sourceMappingURL=animation.d.ts.map