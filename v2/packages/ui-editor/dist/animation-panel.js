function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function renderAnchorRows(clip) {
    const anchors = clip.anchors ?? {};
    const names = Object.keys(anchors).sort();
    if (names.length === 0) {
        return '<p class="empty-state">No anchors on this clip.</p>';
    }
    const rows = [];
    for (const name of names) {
        const keyframes = [...(anchors[name] ?? [])].sort((a, b) => a.frame - b.frame);
        for (const kf of keyframes) {
            rows.push(`<li class="anim-anchor-row">` +
                `<span class="anim-anchor-name">${escapeHtml(name)}</span>` +
                `<span class="anim-anchor-meta">frame ${kf.frame} @ (${kf.pos.x}, ${kf.pos.y})</span>` +
                `<button class="anim-btn" data-action="anim:anchor:remove" data-anchor-name="${escapeHtml(name)}" data-frame="${kf.frame}">Remove</button>` +
                `</li>`);
        }
    }
    return `<ul class="anim-anchor-list">${rows.join('')}</ul>`;
}
function renderSlotRows(entity) {
    const slots = [...(entity.slots ?? [])].sort((a, b) => a.slotName.localeCompare(b.slotName));
    if (slots.length === 0) {
        return '<p class="empty-state">No slots attached to this entity.</p>';
    }
    const occlusion = (slot, value) => slot.occlusionHint === value ? ' selected' : '';
    return `<ul class="anim-slot-list">` +
        slots.map((slot) => `<li class="anim-slot-row">` +
            `<span class="anim-slot-name">${escapeHtml(slot.slotName)}</span>` +
            `<span class="anim-slot-meta">${escapeHtml(slot.slotType)} -> ${escapeHtml(slot.parentEntityId)}:${escapeHtml(slot.anchorName)}</span>` +
            `<select data-path="slot-occlusion:${escapeHtml(slot.slotName)}">` +
            `<option value="auto"${occlusion(slot, 'auto')}>auto</option>` +
            `<option value="in-front"${occlusion(slot, 'in-front')}>in-front</option>` +
            `<option value="behind"${occlusion(slot, 'behind')}>behind</option>` +
            `</select>` +
            `<button class="anim-btn" data-action="anim:slot:setOcclusion" data-slot-name="${escapeHtml(slot.slotName)}">Set</button>` +
            `<button class="anim-btn" data-action="anim:slot:detach" data-slot-name="${escapeHtml(slot.slotName)}">Detach</button>` +
            `</li>`).join('') +
        `</ul>`;
}
export function renderAnimationPanel(selectedEntity, clip, entities) {
    if (!selectedEntity) {
        return '<p class="empty-state">No entity selected. Click an entity on the canvas to edit its animation.</p>';
    }
    if (!selectedEntity.animationClipId) {
        return '<p class="empty-state">Selected entity has no animation clip id. Set animationClipId in Inspector first.</p>';
    }
    if (!clip) {
        return `<p class="empty-state">Animation clip "${escapeHtml(selectedEntity.animationClipId)}" was not found.</p>`;
    }
    const parentOptions = entities
        .filter((e) => e.id !== selectedEntity.id)
        .map((e) => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)} (${escapeHtml(e.id)})</option>`)
        .join('');
    return (`<section class="anim-panel">` +
        `<h3>Clip: ${escapeHtml(clip.name)}</h3>` +
        `<div class="anim-form-row">` +
        `<input data-path="anchorName" type="text" placeholder="anchor name">` +
        `<input data-path="anchorFrame" type="number" min="0" value="0">` +
        `<input data-path="anchorX" type="number" value="0">` +
        `<input data-path="anchorY" type="number" value="0">` +
        `<label><input data-path="anchorFlip" type="checkbox"> flip</label>` +
        `<button class="anim-btn" data-action="anim:anchor:upsert">Add / Move</button>` +
        `</div>` +
        `<div class="anim-section">` +
        `<h4>Anchors</h4>` +
        renderAnchorRows(clip) +
        `</div>` +
        `<div class="anim-section">` +
        `<h4>Slots</h4>` +
        `<div class="anim-form-row">` +
        `<input data-path="slotName" type="text" placeholder="slot name">` +
        `<select data-path="slotType">` +
        `<option value="socket">socket</option>` +
        `<option value="prop">prop</option>` +
        `</select>` +
        `<select data-path="slotParentId">` +
        `<option value="">parent entity</option>` +
        `${parentOptions}` +
        `</select>` +
        `<input data-path="slotAnchorName" type="text" placeholder="anchor name">` +
        `<select data-path="slotOcclusionHint">` +
        `<option value="auto">auto</option>` +
        `<option value="in-front">in-front</option>` +
        `<option value="behind">behind</option>` +
        `</select>` +
        `<button class="anim-btn" data-action="anim:slot:attach">Attach</button>` +
        `</div>` +
        renderSlotRows(selectedEntity) +
        `</div>` +
        `</section>`);
}
//# sourceMappingURL=animation-panel.js.map