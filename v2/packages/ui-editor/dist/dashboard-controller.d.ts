/**
 * DashboardController -- manages the welcome dashboard overlay.
 * Boot-once: overlay visibility only; does not re-bootstrap the editor.
 * Governs: UI-DASH-001, UI-DASH-002
 */
import { OnboardingStore } from './onboarding-store.js';
export declare class DashboardController {
    private readonly store;
    private readonly overlayEl;
    private readonly onDismiss;
    private readonly unsubscribeStore;
    private readonly clickHandler;
    private readonly changeHandler;
    constructor(store: OnboardingStore, overlayEl: HTMLElement, onDismiss: () => void);
    show(): void;
    hide(): void;
    refresh(): void;
    dispose(): void;
}
//# sourceMappingURL=dashboard-controller.d.ts.map