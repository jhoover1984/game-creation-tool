/**
 * Behavior IR types for GCS v2.
 * Governs: BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001
 *
 * Phase 3 MVP execution scope:
 *   - Trigger: on:tick (others stored, evaluated as stubs)
 *   - Condition: always, entity_has_tag (entity_in_radius stored, stub)
 *   - Action: log (set_velocity, destroy_self stored, stubs)
 */
export type TriggerType = 'on:tick' | 'on:interact' | 'on:collision' | 'on:proximity';
export type TargetSelector = {
    type: 'this';
} | {
    type: 'tag';
    value: string;
} | {
    type: 'radius';
    value: number;
};
export type ConditionType = 'always' | 'entity_has_tag' | 'entity_in_radius';
export type ActionType = 'log' | 'set_velocity' | 'destroy_self';
export interface TriggerDef {
    type: TriggerType;
}
export interface ConditionDef {
    id: string;
    type: ConditionType;
    target: TargetSelector;
    negate?: boolean;
}
export interface ActionDef {
    id: string;
    type: ActionType;
    target: TargetSelector;
    params: Record<string, unknown>;
}
export interface BehaviorRow {
    id: string;
    label: string;
    enabled: boolean;
    trigger: TriggerDef;
    conditions: ConditionDef[];
    actions: ActionDef[];
}
export interface BehaviorTraceEntry {
    rowId: string;
    entityId: string;
    triggerType: TriggerType;
    conditionResults: {
        id: string;
        type: ConditionType;
        passed: boolean;
        reason: string;
    }[];
    actionResults: {
        id: string;
        type: ActionType;
        dispatched: boolean;
        reason: string;
    }[];
    timestamp: number;
}
/**
 * Overflow report produced by BehaviorEvaluator after each evaluate() call.
 * Playtest-time only; cleared and recomputed on each step.
 *
 * rowCapHit: true when the global row evaluation cap (256) was reached this call.
 * actionCapHits: deduplicated (entityId, rowId) pairs where the per-row action cap (16) was exceeded.
 */
export interface BehaviorEvalOverflow {
    rowCapHit: boolean;
    actionCapHits: readonly {
        entityId: string;
        rowId: string;
    }[];
}
//# sourceMappingURL=behavior.d.ts.map