import type { EditorTask } from '@gcs/contracts';
export interface TasksTabAppAdapter {
    getTasks(): EditorTask[];
    applyFix(task: EditorTask): boolean;
}
/**
 * Minimal controller for wiring the Tasks panel into a shell container.
 * This keeps UI-TASKS view behavior modular while the full shell is assembled.
 */
export declare class TasksTabController {
    private readonly app;
    private readonly container;
    private readonly clickHandler;
    constructor(app: TasksTabAppAdapter, container: HTMLElement);
    refresh(): void;
    dispose(): void;
}
//# sourceMappingURL=tasks-tab-controller.d.ts.map