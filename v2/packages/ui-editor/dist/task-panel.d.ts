import type { EditorTask } from '@gcs/contracts';
/**
 * Build minimal HTML for the Tasks tab from normalized EditorTask records.
 * This keeps the view layer thin and deterministic while the full shell is built.
 */
export declare function renderTasksPanel(tasks: readonly EditorTask[]): string;
/**
 * Resolve and apply a fix action from a task list by ID.
 * Returns false if task ID does not exist, or when the app-level apply rejects it.
 */
export declare function applyTaskFixById(tasks: readonly EditorTask[], taskId: string, applyFix: (task: EditorTask) => boolean): boolean;
//# sourceMappingURL=task-panel.d.ts.map