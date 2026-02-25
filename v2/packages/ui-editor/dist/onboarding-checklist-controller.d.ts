/**
 * OnboardingChecklistController -- subscribes to app events and updates checklist.
 * Bus events used only for reliably-emitted types (entity:created, tile:set:done).
 * All other step triggers are driven by explicit shell hooks.
 * Governs: UI-ONBOARD-001, UI-ONBOARD-002, UI-ONBOARD-003, UI-PLAYFLOW-001
 */
import type { GameEvent } from '@gcs/contracts';
import { OnboardingStore } from './onboarding-store.js';
export interface OnboardingChecklistAppAdapter {
    subscribe(fn: (event: GameEvent) => void): () => void;
}
export declare class OnboardingChecklistController {
    private readonly store;
    private readonly container;
    private readonly unsubscribeApp;
    private readonly unsubscribeStore;
    private readonly clickHandler;
    private readonly onAction?;
    constructor(app: OnboardingChecklistAppAdapter, store: OnboardingStore, container: HTMLElement, onAction?: (action: string) => void);
    /** Called by shell when a new project is created or loaded. */
    notifyProjectCreated(): void;
    /** Called by shell when the project is saved. */
    notifyProjectSaved(): void;
    /** Called by shell when playtest is entered. */
    notifyPlaytestEntered(): void;
    /** Called by shell when the starter scene (ground + player) is created. UI-PLAYFLOW-001. */
    notifyStarterSceneCreated(): void;
    refresh(): void;
    dispose(): void;
}
//# sourceMappingURL=onboarding-checklist-controller.d.ts.map