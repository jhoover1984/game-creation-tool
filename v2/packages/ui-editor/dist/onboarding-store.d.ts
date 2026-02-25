/**
 * OnboardingStore -- persists onboarding state, preferences, and recent projects.
 * UI-only; no cross-boundary contracts needed.
 * Governs: UI-ONBOARD-001, UI-ONBOARD-002, UI-ONBOARD-003, UI-DASH-001, UI-DASH-002
 */
/** Minimal storage interface: only getItem/setItem needed. */
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export interface OnboardingPreferences {
    showDashboardOnLaunch: boolean;
    showFirstRunTips: boolean;
    showProjectChecklist: boolean;
    enableGuidedTourOverlays: boolean;
    mode: 'beginner' | 'pro';
    openLastProjectOnLaunch: boolean;
    /** Whether to show the playable-loop flow hint in the Getting Started panel. Dismissible. UI-PLAYFLOW-001. */
    showFlowHint: boolean;
}
export interface OnboardingStep {
    id: string;
    label: string;
    complete: boolean;
}
/** Stored metadata only; not authoritative until project is explicitly opened/repaired. */
export interface RecentProject {
    id: string;
    name: string;
    lastOpened: string;
    hasWarnings: boolean;
    hasErrors: boolean;
}
type Listener = () => void;
export declare class OnboardingStore {
    private state;
    private listeners;
    private storage;
    constructor(storage: StorageLike);
    private load;
    private save;
    subscribe(fn: Listener): () => void;
    getPreferences(): Readonly<OnboardingPreferences>;
    setPreferences(partial: Partial<OnboardingPreferences>): void;
    resetPreferences(): void;
    getSteps(): readonly OnboardingStep[];
    markStepComplete(id: string): void;
    resetSteps(): void;
    getRecents(): readonly RecentProject[];
    pushRecent(project: RecentProject): void;
    resetAll(): void;
}
export declare function createOnboardingStore(storage: StorageLike): OnboardingStore;
export {};
//# sourceMappingURL=onboarding-store.d.ts.map