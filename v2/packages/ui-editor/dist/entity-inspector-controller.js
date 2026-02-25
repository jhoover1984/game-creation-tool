import { ENTITY_DEF_INSPECTOR_SCHEMA } from '@gcs/contracts';
import { renderEntityInspector, readBooleanField, readNumberField, readTextField } from './schema-inspector.js';
export class EntityInspectorController {
    app;
    container;
    onClickHandler;
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.onClickHandler = (event) => this.handleClick(event);
        this.container.addEventListener('click', this.onClickHandler);
        this.refresh();
    }
    refresh() {
        const entity = this.app.getSelectedEntity();
        if (!entity) {
            this.container.innerHTML = '<p class="inspector-empty">No entity selected. Click an entity on the canvas to inspect it.</p>';
            return;
        }
        let html = renderEntityInspector(entity, ENTITY_DEF_INSPECTOR_SCHEMA);
        if (entity.tags.includes('player')) {
            // Speed is always a non-negative integer; numeric literal is safe without HTML escaping.
            const speed = typeof entity.speed === 'number' && entity.speed >= 0 ? Math.round(entity.speed) : 120;
            html += `<details class="inspector-section" open><summary class="inspector-section-title">Player Config</summary><div class="inspector-section-fields"><label class="inspector-field"><span>Speed (px/s)</span><input type="number" data-path="speed" value="${speed}" min="0" step="1"></label></div></details>`;
        }
        // D-009: read-only tags display -- open by default so tags are immediately visible
        const tagsText = entity.tags.length > 0 ? entity.tags.join(', ') : '(none)';
        html += `<details class="inspector-section" open><summary class="inspector-section-title">Tags</summary><div class="inspector-section-fields"><p class="inspector-tags-list">${tagsText}</p></div></details>`;
        this.container.innerHTML = html;
    }
    dispose() {
        this.container.removeEventListener('click', this.onClickHandler);
    }
    handleClick(event) {
        const target = event.target;
        if (!target || target.getAttribute('data-action') !== 'apply-entity-inspector') {
            return;
        }
        const entity = this.app.getSelectedEntity();
        if (!entity)
            return;
        const name = readTextField(this.container, 'name');
        const x = readNumberField(this.container, 'position.x');
        const y = readNumberField(this.container, 'position.y');
        const solid = readBooleanField(this.container, 'solid');
        const spriteId = readTextField(this.container, 'spriteId');
        const animationClipId = readTextField(this.container, 'animationClipId');
        if (x === null || y === null || solid === null)
            return;
        if (name && name.trim() && name.trim() !== entity.name) {
            this.app.renameEntity(entity.id, name.trim());
        }
        this.app.moveEntity(entity.id, x, y);
        this.app.updateEntityVisual(entity.id, {
            solid,
            spriteId: spriteId?.trim() ? spriteId.trim() : undefined,
            animationClipId: animationClipId?.trim() ? animationClipId.trim() : undefined,
        });
        if (entity.tags.includes('player')) {
            const speed = readNumberField(this.container, 'speed');
            if (speed !== null) {
                this.app.setEntitySpeed(entity.id, speed);
            }
        }
        this.refresh();
    }
}
//# sourceMappingURL=entity-inspector-controller.js.map