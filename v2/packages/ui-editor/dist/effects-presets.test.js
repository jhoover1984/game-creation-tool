/**
 * effects-presets.test.ts -- FX-PRESET-001
 * Effects preset command path + panel rendering coverage.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EditorApp } from './editor-app.js';
import { renderEffectsPanel } from './effects-panel.js';
import { BUILT_IN_EFFECT_FIELDS, BUILT_IN_PRESETS, resolveEffectiveIntensity } from '@gcs/runtime-web';
describe('FX-PRESET-001: effects preset lifecycle', () => {
    it('applyEffectPreset("rain", 0.8) sets effect state', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        const ok = app.applyEffectPreset('rain', 0.8);
        assert.equal(ok, true);
        assert.equal(app.store.effectState.activePresetId, 'rain');
        assert.equal(app.store.effectState.intensity, 0.8);
        assert.equal(app.store.effectState.fieldLink.fieldId, null);
    });
    it('applyEffectPreset(null, 0) clears active preset', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.applyEffectPreset('fog', 0.5);
        const ok = app.applyEffectPreset(null, 0);
        assert.equal(ok, true);
        assert.equal(app.store.effectState.activePresetId, null);
        assert.equal(app.store.effectState.intensity, 0);
    });
    it('undo after apply restores previous effect state', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.applyEffectPreset('rain', 0.8);
        app.store.undo();
        assert.equal(app.store.effectState.activePresetId, null);
        assert.equal(app.store.effectState.intensity, 0.5);
    });
    it('redo after undo re-applies effect preset', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.applyEffectPreset('night_tint', 0.7);
        app.store.undo();
        app.store.redo();
        assert.equal(app.store.effectState.activePresetId, 'night_tint');
        assert.equal(app.store.effectState.intensity, 0.7);
    });
    it('new command after undo clears redo stack', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.applyEffectPreset('rain', 0.6);
        app.store.undo();
        app.applyEffectPreset('fog', 0.4);
        assert.equal(app.store.canRedo(), false);
    });
    it('unknown preset ID fails and emits EFFECT_PRESET_UNKNOWN diagnostic', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        const before = { ...app.store.effectState };
        const ok = app.applyEffectPreset('bad_preset', 0.9);
        assert.equal(ok, false);
        assert.deepEqual(app.store.effectState, before);
        const unknown = app.diagnosticStore.getAll().find((d) => d.code === 'EFFECT_PRESET_UNKNOWN');
        assert.ok(unknown);
    });
    it('intensity clamps to [0, 1]', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.applyEffectPreset('rain', 2.7);
        assert.equal(app.store.effectState.intensity, 1);
        app.applyEffectPreset('fog', -1.2);
        assert.equal(app.store.effectState.intensity, 0);
    });
    it('save/load roundtrip preserves effectState', () => {
        const appA = new EditorApp();
        appA.newProject('fx', 8, 8, 16);
        appA.applyEffectPreset('fog', 0.33);
        const saved = appA.save();
        const appB = new EditorApp();
        appB.load(saved);
        assert.equal(appB.store.effectState.activePresetId, 'fog');
        assert.equal(appB.store.effectState.intensity, 0.33);
        assert.equal(appB.store.effectState.fieldLink.fieldId, null);
    });
    it('setEffectFieldCoupling links known field and clamps influence', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        const ok = app.setEffectFieldCoupling('wind.global', 2.4);
        assert.equal(ok, true);
        assert.equal(app.store.effectState.fieldLink.fieldId, 'wind.global');
        assert.equal(app.store.effectState.fieldLink.influence, 1);
    });
    it('setEffectFieldCoupling rejects unknown field and emits diagnostic', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        const ok = app.setEffectFieldCoupling('bad.field', 0.5);
        assert.equal(ok, false);
        const unknown = app.diagnosticStore.getAll().find((d) => d.code === 'EFFECT_FIELD_UNKNOWN');
        assert.ok(unknown);
    });
    it('field coupling is undoable and redoable', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.setEffectFieldCoupling('wind.global', 0.6);
        assert.equal(app.store.effectState.fieldLink.fieldId, 'wind.global');
        app.store.undo();
        assert.equal(app.store.effectState.fieldLink.fieldId, null);
        app.store.redo();
        assert.equal(app.store.effectState.fieldLink.fieldId, 'wind.global');
    });
    it('resolveEffectiveIntensity is deterministic for same state and tick', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.applyEffectPreset('rain', 0.8);
        app.setEffectFieldCoupling('wind.global', 0.5);
        const a = resolveEffectiveIntensity(app.store.effectState, 12);
        const b = resolveEffectiveIntensity(app.store.effectState, 12);
        assert.equal(a, b);
    });
});
describe('FX-PRESET-001: renderEffectsPanel', () => {
    it('renders Clear disabled with no active preset', () => {
        const html = renderEffectsPanel({ activePresetId: null, intensity: 0.5, fieldLink: { fieldId: null, influence: 0 } }, BUILT_IN_PRESETS, BUILT_IN_EFFECT_FIELDS);
        assert.ok(html.includes('data-action="fx:clear"'));
        assert.ok(html.includes('disabled'));
    });
    it('renders active preset button + slider value', () => {
        const html = renderEffectsPanel({ activePresetId: 'rain', intensity: 0.73, fieldLink: { fieldId: null, influence: 0 } }, BUILT_IN_PRESETS, BUILT_IN_EFFECT_FIELDS);
        assert.ok(html.includes('data-preset-id="rain"'));
        assert.ok(html.includes('fx-active'));
        assert.ok(html.includes('value="73"'));
    });
    it('renders known preset labels from BUILT_IN_PRESETS', () => {
        const html = renderEffectsPanel({ activePresetId: null, intensity: 0.5, fieldLink: { fieldId: null, influence: 0 } }, BUILT_IN_PRESETS, BUILT_IN_EFFECT_FIELDS);
        assert.ok(html.includes('Rain'));
        assert.ok(html.includes('Fog'));
        assert.ok(html.includes('Night Tint'));
    });
    it('renders field coupling controls', () => {
        const html = renderEffectsPanel({
            activePresetId: null,
            intensity: 0.5,
            fieldLink: { fieldId: 'wind.global', influence: 0.4 },
        }, BUILT_IN_PRESETS, BUILT_IN_EFFECT_FIELDS);
        assert.ok(html.includes('data-action="fx:field"'));
        assert.ok(html.includes('data-action="fx:field-influence"'));
        assert.ok(html.includes('Global Wind'));
    });
});
//# sourceMappingURL=effects-presets.test.js.map