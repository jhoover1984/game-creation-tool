import { applyTaskFixById, renderTasksPanel } from './task-panel.js';
/**
 * Minimal controller for wiring the Tasks panel into a shell container.
 * This keeps UI-TASKS view behavior modular while the full shell is assembled.
 */
export class TasksTabController {
    app;
    container;
    clickHandler;
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.clickHandler = (event) => {
            const target = event.target;
            const taskId = target?.dataset?.taskId;
            if (!taskId)
                return;
            const tasks = this.app.getTasks();
            const applied = applyTaskFixById(tasks, taskId, (task) => this.app.applyFix(task));
            if (applied) {
                this.refresh();
            }
        };
        this.container.addEventListener('click', this.clickHandler);
        this.refresh();
    }
    refresh() {
        this.container.innerHTML = renderTasksPanel(this.app.getTasks());
    }
    dispose() {
        this.container.removeEventListener('click', this.clickHandler);
    }
}
//# sourceMappingURL=tasks-tab-controller.js.map