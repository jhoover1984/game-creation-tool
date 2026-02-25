/**
 * Tests for UI-DASH-002: Recent project health badges.
 * Badge is derived from stored metadata only; non-authoritative until explicit open.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeHealthBadge, renderDashboard } from './dashboard-panel.js';
import { OnboardingStore } from './onboarding-store.js';
import type { RecentProject } from './onboarding-store.js';

class FakeStorage {
  private data: Record<string, string> = {};
  getItem(key: string): string | null { return this.data[key] ?? null; }
  setItem(key: string, value: string): void { this.data[key] = value; }
  removeItem(key: string): void { delete this.data[key]; }
}

function makeRecent(overrides: Partial<RecentProject> = {}): RecentProject {
  return {
    id: 'p1', name: 'Test', lastOpened: '2026-02-21T00:00:00.000Z',
    hasWarnings: false, hasErrors: false,
    ...overrides,
  };
}

test('UI-DASH-002: hasErrors=true yields needs_fixes badge', () => {
  assert.equal(computeHealthBadge(makeRecent({ hasErrors: true })), 'needs_fixes');
});

test('UI-DASH-002: hasWarnings=true and hasErrors=false yields warnings badge', () => {
  assert.equal(computeHealthBadge(makeRecent({ hasWarnings: true, hasErrors: false })), 'warnings');
});

test('UI-DASH-002: both false yields ready badge', () => {
  assert.equal(computeHealthBadge(makeRecent({ hasWarnings: false, hasErrors: false })), 'ready');
});

test('UI-DASH-002: hasErrors takes priority over hasWarnings', () => {
  assert.equal(computeHealthBadge(makeRecent({ hasWarnings: true, hasErrors: true })), 'needs_fixes');
});

test('UI-DASH-002: badge computation is deterministic (same input same output)', () => {
  const recent = makeRecent({ hasWarnings: true });
  assert.equal(computeHealthBadge(recent), computeHealthBadge(recent));
});

test('UI-DASH-002: rendered dashboard includes health badge data attribute', () => {
  const store = new OnboardingStore(new FakeStorage());
  const prefs = store.getPreferences();
  const recents: RecentProject[] = [makeRecent({ hasErrors: true, name: 'BrokenGame' })];
  const html = renderDashboard(recents, prefs);
  assert.ok(html.includes('data-badge="needs_fixes"'));
  assert.ok(html.includes('BrokenGame'));
  assert.ok(!html.includes('<script>'));
});

test('UI-DASH-002: no recents renders empty state message', () => {
  const store = new OnboardingStore(new FakeStorage());
  const html = renderDashboard([], store.getPreferences());
  assert.ok(html.includes('No recent projects'));
});

test('UI-DASH-002: recents persist up to 5 FIFO', () => {
  const store = new OnboardingStore(new FakeStorage());
  for (let i = 0; i < 7; i++) {
    store.pushRecent({ id: `p${i}`, name: `Game${i}`, lastOpened: new Date().toISOString(), hasWarnings: false, hasErrors: false });
  }
  assert.equal(store.getRecents().length, 5);
  // Most recent first
  assert.equal(store.getRecents()[0]?.id, 'p6');
});
