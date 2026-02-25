/** Playtest session state. */
export type PlaytestStatus = 'stopped' | 'running' | 'paused';
/** Snapshot of a single entity during playtest. */
export interface PlaytestEntitySnapshot {
    id: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
}
/** Full world snapshot after a tick (sent from simulation to renderer). */
export interface WorldSnapshot {
    tick: number;
    state: PlaytestStatus;
    entities: PlaytestEntitySnapshot[];
    interactions: InteractionEvent[];
}
/** Input state for the current frame. */
export interface InputState {
    moveX: number;
    moveY: number;
    interact?: boolean;
}
/** Movement mode for an entity. */
export type MovementMode = 'free' | {
    grid: number;
};
/** Interaction emitted during playtest step. */
export interface InteractionEvent {
    actorId: string;
    targetId: string;
    type: 'interact';
}
//# sourceMappingURL=playtest.d.ts.map