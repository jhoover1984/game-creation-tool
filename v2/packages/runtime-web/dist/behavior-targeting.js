/**
 * Deterministic target resolution for behavior selectors.
 * Output order is stable (ascending entity id).
 */
export function resolveTargetEntityIds(entities, ownerEntityId, selector) {
    if (selector.type === 'this') {
        return entities.some((e) => e.id === ownerEntityId) ? [ownerEntityId] : [];
    }
    if (selector.type === 'tag') {
        return entities
            .filter((e) => e.tags.includes(selector.value))
            .map((e) => e.id)
            .sort((a, b) => a.localeCompare(b));
    }
    const owner = entities.find((e) => e.id === ownerEntityId);
    if (!owner)
        return [];
    const ox = owner.position.x + owner.size.w / 2;
    const oy = owner.position.y + owner.size.h / 2;
    const r = Math.max(0, selector.value);
    const r2 = r * r;
    return entities
        .filter((e) => e.id !== ownerEntityId)
        .filter((e) => {
        const ex = e.position.x + e.size.w / 2;
        const ey = e.position.y + e.size.h / 2;
        const dx = ex - ox;
        const dy = ey - oy;
        return dx * dx + dy * dy <= r2;
    })
        .map((e) => e.id)
        .sort((a, b) => a.localeCompare(b));
}
//# sourceMappingURL=behavior-targeting.js.map