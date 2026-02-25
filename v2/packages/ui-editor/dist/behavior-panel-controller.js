/**
 * BehaviorPanelController -- manages the Behavior panel.
 * Governs: BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001
 *
 * - Edit mode: shows behavior rows for selected entity; dispatches CRUD commands.
 * - Playtest mode: shows trace entries from evaluator.
 * - Selection and deselection both route through notifyEntitySelected().
 */
import { renderBehaviorPanel } from './behavior-panel.js';
export class BehaviorPanelController {
    app;
    container;
    unsubscribeApp;
    clickHandler;
    currentEntityId = null;
    playtestMode = false;
    constructor(app, container) {
        this.app = app;
        this.container = container;
        // Bus events that trigger a refresh
        this.unsubscribeApp = app.subscribe((event) => {
            if (event.type === 'behavior:row:added' ||
                event.type === 'behavior:row:removed' ||
                event.type === 'behavior:row:updated') {
                this.refresh();
            }
            else if (event.type === 'entity:deleted') {
                // If the deleted entity was selected, deselect
                const payload = event.payload;
                if (payload.entityId === this.currentEntityId) {
                    this.currentEntityId = null;
                    this.refresh();
                }
            }
        });
        this.clickHandler = (event) => {
            const target = event.target?.closest('[data-action]');
            const action = target?.dataset?.['action'];
            if (!action)
                return;
            if (action === 'behavior:row:add' && this.currentEntityId) {
                const row = {
                    id: this.generateId(),
                    label: 'New Row',
                    enabled: true,
                    trigger: { type: 'on:tick' },
                    conditions: [
                        { id: this.generateId(), type: 'always', target: { type: 'this' } },
                    ],
                    actions: [
                        { id: this.generateId(), type: 'log', target: { type: 'this' }, params: {} },
                    ],
                };
                this.app.dispatch({ type: 'behavior:row:add', payload: { entityId: this.currentEntityId, row } });
            }
            else if (action === 'behavior:row:remove') {
                const rowId = target?.dataset?.['rowId'];
                if (rowId && this.currentEntityId) {
                    this.app.dispatch({ type: 'behavior:row:remove', payload: { entityId: this.currentEntityId, rowId } });
                }
            }
        };
        container.addEventListener('click', this.clickHandler);
        this.refresh();
    }
    /** Called by shell when entity selection changes (selection or deselection). */
    notifyEntitySelected(entityId) {
        this.currentEntityId = entityId;
        this.refresh();
    }
    /** Called by shell when playtest is entered. */
    notifyPlaytestEntered() {
        this.playtestMode = true;
        this.refresh();
    }
    /** Called by shell when playtest is exited. */
    notifyPlaytestExited() {
        this.playtestMode = false;
        this.refresh();
    }
    refresh() {
        const rows = this.currentEntityId
            ? this.app.getBehaviors(this.currentEntityId)
            : [];
        this.container.innerHTML = renderBehaviorPanel(this.currentEntityId, rows, this.playtestMode ? 'playtest' : 'edit', this.app.getTrace());
    }
    dispose() {
        this.unsubscribeApp();
        this.container.removeEventListener('click', this.clickHandler);
    }
    generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `beh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }
}
//# sourceMappingURL=behavior-panel-controller.js.map