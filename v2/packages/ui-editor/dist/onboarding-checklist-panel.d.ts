/**
 * Pure rendering functions for the onboarding checklist panel.
 * No state, no side effects.
 * Governs: UI-ONBOARD-001, UI-ONBOARD-002, UI-ONBOARD-003, UI-PLAYFLOW-001
 */
import type { OnboardingStep, OnboardingPreferences } from './onboarding-store.js';
export declare function renderOnboardingChecklist(steps: readonly OnboardingStep[], mode: 'beginner' | 'pro', prefs: Readonly<OnboardingPreferences>): string;
//# sourceMappingURL=onboarding-checklist-panel.d.ts.map