/**
 * OnboardingStore -- persists onboarding state, preferences, and recent projects.
 * UI-only; no cross-boundary contracts needed.
 * Governs: UI-ONBOARD-001, UI-ONBOARD-002, UI-ONBOARD-003, UI-DASH-001, UI-DASH-002
 */
const STORAGE_KEY = 'gcs-v2-onboarding';
const MAX_RECENTS = 5;
const DEFAULT_PREFERENCES = {
    showDashboardOnLaunch: true,
    showFirstRunTips: true,
    showProjectChecklist: true,
    enableGuidedTourOverlays: true,
    mode: 'beginner',
    openLastProjectOnLaunch: false,
    showFlowHint: true,
};
// UI-PLAYFLOW-001: added 'playable-scene-ready' step (step count 5 -> 6).
// Existing stored state with 5 steps will reset to these defaults on first load.
const DEFAULT_STEPS = [
    { id: 'project-created', label: 'Create or open a project', complete: false },
    { id: 'tile-painted', label: 'Paint a tile on the map', complete: false },
    { id: 'entity-created', label: 'Place an entity', complete: false },
    { id: 'playable-scene-ready', label: 'Set up a playable scene (Add Starter Scene)', complete: false },
    { id: 'project-saved', label: 'Save the project', complete: false },
    { id: 'playtest-entered', label: 'Enter play mode', complete: false },
];
export class OnboardingStore {
    state;
    listeners = [];
    storage;
    constructor(storage) {
        this.storage = storage;
        this.state = this.load();
    }
    load() {
        try {
            const raw = this.storage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const merged = { ...DEFAULT_PREFERENCES, ...(parsed.preferences ?? {}) };
                // Sanitize: ensure mode is a valid value
                if (merged.mode !== 'beginner' && merged.mode !== 'pro') {
                    merged.mode = DEFAULT_PREFERENCES.mode;
                }
                return {
                    preferences: merged,
                    steps: parsed.steps && parsed.steps.length === DEFAULT_STEPS.length
                        ? parsed.steps
                        : DEFAULT_STEPS.map((s) => ({ ...s })),
                    recents: parsed.recents ?? [],
                };
            }
        }
        catch {
            // Corrupt storage -- reset silently
        }
        return {
            preferences: { ...DEFAULT_PREFERENCES },
            steps: DEFAULT_STEPS.map((s) => ({ ...s })),
            recents: [],
        };
    }
    save() {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        for (const fn of this.listeners)
            fn();
    }
    subscribe(fn) {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
    }
    getPreferences() {
        return this.state.preferences;
    }
    setPreferences(partial) {
        const next = { ...this.state.preferences, ...partial };
        if (next.mode !== 'beginner' && next.mode !== 'pro') {
            next.mode = DEFAULT_PREFERENCES.mode;
        }
        this.state.preferences = next;
        this.save();
    }
    resetPreferences() {
        this.state.preferences = { ...DEFAULT_PREFERENCES };
        this.save();
    }
    getSteps() {
        return this.state.steps;
    }
    markStepComplete(id) {
        const step = this.state.steps.find((s) => s.id === id);
        if (step && !step.complete) {
            step.complete = true;
            this.save();
        }
    }
    resetSteps() {
        this.state.steps = DEFAULT_STEPS.map((s) => ({ ...s }));
        this.save();
    }
    getRecents() {
        return this.state.recents;
    }
    pushRecent(project) {
        this.state.recents = [
            project,
            ...this.state.recents.filter((r) => r.id !== project.id),
        ].slice(0, MAX_RECENTS);
        this.save();
    }
    resetAll() {
        this.state = {
            preferences: { ...DEFAULT_PREFERENCES },
            steps: DEFAULT_STEPS.map((s) => ({ ...s })),
            recents: this.state.recents, // keep recents on preference reset
        };
        this.save();
    }
}
export function createOnboardingStore(storage) {
    return new OnboardingStore(storage);
}
//# sourceMappingURL=onboarding-store.js.map