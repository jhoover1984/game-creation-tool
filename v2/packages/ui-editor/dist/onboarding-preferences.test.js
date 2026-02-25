/**
 * Tests for UI-ONBOARD-002: Onboarding preference persistence.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OnboardingStore, createOnboardingStore } from './onboarding-store.js';
class FakeStorage {
    data = {};
    getItem(key) { return this.data[key] ?? null; }
    setItem(key, value) { this.data[key] = value; }
    removeItem(key) { delete this.data[key]; }
}
test('UI-ONBOARD-002: preferences persist across store instances', () => {
    const storage = new FakeStorage();
    const store1 = createOnboardingStore(storage);
    store1.setPreferences({ showDashboardOnLaunch: false, mode: 'pro' });
    const store2 = createOnboardingStore(storage);
    const prefs = store2.getPreferences();
    assert.equal(prefs.showDashboardOnLaunch, false);
    assert.equal(prefs.mode, 'pro');
});
test('UI-ONBOARD-002: resetPreferences restores all defaults without mutating steps', () => {
    const storage = new FakeStorage();
    const store = createOnboardingStore(storage);
    store.setPreferences({ mode: 'pro', showDashboardOnLaunch: false });
    store.markStepComplete('entity-created');
    store.resetPreferences();
    const prefs = store.getPreferences();
    assert.equal(prefs.mode, 'beginner');
    assert.equal(prefs.showDashboardOnLaunch, true);
    // Steps survive a preference reset (resetAll clears both; resetPreferences only clears prefs)
    const store2 = createOnboardingStore(storage);
    assert.equal(store2.getSteps().find((s) => s.id === 'entity-created')?.complete, true);
});
test('UI-ONBOARD-002: subscribe fires on preference change', () => {
    const store = new OnboardingStore(new FakeStorage());
    let callCount = 0;
    const unsub = store.subscribe(() => { callCount++; });
    store.setPreferences({ mode: 'pro' });
    assert.equal(callCount, 1);
    unsub();
    store.setPreferences({ mode: 'beginner' });
    assert.equal(callCount, 1); // unsubscribed, no further calls
});
test('UI-ONBOARD-002: default preferences match spec', () => {
    const store = new OnboardingStore(new FakeStorage());
    const prefs = store.getPreferences();
    assert.equal(prefs.showDashboardOnLaunch, true);
    assert.equal(prefs.showFirstRunTips, true);
    assert.equal(prefs.showProjectChecklist, true);
    assert.equal(prefs.enableGuidedTourOverlays, true);
    assert.equal(prefs.mode, 'beginner');
    assert.equal(prefs.openLastProjectOnLaunch, false);
});
test('UI-ONBOARD-002: partial setPreferences merges without overwriting unset fields', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ mode: 'pro' });
    const prefs = store.getPreferences();
    assert.equal(prefs.mode, 'pro');
    assert.equal(prefs.showDashboardOnLaunch, true); // unchanged default
});
//# sourceMappingURL=onboarding-preferences.test.js.map