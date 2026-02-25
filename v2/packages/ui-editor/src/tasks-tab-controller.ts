import type { EditorTask } from '@gcs/contracts';
import { applyTaskFixById, renderTasksPanel } from './task-panel.js';

export interface TasksTabAppAdapter {
  getTasks(): EditorTask[];
  applyFix(task: EditorTask): boolean;
}

/**
 * Minimal controller for wiring the Tasks panel into a shell container.
 * This keeps UI-TASKS view behavior modular while the full shell is assembled.
 */
export class TasksTabController {
  private readonly app: TasksTabAppAdapter;
  private readonly container: HTMLElement;
  private readonly clickHandler: (event: Event) => void;

  constructor(app: TasksTabAppAdapter, container: HTMLElement) {
    this.app = app;
    this.container = container;
    this.clickHandler = (event: Event) => {
      const target = event.target as { dataset?: Record<string, string | undefined> } | null;
      const taskId = target?.dataset?.taskId;
      if (!taskId) return;

      const tasks = this.app.getTasks();
      const applied = applyTaskFixById(tasks, taskId, (task) => this.app.applyFix(task));
      if (applied) {
        this.refresh();
      }
    };

    this.container.addEventListener('click', this.clickHandler);
    this.refresh();
  }

  refresh(): void {
    this.container.innerHTML = renderTasksPanel(this.app.getTasks());
  }

  dispose(): void {
    this.container.removeEventListener('click', this.clickHandler);
  }
}

