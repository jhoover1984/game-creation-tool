import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEffectiveIntensity, sampleFieldValue } from '@gcs/runtime-web';
import { EditorApp } from './editor-app.js';
import { renderEffectsPanel } from './effects-panel.js';
describe('FX-FIELD-001: deterministic field sampling', () => {
    it('sampleFieldValue returns repeatable values for same tick', () => {
        const a = sampleFieldValue('wind.global', 5);
        const b = sampleFieldValue('wind.global', 5);
        assert.equal(a, b);
    });
    it('resolveEffectiveIntensity uses base intensity when coupling is disabled', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.applyEffectPreset('rain', 0.8);
        const value = resolveEffectiveIntensity(app.store.effectState, 9);
        assert.equal(value, 0.8);
    });
    it('resolveEffectiveIntensity changes with tick when coupling is enabled', () => {
        const app = new EditorApp();
        app.newProject('fx', 8, 8, 16);
        app.applyEffectPreset('rain', 0.8);
        app.setEffectFieldCoupling('wind.global', 1);
        const a = resolveEffectiveIntensity(app.store.effectState, 1);
        const b = resolveEffectiveIntensity(app.store.effectState, 2);
        assert.notEqual(a, b);
    });
    it('save/load roundtrip preserves field link config', () => {
        const appA = new EditorApp();
        appA.newProject('fx', 8, 8, 16);
        appA.applyEffectPreset('fog', 0.6);
        appA.setEffectFieldCoupling('wind.global', 0.45);
        const saved = appA.save();
        const appB = new EditorApp();
        appB.load(saved);
        assert.equal(appB.store.effectState.fieldLink.fieldId, 'wind.global');
        assert.equal(appB.store.effectState.fieldLink.influence, 0.45);
    });
});
describe('FX-FIELD-001: panel surface', () => {
    it('renders field dropdown and influence slider', () => {
        const html = renderEffectsPanel({
            activePresetId: 'rain',
            intensity: 0.5,
            fieldLink: { fieldId: 'wind.global', influence: 0.35 },
        }, [{ id: 'rain', name: 'Rain', defaultIntensity: 0.6 }], [{ id: 'wind.global', name: 'Global Wind', valueType: 'scalar' }]);
        assert.ok(html.includes('data-action="fx:field"'));
        assert.ok(html.includes('data-action="fx:field-influence"'));
        assert.ok(html.includes('Global Wind'));
    });
});
//# sourceMappingURL=effects-field-coupling.test.js.map