/**
 * Pure rendering functions for the welcome dashboard overlay.
 * No state, no side effects.
 * Governs: UI-DASH-001, UI-DASH-002
 */

import type { RecentProject, OnboardingPreferences } from './onboarding-store.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Health badge from stored metadata only (non-authoritative until explicit open/repair). */
export function computeHealthBadge(project: RecentProject): 'ready' | 'warnings' | 'needs_fixes' {
  if (project.hasErrors) return 'needs_fixes';
  if (project.hasWarnings) return 'warnings';
  return 'ready';
}

function renderRecentCard(project: RecentProject): string {
  const badge = computeHealthBadge(project);
  const badgeLabel = badge === 'needs_fixes' ? 'Needs fixes' : badge === 'warnings' ? 'Warnings' : 'Ready';
  const date = new Date(project.lastOpened).toLocaleDateString();
  return `<li class="dash-recent-card" data-action="open-recent" data-project-id="${escapeHtml(project.id)}">
    <span class="dash-recent-name">${escapeHtml(project.name)}</span>
    <span class="dash-recent-date">${escapeHtml(date)}</span>
    <span class="dash-health-badge dash-health-badge--${escapeHtml(badge)}" data-badge="${escapeHtml(badge)}">${escapeHtml(badgeLabel)}</span>
  </li>`;
}

export function renderDashboard(
  recents: readonly RecentProject[],
  prefs: Readonly<OnboardingPreferences>,
): string {
  const recentSection = recents.length > 0
    ? `<ul class="dash-recents">${recents.map(renderRecentCard).join('')}</ul>`
    : '<p class="dash-empty">No recent projects.</p>';

  return `<div class="dashboard-content">
  <div class="dash-header">
    <h1 class="dash-title">Welcome to GCS</h1>
    <button class="dash-close" data-action="dismiss-dashboard" aria-label="Close dashboard">&#10005;</button>
  </div>

  <section class="dash-section">
    <h2 class="dash-section-title">Start</h2>
    <div class="dash-start-actions">
      <button class="dash-btn dash-btn--primary" data-action="new-project">New Project</button>
      <button class="dash-btn" disabled title="Coming soon">Open Project</button>
      <button class="dash-btn" disabled title="Coming soon">Open Sample</button>
    </div>
    <div class="dash-templates">
      <span class="dash-label">Templates (coming soon):</span>
      <button class="dash-btn dash-btn--template" disabled>Top-Down</button>
      <button class="dash-btn dash-btn--template" disabled>Side-Scroller</button>
      <button class="dash-btn dash-btn--template" disabled>Tactics</button>
      <button class="dash-btn dash-btn--template" disabled>Blank</button>
    </div>
  </section>

  <section class="dash-section">
    <h2 class="dash-section-title">Recent Projects</h2>
    ${recentSection}
  </section>

  <section class="dash-section">
    <h2 class="dash-section-title">Learn</h2>
    <p class="dash-learn-hint">Paint tiles, place entities, enter play mode. Use the checklist panel to track your progress.</p>
  </section>

  <div class="dash-footer">
    <label class="dash-pref">
      <input type="checkbox" data-action="dont-show-again"${prefs.showDashboardOnLaunch ? '' : ' checked'}>
      Don&#39;t show on launch
    </label>
  </div>
</div>`;
}
