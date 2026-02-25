/**
 * OnboardingStore -- persists onboarding state, preferences, and recent projects.
 * UI-only; no cross-boundary contracts needed.
 * Governs: UI-ONBOARD-001, UI-ONBOARD-002, UI-ONBOARD-003, UI-DASH-001, UI-DASH-002
 */

const STORAGE_KEY = 'gcs-v2-onboarding';
const MAX_RECENTS = 5;

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

const DEFAULT_PREFERENCES: OnboardingPreferences = {
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
const DEFAULT_STEPS: OnboardingStep[] = [
  { id: 'project-created', label: 'Create or open a project', complete: false },
  { id: 'tile-painted', label: 'Paint a tile on the map', complete: false },
  { id: 'entity-created', label: 'Place an entity', complete: false },
  { id: 'playable-scene-ready', label: 'Set up a playable scene (Add Starter Scene)', complete: false },
  { id: 'project-saved', label: 'Save the project', complete: false },
  { id: 'playtest-entered', label: 'Enter play mode', complete: false },
];

interface StoredState {
  preferences: OnboardingPreferences;
  steps: OnboardingStep[];
  recents: RecentProject[];
}

type Listener = () => void;

export class OnboardingStore {
  private state: StoredState;
  private listeners: Listener[] = [];
  private storage: StorageLike;

  constructor(storage: StorageLike) {
    this.storage = storage;
    this.state = this.load();
  }

  private load(): StoredState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState>;
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
    } catch {
      // Corrupt storage -- reset silently
    }
    return {
      preferences: { ...DEFAULT_PREFERENCES },
      steps: DEFAULT_STEPS.map((s) => ({ ...s })),
      recents: [],
    };
  }

  private save(): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    for (const fn of this.listeners) fn();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  getPreferences(): Readonly<OnboardingPreferences> {
    return this.state.preferences;
  }

  setPreferences(partial: Partial<OnboardingPreferences>): void {
    const next = { ...this.state.preferences, ...partial };
    if (next.mode !== 'beginner' && next.mode !== 'pro') {
      next.mode = DEFAULT_PREFERENCES.mode;
    }
    this.state.preferences = next;
    this.save();
  }

  resetPreferences(): void {
    this.state.preferences = { ...DEFAULT_PREFERENCES };
    this.save();
  }

  getSteps(): readonly OnboardingStep[] {
    return this.state.steps;
  }

  markStepComplete(id: string): void {
    const step = this.state.steps.find((s) => s.id === id);
    if (step && !step.complete) {
      step.complete = true;
      this.save();
    }
  }

  resetSteps(): void {
    this.state.steps = DEFAULT_STEPS.map((s) => ({ ...s }));
    this.save();
  }

  getRecents(): readonly RecentProject[] {
    return this.state.recents;
  }

  pushRecent(project: RecentProject): void {
    this.state.recents = [
      project,
      ...this.state.recents.filter((r) => r.id !== project.id),
    ].slice(0, MAX_RECENTS);
    this.save();
  }

  resetAll(): void {
    this.state = {
      preferences: { ...DEFAULT_PREFERENCES },
      steps: DEFAULT_STEPS.map((s) => ({ ...s })),
      recents: this.state.recents, // keep recents on preference reset
    };
    this.save();
  }
}

export function createOnboardingStore(storage: StorageLike): OnboardingStore {
  return new OnboardingStore(storage);
}
