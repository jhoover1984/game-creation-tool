/**
 * effects-panel.ts -- FX-PRESET-001
 * Pure renderer for the effects workspace panel.
 * No state. Returns HTML string only.
 */
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/**
 * Render the effects panel HTML.
 *
 * @param effectState - Current map effect state (from ProjectStore).
 * @param presets     - Catalog of built-in presets to display.
 * @returns HTML string; safe to assign to container.innerHTML.
 */
export function renderEffectsPanel(effectState, presets, fields) {
    const activeId = effectState.activePresetId;
    const intensity = effectState.intensity;
    const pct = Math.round(intensity * 100);
    const presetButtons = presets
        .map((p) => {
        const active = p.id === activeId ? ' aria-pressed="true"' : ' aria-pressed="false"';
        return `<button class="fx-preset-btn${p.id === activeId ? ' fx-active' : ''}"` +
            ` data-action="fx:apply" data-preset-id="${escapeHtml(p.id)}"${active}>` +
            `${escapeHtml(p.name)}</button>`;
    })
        .join('');
    const clearDisabled = activeId === null ? ' disabled' : '';
    const selectedField = effectState.fieldLink.fieldId ?? '';
    const influencePct = Math.round(effectState.fieldLink.influence * 100);
    const fieldOptions = [`<option value="">None</option>`]
        .concat(fields.map((field) => `<option value="${escapeHtml(field.id)}"${field.id === selectedField ? ' selected' : ''}>` +
        `${escapeHtml(field.name)}</option>`))
        .join('');
    return `<div class="fx-toolbar">
  <div class="fx-preset-list">${presetButtons}</div>
  <label class="fx-intensity-label">Intensity: <span id="fx-intensity-display">${pct}%</span>
    <input class="fx-intensity-slider" type="range" min="0" max="100" value="${pct}"
      data-action="fx:intensity" aria-label="Effect intensity">
  </label>
  <label class="fx-intensity-label">Field coupling:
    <select data-action="fx:field">${fieldOptions}</select>
  </label>
  <label class="fx-intensity-label">Field influence: <span>${influencePct}%</span>
    <input class="fx-intensity-slider" type="range" min="0" max="100" value="${influencePct}"
      data-action="fx:field-influence" aria-label="Field influence">
  </label>
  <button class="fx-clear-btn" data-action="fx:clear"${clearDisabled}>Clear</button>
</div>`;
}
//# sourceMappingURL=effects-panel.js.map