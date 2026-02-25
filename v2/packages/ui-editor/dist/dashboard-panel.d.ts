/**
 * Pure rendering functions for the welcome dashboard overlay.
 * No state, no side effects.
 * Governs: UI-DASH-001, UI-DASH-002
 */
import type { RecentProject, OnboardingPreferences } from './onboarding-store.js';
/** Health badge from stored metadata only (non-authoritative until explicit open/repair). */
export declare function computeHealthBadge(project: RecentProject): 'ready' | 'warnings' | 'needs_fixes';
export declare function renderDashboard(recents: readonly RecentProject[], prefs: Readonly<OnboardingPreferences>): string;
//# sourceMappingURL=dashboard-panel.d.ts.map