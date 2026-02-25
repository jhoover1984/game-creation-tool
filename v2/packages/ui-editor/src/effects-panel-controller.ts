/**
 * effects-panel-controller.ts -- FX-PRESET-001
 * Wires the effects workspace panel to EditorApp and the fx-overlay element.
 *
 * Preset apply/clear/intensity changes dispatch effects:applyPreset through EditorApp.
 * Field link/influence changes dispatch effects:setFieldCoupling through EditorApp.
 * The CSS overlay (#fx-overlay) is updated directly as a display-layer concern:
 *   - data-fx-preset attribute drives CSS animations
 *   - --fx-intensity custom property drives CSS opacity/strength
 */

import type { EffectFieldId, EffectPresetId } from '@gcs/contracts';
import {
  BUILT_IN_EFFECT_FIELDS,
  BUILT_IN_PRESETS,
  resolveEffectiveIntensity,
} from '@gcs/runtime-web';
import { renderEffectsPanel } from './effects-panel.js';
import type { EditorApp } from './editor-app.js';

export class EffectsPanelController {
  private readonly app: EditorApp;
  private readonly container: HTMLElement;
  private readonly overlay: HTMLElement | null;
  private readonly clickHandler: (e: Event) => void;
  private readonly inputHandler: (e: Event) => void;
  private readonly unsubscribe: () => void;
  private playtestTick = 0;

  constructor(app: EditorApp, container: HTMLElement, overlay?: HTMLElement | null) {
    this.app = app;
    this.container = container;
    this.overlay = overlay ?? null;

    this.clickHandler = (e: Event) => {
      const target = (e.target as Element).closest('[data-action]') as HTMLElement | null;
      if (!target) return;
      const action = target.dataset['action'];

      if (action === 'fx:apply') {
        const presetId = target.dataset['presetId'] as EffectPresetId | undefined;
        if (presetId) {
          const intensity = this.app.store.effectState.intensity;
          this.app.applyEffectPreset(presetId, intensity);
        }
      } else if (action === 'fx:clear') {
        this.app.applyEffectPreset(null, this.app.store.effectState.intensity);
      }
    };

    this.inputHandler = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      if (!target) return;
      const action = target.dataset['action'];
      if (action === 'fx:intensity') {
        const intensity = Number(target.value) / 100;
        const presetId = this.app.store.effectState.activePresetId;
        this.app.applyEffectPreset(presetId, intensity);
        return;
      }
      if (action === 'fx:field-influence') {
        const influence = Number(target.value) / 100;
        const fieldId = this.app.store.effectState.fieldLink.fieldId;
        this.app.setEffectFieldCoupling(fieldId, influence);
        return;
      }
      if (action === 'fx:field') {
        const select = e.target as HTMLSelectElement;
        const next = (select.value || null) as EffectFieldId | null;
        const influence = this.app.store.effectState.fieldLink.influence;
        this.app.setEffectFieldCoupling(next, influence);
      }
    };

    this.unsubscribe = app.subscribe(() => this.refresh());
    container.addEventListener('click', this.clickHandler);
    container.addEventListener('input', this.inputHandler);

    this.refresh();
  }

  refresh(): void {
    const state = this.app.store.effectState;
    this.container.innerHTML = renderEffectsPanel(state, BUILT_IN_PRESETS, BUILT_IN_EFFECT_FIELDS);
    this.updateOverlay(state.activePresetId, state.intensity);
  }

  setPlaytestTick(tick: number): void {
    this.playtestTick = tick;
    const state = this.app.store.effectState;
    this.updateOverlay(state.activePresetId, state.intensity);
  }

  dispose(): void {
    this.unsubscribe();
    this.container.removeEventListener('click', this.clickHandler);
    this.container.removeEventListener('input', this.inputHandler);
    if (this.overlay) {
      this.overlay.dataset['fxPreset'] = 'none';
      this.overlay.style.removeProperty('--fx-intensity');
    }
  }

  private updateOverlay(activePresetId: EffectPresetId | null, intensity: number): void {
    if (!this.overlay) return;
    const effective = resolveEffectiveIntensity(this.app.store.effectState, this.playtestTick);
    this.overlay.dataset['fxPreset'] = activePresetId ?? 'none';
    this.overlay.style.setProperty('--fx-intensity', String(effective));
    this.overlay.style.setProperty('--fx-intensity-base', String(intensity));
  }
}
