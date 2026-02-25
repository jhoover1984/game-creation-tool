/**
 * Tests for UI-DASH-001: Dashboard entry routing and project launch.
 * Recents are local metadata only; no file validity check at routing time.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OnboardingStore } from './onboarding-store.js';
import { DashboardController } from './dashboard-controller.js';
class FakeStorage {
    data = {};
    getItem(key) { return this.data[key] ?? null; }
    setItem(key, value) { this.data[key] = value; }
    removeItem(key) { delete this.data[key]; }
}
function makeOverlay() {
    return {
        style: { display: 'none' },
        innerHTML: '',
        addEventListener(_, _fn) { },
        removeEventListener(_, _fn) { },
    };
}
test('UI-DASH-001: showDashboardOnLaunch=true shows overlay', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ showDashboardOnLaunch: true });
    const overlay = makeOverlay();
    let dismissed = false;
    const ctrl = new DashboardController(store, overlay, () => { dismissed = true; });
    assert.equal(overlay.style.display, '');
    assert.equal(dismissed, false);
    ctrl.dispose();
});
test('UI-DASH-001: showDashboardOnLaunch=false hides overlay and calls onDismiss', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ showDashboardOnLaunch: false });
    const overlay = makeOverlay();
    let dismissed = false;
    const ctrl = new DashboardController(store, overlay, () => { dismissed = true; });
    assert.equal(overlay.style.display, 'none');
    assert.equal(dismissed, true);
    ctrl.dispose();
});
test('UI-DASH-001: openLastProjectOnLaunch=true with recents hides overlay and calls onDismiss', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ openLastProjectOnLaunch: true, showDashboardOnLaunch: true });
    store.pushRecent({ id: 'p1', name: 'MyGame', lastOpened: new Date().toISOString(), hasWarnings: false, hasErrors: false });
    const overlay = makeOverlay();
    let dismissed = false;
    const ctrl = new DashboardController(store, overlay, () => { dismissed = true; });
    assert.equal(overlay.style.display, 'none');
    assert.equal(dismissed, true);
    ctrl.dispose();
});
test('UI-DASH-001: openLastProjectOnLaunch=true with empty recents still shows overlay', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ openLastProjectOnLaunch: true, showDashboardOnLaunch: true });
    // No recents pushed
    const overlay = makeOverlay();
    let dismissed = false;
    const ctrl = new DashboardController(store, overlay, () => { dismissed = true; });
    assert.equal(overlay.style.display, '');
    assert.equal(dismissed, false);
    ctrl.dispose();
});
test('UI-DASH-001: openLastProjectOnLaunch=false shows overlay regardless of recents', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.setPreferences({ openLastProjectOnLaunch: false, showDashboardOnLaunch: true });
    store.pushRecent({ id: 'p1', name: 'MyGame', lastOpened: new Date().toISOString(), hasWarnings: false, hasErrors: false });
    const overlay = makeOverlay();
    let dismissed = false;
    const ctrl = new DashboardController(store, overlay, () => { dismissed = true; });
    assert.equal(overlay.style.display, '');
    assert.equal(dismissed, false);
    ctrl.dispose();
});
//# sourceMappingURL=dashboard-routing.test.js.map