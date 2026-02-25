/**
 * behavior-panel.ts -- pure render functions for the Behavior panel.
 * Governs: BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001
 */
import type { BehaviorRow, BehaviorTraceEntry } from '@gcs/contracts';
/**
 * Render the behavior panel for either edit or playtest mode.
 * @param entityId - ID of the selected entity, or null if none.
 * @param rows     - Behavior rows for the selected entity.
 * @param mode     - 'edit' when editing, 'playtest' when playtest is active.
 * @param trace    - Current trace buffer from the evaluator.
 */
export declare function renderBehaviorPanel(entityId: string | null, rows: BehaviorRow[], mode: 'edit' | 'playtest', trace: readonly BehaviorTraceEntry[]): string;
//# sourceMappingURL=behavior-panel.d.ts.map