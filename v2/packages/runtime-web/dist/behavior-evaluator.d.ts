/**
 * BehaviorEvaluator -- deterministic behavior row evaluation.
 * Governs: BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001
 *
 * MVP scope: on:tick trigger, always/entity_has_tag conditions, log action.
 * Expanded scope: on:interact/on:collision trigger filtering and actionable
 * dispatch metadata for set_velocity/destroy_self (execution occurs in runner).
 * Remaining unimplemented trigger/condition/action shapes are stubbed with reason.
 * Trace buffer is ring-capped at maxTrace to avoid unbounded memory growth.
 * Evaluation NEVER mutates entity state.
 *
 * ConditionDef.target semantics for entity_has_tag:
 *   target: { type: 'tag', value: 'X' } -> check if row-owner entity.tags includes 'X'
 */
import type { BehaviorRow, BehaviorTraceEntry, BehaviorEvalOverflow, TriggerType, EntityDef } from '@gcs/contracts';
export declare class BehaviorEvaluator {
    private readonly maxTrace;
    private readonly maxRowsPerEvaluate;
    private readonly maxActionsPerRow;
    private traceBuffer;
    private lastOverflow;
    /**
     * Evaluate all behavior rows for the given trigger type.
     * Returns only the entries produced this call; full history via getTrace().
     */
    evaluate(behaviors: Record<string, BehaviorRow[]>, entities: EntityDef[], trigger: TriggerType, triggerEntityIds?: ReadonlySet<string>): BehaviorTraceEntry[];
    getTrace(): readonly BehaviorTraceEntry[];
    clearTrace(): void;
    /** Return the overflow report from the most recent evaluate() call. */
    getLastOverflow(): BehaviorEvalOverflow;
    private evaluateConditions;
    private evaluateActions;
    private getNumberParam;
}
//# sourceMappingURL=behavior-evaluator.d.ts.map