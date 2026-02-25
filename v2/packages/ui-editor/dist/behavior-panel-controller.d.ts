/**
 * BehaviorPanelController -- manages the Behavior panel.
 * Governs: BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001
 *
 * - Edit mode: shows behavior rows for selected entity; dispatches CRUD commands.
 * - Playtest mode: shows trace entries from evaluator.
 * - Selection and deselection both route through notifyEntitySelected().
 */
import type { AnyCommand, BehaviorRow, BehaviorTraceEntry, GameEvent } from '@gcs/contracts';
export interface BehaviorPanelAppAdapter {
    subscribe(fn: (event: GameEvent) => void): () => void;
    dispatch(cmd: AnyCommand): void;
    getBehaviors(entityId: string): BehaviorRow[];
    getTrace(): readonly BehaviorTraceEntry[];
}
export declare class BehaviorPanelController {
    private readonly app;
    private readonly container;
    private readonly unsubscribeApp;
    private readonly clickHandler;
    private currentEntityId;
    private playtestMode;
    constructor(app: BehaviorPanelAppAdapter, container: HTMLElement);
    /** Called by shell when entity selection changes (selection or deselection). */
    notifyEntitySelected(entityId: string | null): void;
    /** Called by shell when playtest is entered. */
    notifyPlaytestEntered(): void;
    /** Called by shell when playtest is exited. */
    notifyPlaytestExited(): void;
    refresh(): void;
    dispose(): void;
    private generateId;
}
//# sourceMappingURL=behavior-panel-controller.d.ts.map