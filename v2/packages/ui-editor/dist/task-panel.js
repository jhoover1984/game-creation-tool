function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function severityLabel(severity) {
    switch (severity) {
        case 'fatal':
            return 'Fatal';
        case 'error':
            return 'Error';
        case 'warning':
            return 'Warning';
        default:
            return 'Info';
    }
}
function categoryLabel(category) {
    switch (category) {
        case 'topology':
            return 'Topology';
        case 'reference':
            return 'Reference';
        case 'bounds':
            return 'Bounds';
        case 'workflow':
            return 'Workflow';
        case 'validation':
            return 'Validation';
        case 'runtime':
            return 'Runtime';
        case 'interaction':
            return 'Interaction';
        case 'persistence':
            return 'Persistence';
        default:
            return 'General';
    }
}
/**
 * Build minimal HTML for the Tasks tab from normalized EditorTask records.
 * This keeps the view layer thin and deterministic while the full shell is built.
 */
export function renderTasksPanel(tasks) {
    if (tasks.length === 0) {
        return '<p class="empty-state">No diagnostics. Your project looks clean.</p>';
    }
    const items = tasks
        .map((task) => {
        const label = escapeHtml(task.label);
        const severity = severityLabel(task.severity);
        const category = escapeHtml(categoryLabel(task.category));
        const fixButton = task.fixAction
            ? `<button data-task-id="${escapeHtml(task.id)}">Fix</button>`
            : '';
        return `<li data-severity="${task.severity}" data-category="${escapeHtml(task.category ?? 'unknown')}" data-task-id="${escapeHtml(task.id)}"><strong>${severity}</strong> [${category}]: ${label}${fixButton}</li>`;
    })
        .join('');
    return `<ul class="tasks-list">${items}</ul>`;
}
/**
 * Resolve and apply a fix action from a task list by ID.
 * Returns false if task ID does not exist, or when the app-level apply rejects it.
 */
export function applyTaskFixById(tasks, taskId, applyFix) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task)
        return false;
    return applyFix(task);
}
//# sourceMappingURL=task-panel.js.map