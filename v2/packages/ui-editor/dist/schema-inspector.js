function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function getValueByPath(target, path) {
    const parts = path.split('.');
    let current = target;
    for (const part of parts) {
        if (!current || typeof current !== 'object')
            return undefined;
        current = current[part];
    }
    return current;
}
/** Maps each field path to a named section. Fields not listed fall into a default section. */
const PATH_TO_SECTION = {
    'id': 'Metadata',
    'name': 'Metadata',
    'position.x': 'Transform',
    'position.y': 'Transform',
    'solid': 'Transform',
    'spriteId': 'Visual',
    'animationClipId': 'Visual',
};
/** Display order for sections. Sections not listed appear after these in insertion order. */
const SECTION_ORDER = ['Transform', 'Visual', 'Metadata'];
/** Sections that are open by default. All others start collapsed. */
const DEFAULT_OPEN = new Set(['Transform', 'Visual']);
export function renderEntityInspector(target, schema) {
    // Group fields by section while preserving field order within each section.
    const sectionMap = new Map();
    for (const field of schema.fields) {
        const section = PATH_TO_SECTION[field.path] ?? 'Other';
        if (!sectionMap.has(section)) {
            sectionMap.set(section, []);
        }
        const rawValue = getValueByPath(target, field.path);
        const readOnlyAttr = field.readOnly ? ' readonly' : '';
        const minAttr = typeof field.min === 'number' ? ` min="${field.min}"` : '';
        const maxAttr = typeof field.max === 'number' ? ` max="${field.max}"` : '';
        const stepAttr = typeof field.xUi?.step === 'number' ? ` step="${field.xUi.step}"` : '';
        let fieldHtml;
        if (field.type === 'number') {
            const value = typeof rawValue === 'number' ? rawValue : 0;
            fieldHtml = `<label class="inspector-field"><span>${escapeHtml(field.label)}</span><input type="number" data-path="${escapeHtml(field.path)}" value="${value}"${minAttr}${maxAttr}${stepAttr}${readOnlyAttr}></label>`;
        }
        else if (field.type === 'boolean') {
            const checked = rawValue === true ? ' checked' : '';
            const disabledAttr = field.readOnly ? ' disabled' : '';
            fieldHtml = `<label class="inspector-field"><span>${escapeHtml(field.label)}</span><input type="checkbox" data-path="${escapeHtml(field.path)}"${checked}${disabledAttr}></label>`;
        }
        else {
            const value = typeof rawValue === 'string' ? rawValue : '';
            fieldHtml = `<label class="inspector-field"><span>${escapeHtml(field.label)}</span><input type="text" data-path="${escapeHtml(field.path)}" value="${escapeHtml(value)}"${readOnlyAttr}></label>`;
        }
        sectionMap.get(section).push(fieldHtml);
    }
    // Build ordered section list: SECTION_ORDER first, then any remaining.
    const orderedSections = [...SECTION_ORDER];
    for (const key of sectionMap.keys()) {
        if (!orderedSections.includes(key)) {
            orderedSections.push(key);
        }
    }
    const sectionsHtml = orderedSections
        .filter((name) => sectionMap.has(name))
        .map((name) => {
        const openAttr = DEFAULT_OPEN.has(name) ? ' open' : '';
        const fields = sectionMap.get(name).join('');
        return `<details class="inspector-section"${openAttr}><summary class="inspector-section-title">${escapeHtml(name)}</summary><div class="inspector-section-fields">${fields}</div></details>`;
    })
        .join('');
    return `
    <section class="inspector">
      <h2>${escapeHtml(schema.title)}</h2>
      ${sectionsHtml}
      <button type="button" data-action="apply-entity-inspector">Apply</button>
    </section>
  `.trim();
}
export function readNumberField(container, path) {
    const input = container.querySelector(`input[data-path="${path}"]`);
    if (!input)
        return null;
    const value = Number(input.value);
    if (Number.isNaN(value))
        return null;
    return value;
}
export function readTextField(container, path) {
    const input = container.querySelector(`input[data-path="${path}"]`);
    if (!input)
        return null;
    return input.value;
}
export function readBooleanField(container, path) {
    const input = container.querySelector(`input[data-path="${path}"]`);
    if (!input)
        return null;
    return input.checked;
}
//# sourceMappingURL=schema-inspector.js.map