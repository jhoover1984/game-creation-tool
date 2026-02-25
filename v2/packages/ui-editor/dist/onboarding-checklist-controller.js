/**
 * OnboardingChecklistController -- subscribes to app events and updates checklist.
 * Bus events used only for reliably-emitted types (entity:created, tile:set:done).
 * All other step triggers are driven by explicit shell hooks.
 * Governs: UI-ONBOARD-001, UI-ONBOARD-002, UI-ONBOARD-003, UI-PLAYFLOW-001
 */
import { renderOnboardingChecklist } from './onboarding-checklist-panel.js';
export class OnboardingChecklistController {
    store;
    container;
    unsubscribeApp;
    unsubscribeStore;
    clickHandler;
    onAction;
    constructor(app, store, container, onAction) {
        this.store = store;
        this.container = container;
        this.onAction = onAction;
        // Bus events that are reliably emitted
        this.unsubscribeApp = app.subscribe((event) => {
            if (event.type === 'entity:created') {
                this.store.markStepComplete('entity-created');
            }
            else if (event.type === 'tile:set:done') {
                this.store.markStepComplete('tile-painted');
            }
            // Note: store.subscribe handles refresh via its own notify
        });
        this.unsubscribeStore = store.subscribe(() => this.refresh());
        this.clickHandler = (event) => {
            const target = event.target?.closest('[data-action]');
            const action = target?.dataset?.['action'];
            if (!action)
                return;
            if (action === 'toggle-mode') {
                const current = store.getPreferences().mode;
                store.setPreferences({ mode: current === 'beginner' ? 'pro' : 'beginner' });
            }
            else if (action === 'reset-onboarding') {
                store.resetAll();
            }
            else if (action === 'dismiss-checklist') {
                store.setPreferences({ showProjectChecklist: false });
            }
            else if (action === 'dismiss-flow-hint') {
                store.setPreferences({ showFlowHint: false });
            }
            else {
                // Delegate unknown actions (e.g. 'add-starter') to the shell via onAction callback.
                this.onAction?.(action);
            }
        };
        container.addEventListener('click', this.clickHandler);
        this.refresh();
    }
    /** Called by shell when a new project is created or loaded. */
    notifyProjectCreated() {
        this.store.markStepComplete('project-created');
    }
    /** Called by shell when the project is saved. */
    notifyProjectSaved() {
        this.store.markStepComplete('project-saved');
    }
    /** Called by shell when playtest is entered. */
    notifyPlaytestEntered() {
        this.store.markStepComplete('playtest-entered');
    }
    /** Called by shell when the starter scene (ground + player) is created. UI-PLAYFLOW-001. */
    notifyStarterSceneCreated() {
        this.store.markStepComplete('playable-scene-ready');
    }
    refresh() {
        const prefs = this.store.getPreferences();
        if (!prefs.showProjectChecklist) {
            this.container.innerHTML = '';
            return;
        }
        this.container.innerHTML = renderOnboardingChecklist(this.store.getSteps(), prefs.mode, prefs);
    }
    dispose() {
        this.unsubscribeApp();
        this.unsubscribeStore();
        this.container.removeEventListener('click', this.clickHandler);
    }
}
//# sourceMappingURL=onboarding-checklist-controller.js.map