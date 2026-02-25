/**
 * DashboardController -- manages the welcome dashboard overlay.
 * Boot-once: overlay visibility only; does not re-bootstrap the editor.
 * Governs: UI-DASH-001, UI-DASH-002
 */
import { renderDashboard } from './dashboard-panel.js';
export class DashboardController {
    store;
    overlayEl;
    onDismiss;
    unsubscribeStore;
    clickHandler;
    changeHandler;
    constructor(store, overlayEl, onDismiss) {
        this.store = store;
        this.overlayEl = overlayEl;
        this.onDismiss = onDismiss;
        this.clickHandler = (event) => {
            const target = event.target?.closest('[data-action]');
            const action = target?.dataset?.['action'];
            if (!action)
                return;
            if (action === 'new-project' || action === 'dismiss-dashboard') {
                this.hide();
                this.onDismiss();
            }
            else if (action === 'open-recent') {
                // MVP: treat as dismiss only; no project switching yet
                this.hide();
                this.onDismiss();
            }
            // open-project, open-sample, template buttons are disabled in HTML; no handler needed
        };
        this.changeHandler = (event) => {
            const target = event.target;
            if (target?.dataset?.['action'] === 'dont-show-again') {
                store.setPreferences({ showDashboardOnLaunch: !target.checked });
                if (target.checked) {
                    this.hide();
                    this.onDismiss();
                }
            }
        };
        overlayEl.addEventListener('click', this.clickHandler);
        overlayEl.addEventListener('change', this.changeHandler);
        this.unsubscribeStore = store.subscribe(() => this.refresh());
        // Boot routing: decide initial visibility
        const prefs = store.getPreferences();
        if (prefs.openLastProjectOnLaunch && store.getRecents().length > 0) {
            // Recents are local metadata only; skip dashboard, go direct to editor
            this.hide();
            this.onDismiss();
        }
        else if (prefs.showDashboardOnLaunch) {
            this.show();
        }
        else {
            this.hide();
            this.onDismiss();
        }
    }
    show() {
        this.overlayEl.style.display = '';
        this.refresh();
    }
    hide() {
        this.overlayEl.style.display = 'none';
    }
    refresh() {
        const prefs = this.store.getPreferences();
        const recents = this.store.getRecents();
        this.overlayEl.innerHTML = renderDashboard(recents, prefs);
    }
    dispose() {
        this.unsubscribeStore();
        this.overlayEl.removeEventListener('click', this.clickHandler);
        this.overlayEl.removeEventListener('change', this.changeHandler);
    }
}
//# sourceMappingURL=dashboard-controller.js.map