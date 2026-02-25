/**
 * Tests for UI-ONBOARD-001: Welcome dashboard checklist progression.
 * Event-driven step completion via bus events and shell hooks.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OnboardingStore } from './onboarding-store.js';
import { OnboardingChecklistController } from './onboarding-checklist-controller.js';
import { renderOnboardingChecklist } from './onboarding-checklist-panel.js';
class FakeStorage {
    data = {};
    getItem(key) { return this.data[key] ?? null; }
    setItem(key, value) { this.data[key] = value; }
    removeItem(key) { delete this.data[key]; }
}
function makeFakeApp() {
    let listener = null;
    return {
        subscribe(fn) {
            listener = fn;
            return () => { listener = null; };
        },
        emit(type) {
            listener?.({ type, payload: {} });
        },
    };
}
function makeContainer() {
    let clickHandler = null;
    return {
        innerHTML: '',
        addEventListener(_type, fn) { clickHandler = fn; },
        removeEventListener(_type, _fn) { clickHandler = null; },
    };
}
test('UI-ONBOARD-001: entity:created event marks entity-created step complete', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const container = makeContainer();
    const ctrl = new OnboardingChecklistController(app, store, container);
    assert.equal(store.getSteps().find((s) => s.id === 'entity-created')?.complete, false);
    app.emit('entity:created');
    assert.equal(store.getSteps().find((s) => s.id === 'entity-created')?.complete, true);
    ctrl.dispose();
});
test('UI-ONBOARD-001: tile:set:done event marks tile-painted step complete', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const container = makeContainer();
    const ctrl = new OnboardingChecklistController(app, store, container);
    assert.equal(store.getSteps().find((s) => s.id === 'tile-painted')?.complete, false);
    app.emit('tile:set:done');
    assert.equal(store.getSteps().find((s) => s.id === 'tile-painted')?.complete, true);
    ctrl.dispose();
});
test('UI-ONBOARD-001: shell hook notifyProjectCreated marks project-created step', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const container = makeContainer();
    const ctrl = new OnboardingChecklistController(app, store, container);
    ctrl.notifyProjectCreated();
    assert.equal(store.getSteps().find((s) => s.id === 'project-created')?.complete, true);
    ctrl.dispose();
});
test('UI-ONBOARD-001: shell hook notifyProjectSaved marks project-saved step', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const container = makeContainer();
    const ctrl = new OnboardingChecklistController(app, store, container);
    ctrl.notifyProjectSaved();
    assert.equal(store.getSteps().find((s) => s.id === 'project-saved')?.complete, true);
    ctrl.dispose();
});
test('UI-ONBOARD-001: shell hook notifyPlaytestEntered marks playtest-entered step', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const container = makeContainer();
    const ctrl = new OnboardingChecklistController(app, store, container);
    ctrl.notifyPlaytestEntered();
    assert.equal(store.getSteps().find((s) => s.id === 'playtest-entered')?.complete, true);
    ctrl.dispose();
});
test('UI-ONBOARD-001: progress increments deterministically', () => {
    const store = new OnboardingStore(new FakeStorage());
    const steps0 = store.getSteps().filter((s) => s.complete).length;
    store.markStepComplete('entity-created');
    const steps1 = store.getSteps().filter((s) => s.complete).length;
    store.markStepComplete('tile-painted');
    const steps2 = store.getSteps().filter((s) => s.complete).length;
    assert.equal(steps0, 0);
    assert.equal(steps1, 1);
    assert.equal(steps2, 2);
});
test('UI-ONBOARD-001: checklist HTML includes completed step marker', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.markStepComplete('entity-created');
    const prefs = store.getPreferences();
    const html = renderOnboardingChecklist(store.getSteps(), prefs.mode, prefs);
    assert.ok(html.includes('checklist-step--done'));
    assert.ok(html.includes('Place an entity'));
    assert.ok(!html.includes('<script>'));
});
test('UI-ONBOARD-001: dispose unsubscribes from bus (no further updates)', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const container = makeContainer();
    const ctrl = new OnboardingChecklistController(app, store, container);
    ctrl.dispose();
    app.emit('entity:created');
    // Step should NOT be marked after dispose
    assert.equal(store.getSteps().find((s) => s.id === 'entity-created')?.complete, false);
});
// UI-PLAYFLOW-001 tests
test('UI-PLAYFLOW-001: default steps include playable-scene-ready (6 total)', () => {
    const store = new OnboardingStore(new FakeStorage());
    const steps = store.getSteps();
    assert.equal(steps.length, 6);
    assert.ok(steps.find((s) => s.id === 'playable-scene-ready'), 'playable-scene-ready step should exist');
});
test('UI-PLAYFLOW-001: notifyStarterSceneCreated marks playable-scene-ready complete', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const container = makeContainer();
    const ctrl = new OnboardingChecklistController(app, store, container);
    assert.equal(store.getSteps().find((s) => s.id === 'playable-scene-ready')?.complete, false);
    ctrl.notifyStarterSceneCreated();
    assert.equal(store.getSteps().find((s) => s.id === 'playable-scene-ready')?.complete, true);
    ctrl.dispose();
});
test('UI-PLAYFLOW-001: add-starter click invokes onAction callback', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const clickHandlers = [];
    const container = {
        innerHTML: '',
        addEventListener(_type, fn) { clickHandlers.push(fn); },
        removeEventListener(_type, _fn) { },
    };
    let actionReceived = '';
    const ctrl = new OnboardingChecklistController(app, store, container, (action) => { actionReceived = action; });
    // Simulate clicking an element with data-action="add-starter"
    const fakeTarget = {
        dataset: { action: 'add-starter' },
        closest(selector) {
            if (selector === '[data-action]')
                return this;
            return null;
        },
    };
    clickHandlers[0]?.({ target: fakeTarget });
    assert.equal(actionReceived, 'add-starter');
    ctrl.dispose();
});
test('UI-PLAYFLOW-001: dismiss-flow-hint sets showFlowHint to false', () => {
    const store = new OnboardingStore(new FakeStorage());
    const app = makeFakeApp();
    const clickHandlers = [];
    const container = {
        innerHTML: '',
        addEventListener(_type, fn) { clickHandlers.push(fn); },
        removeEventListener(_type, _fn) { },
    };
    const ctrl = new OnboardingChecklistController(app, store, container);
    assert.equal(store.getPreferences().showFlowHint, true);
    const fakeTarget = {
        dataset: { action: 'dismiss-flow-hint' },
        closest(selector) {
            if (selector === '[data-action]')
                return this;
            return null;
        },
    };
    clickHandlers[0]?.({ target: fakeTarget });
    assert.equal(store.getPreferences().showFlowHint, false);
    ctrl.dispose();
});
test('UI-PLAYFLOW-001: checklist panel shows CTA when playable-scene-ready is incomplete', () => {
    const store = new OnboardingStore(new FakeStorage());
    const prefs = store.getPreferences();
    const html = renderOnboardingChecklist(store.getSteps(), prefs.mode, prefs);
    assert.ok(html.includes('add-starter'), 'CTA button should appear when step not complete');
    assert.ok(html.includes('Add Starter Scene'), 'CTA label should appear');
});
test('UI-PLAYFLOW-001: checklist panel hides CTA after playable-scene-ready is complete', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.markStepComplete('playable-scene-ready');
    const prefs = store.getPreferences();
    const html = renderOnboardingChecklist(store.getSteps(), prefs.mode, prefs);
    assert.ok(!html.includes('data-action="add-starter"'), 'CTA button should disappear when step complete');
});
test('UI-PLAYFLOW-001: flow hint visible after playable-scene-ready complete and showFlowHint true', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.markStepComplete('playable-scene-ready');
    const prefs = store.getPreferences();
    assert.equal(prefs.showFlowHint, true);
    const html = renderOnboardingChecklist(store.getSteps(), prefs.mode, prefs);
    assert.ok(html.includes('dismiss-flow-hint'), 'flow hint with dismiss button should appear');
    assert.ok(html.includes('Flow:'), 'flow text should appear');
});
test('UI-PLAYFLOW-001: flow hint hidden when showFlowHint is false', () => {
    const store = new OnboardingStore(new FakeStorage());
    store.markStepComplete('playable-scene-ready');
    store.setPreferences({ showFlowHint: false });
    const prefs = store.getPreferences();
    const html = renderOnboardingChecklist(store.getSteps(), prefs.mode, prefs);
    assert.ok(!html.includes('dismiss-flow-hint'), 'flow hint should be hidden after dismiss');
});
test('UI-PLAYFLOW-001: stored state with 5 steps resets to 6-step defaults', () => {
    const storage = new FakeStorage();
    // Simulate old 5-step stored state
    const oldState = {
        preferences: { showDashboardOnLaunch: true, showFirstRunTips: true, showProjectChecklist: true,
            enableGuidedTourOverlays: true, mode: 'beginner', openLastProjectOnLaunch: false, showFlowHint: true },
        steps: [
            { id: 'project-created', label: 'Create or open a project', complete: true },
            { id: 'tile-painted', label: 'Paint a tile on the map', complete: false },
            { id: 'entity-created', label: 'Place an entity', complete: false },
            { id: 'project-saved', label: 'Save the project', complete: false },
            { id: 'playtest-entered', label: 'Enter play mode', complete: false },
        ],
        recents: [],
    };
    storage.setItem('gcs-v2-onboarding', JSON.stringify(oldState));
    const store = new OnboardingStore(storage);
    // Old 5-step count != new 6-step count -> resets to defaults
    assert.equal(store.getSteps().length, 6);
    // All steps start fresh (not migrated)
    assert.equal(store.getSteps().filter((s) => s.complete).length, 0);
});
//# sourceMappingURL=onboarding-checklist.test.js.map