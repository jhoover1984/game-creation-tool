/**
 * Tests for UI-ONBOARD-003: Beginner/pro mode surface gating.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OnboardingStore } from './onboarding-store.js';
import { renderOnboardingChecklist } from './onboarding-checklist-panel.js';
class FakeStorage {
    data = {};
    getItem(key) { return this.data[key] ?? null; }
    setItem(key, value) { this.data[key] = value; }
    removeItem(key) { delete this.data[key]; }
}
test('UI-ONBOARD-003: default mode is beginner', () => {
    const store = new OnboardingStore(new FakeStorage());
    assert.equal(store.getPreferences().mode, 'beginner');
});
test('UI-ONBOARD-003: switching to pro mode is reflected in preferences', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ mode: 'pro' });
    assert.equal(store.getPreferences().mode, 'pro');
});
test('UI-ONBOARD-003: mode switch is reversible (non-destructive)', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ mode: 'pro' });
    store.setPreferences({ mode: 'beginner' });
    assert.equal(store.getPreferences().mode, 'beginner');
    // Switching does not affect step completion
    store.markStepComplete('entity-created');
    store.setPreferences({ mode: 'pro' });
    assert.equal(store.getSteps().find((s) => s.id === 'entity-created')?.complete, true);
});
test('UI-ONBOARD-003: beginner mode renders "Switch to Pro mode" toggle label', () => {
    const store = new OnboardingStore(new FakeStorage());
    const prefs = store.getPreferences();
    assert.equal(prefs.mode, 'beginner');
    const html = renderOnboardingChecklist(store.getSteps(), prefs.mode, prefs);
    assert.ok(html.includes('Switch to Pro mode'));
    assert.ok(!html.includes('Switch to Beginner mode'));
});
test('UI-ONBOARD-003: pro mode renders "Switch to Beginner mode" toggle label', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ mode: 'pro' });
    const prefs = store.getPreferences();
    const html = renderOnboardingChecklist(store.getSteps(), prefs.mode, prefs);
    assert.ok(html.includes('Switch to Beginner mode'));
    assert.ok(!html.includes('Switch to Pro mode'));
});
//# sourceMappingURL=onboarding-mode-switch.test.js.map