import type { BehaviorRow, BehaviorTraceEntry, BehaviorEvalOverflow, EntityDef, InteractionEvent, TileLayer, InputState, WorldSnapshot, PlaytestStatus } from '@gcs/contracts';
/**
 * PlaytestRunner -- TS mirror of Rust PlaytestWorld.
 * Runs the simulation loop: input -> movement -> collision -> physics.
 * Will be replaced by WASM bridge once wasm-pack is wired.
 */
export declare class PlaytestRunner {
    private readonly proximityRadius;
    private status;
    private tick;
    private entities;
    private tileLayer;
    private tileSize;
    private physics;
    private input;
    private lastInteractPressed;
    private readonly staleGuardMax;
    private behaviors;
    private readonly evaluator;
    private lastStepOverflow;
    /** Initialize from project state. */
    init(entities: EntityDef[], tileLayers: TileLayer[], tileSize: number): void;
    enter(): boolean;
    exit(): void;
    getLastStepOverflow(): BehaviorEvalOverflow;
    setBehaviors(behaviors: Record<string, BehaviorRow[]>): void;
    getTrace(): readonly BehaviorTraceEntry[];
    clearTrace(): void;
    pause(): boolean;
    resume(): boolean;
    setInput(input: InputState): void;
    setGravity(x: number, y: number): void;
    getStatus(): PlaytestStatus;
    /** Run one simulation tick. Returns the world snapshot. */
    step(): WorldSnapshot | null;
    snapshot(interactions?: InteractionEvent[]): WorldSnapshot;
    private collectInteractionsForStep;
    private findInteractableNearPlayer;
    private collectSolidTiles;
    private toEntityDefs;
    private applyDispatchedActionsFromTrace;
    private mergeOverflows;
    private resolveMove;
    private collectProximityEntityIds;
}
//# sourceMappingURL=playtest-runner.d.ts.map