import { readBooleanField, readNumberField, readTextField } from './schema-inspector.js';
import { renderAnimationPanel } from './animation-panel.js';
export class AnimationPanelController {
    app;
    container;
    onClickHandler;
    unsubscribe;
    selectedEntityId = null;
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.onClickHandler = (event) => this.handleClick(event);
        this.unsubscribe = app.subscribe((_event) => this.refresh());
        this.container.addEventListener('click', this.onClickHandler);
        this.refresh();
    }
    notifyEntitySelected(entityId) {
        this.selectedEntityId = entityId;
        this.refresh();
    }
    refresh() {
        const selected = this.getSelectedEntity();
        const clip = selected?.animationClipId
            ? this.app.store.clips.find((c) => c.id === selected.animationClipId) ?? null
            : null;
        this.container.innerHTML = renderAnimationPanel(selected, clip, this.app.store.entities);
    }
    dispose() {
        this.unsubscribe();
        this.container.removeEventListener('click', this.onClickHandler);
    }
    getSelectedEntity() {
        const id = this.selectedEntityId ?? this.app.store.selectedEntityId;
        if (!id)
            return null;
        return this.app.store.entities.find((e) => e.id === id) ?? null;
    }
    getSelectedClip(entity) {
        const clipId = entity.animationClipId;
        if (!clipId)
            return null;
        return this.app.store.clips.find((c) => c.id === clipId) ?? null;
    }
    handleClick(event) {
        const target = event.target?.closest('[data-action]');
        if (!target)
            return;
        const action = target.dataset.action;
        if (!action)
            return;
        const entity = this.getSelectedEntity();
        if (!entity)
            return;
        const clip = this.getSelectedClip(entity);
        if (action === 'anim:anchor:upsert') {
            if (!clip)
                return;
            const anchorName = readTextField(this.container, 'anchorName')?.trim();
            const frame = readNumberField(this.container, 'anchorFrame');
            const x = readNumberField(this.container, 'anchorX');
            const y = readNumberField(this.container, 'anchorY');
            if (!anchorName || frame === null || x === null || y === null)
                return;
            const flip = readBooleanField(this.container, 'anchorFlip') ?? false;
            const existing = clip.anchors?.[anchorName]?.find((k) => k.frame === frame);
            if (existing) {
                this.app.dispatch({
                    type: 'animation:anchor:move',
                    payload: {
                        clipId: clip.id,
                        anchorName,
                        frame,
                        pos: { x, y },
                        flip,
                    },
                });
            }
            else {
                this.app.dispatch({
                    type: 'animation:anchor:add',
                    payload: {
                        clipId: clip.id,
                        anchorName,
                        keyframe: { frame, pos: { x, y }, flip },
                    },
                });
            }
            return;
        }
        if (action === 'anim:anchor:remove') {
            if (!clip)
                return;
            const anchorName = target.dataset.anchorName?.trim();
            const frame = Number(target.dataset.frame);
            if (!anchorName || Number.isNaN(frame))
                return;
            this.app.dispatch({
                type: 'animation:anchor:remove',
                payload: { clipId: clip.id, anchorName, frame },
            });
            return;
        }
        if (action === 'anim:slot:attach') {
            const slotName = readTextField(this.container, 'slotName')?.trim();
            const parentSelect = this.container.querySelector('select[data-path="slotParentId"]');
            const slotTypeSelect = this.container.querySelector('select[data-path="slotType"]');
            const anchorName = readTextField(this.container, 'slotAnchorName')?.trim();
            const occSelect = this.container.querySelector('select[data-path="slotOcclusionHint"]');
            if (!slotName || !anchorName || !parentSelect || !slotTypeSelect || !occSelect || !parentSelect.value)
                return;
            this.app.dispatch({
                type: 'entity:slot:attach',
                payload: {
                    entityId: entity.id,
                    slotName,
                    slotType: slotTypeSelect.value,
                    parentEntityId: parentSelect.value,
                    anchorName,
                    occlusionHint: occSelect.value,
                },
            });
            return;
        }
        if (action === 'anim:slot:detach') {
            const slotName = target.dataset.slotName?.trim();
            if (!slotName)
                return;
            this.app.dispatch({
                type: 'entity:slot:detach',
                payload: { entityId: entity.id, slotName },
            });
            return;
        }
        if (action === 'anim:slot:setOcclusion') {
            const slotName = target.dataset.slotName?.trim();
            if (!slotName)
                return;
            const select = this.container.querySelector(`select[data-path="slot-occlusion:${slotName}"]`);
            if (!select)
                return;
            this.app.dispatch({
                type: 'entity:slot:setOcclusion',
                payload: {
                    entityId: entity.id,
                    slotName,
                    occlusionHint: select.value,
                },
            });
        }
    }
}
//# sourceMappingURL=animation-panel-controller.js.map