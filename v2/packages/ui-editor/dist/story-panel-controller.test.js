import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StoryPanelController } from './story-panel-controller.js';
function makeNodes() {
    return [
        { nodeId: 'node_start', kind: 'start', name: 'Start' },
        { nodeId: 'node_end', kind: 'end', name: 'End' },
    ];
}
function makeContainer(fields) {
    let clickListener = null;
    let changeListener = null;
    const container = {
        innerHTML: '',
        addEventListener(type, fn) {
            if (type === 'click')
                clickListener = fn;
            if (type === 'change')
                changeListener = fn;
        },
        removeEventListener(type, _fn) {
            if (type === 'click')
                clickListener = null;
            if (type === 'change')
                changeListener = null;
        },
        querySelector(selector) {
            const match = selector.match(/data-path="([^"]+)"/);
            if (!match)
                return null;
            const path = match[1];
            const field = fields[path];
            if (!field)
                return null;
            return { value: field.value ?? '' };
        },
        fireApply() {
            if (!clickListener)
                return;
            clickListener({
                target: {
                    getAttribute(attr) {
                        return attr === 'data-action' ? 'apply-story-inspector' : null;
                    },
                },
            });
        },
        fireNodeChange(value) {
            if (!changeListener)
                return;
            changeListener({
                target: {
                    value,
                    getAttribute(attr) {
                        return attr === 'data-path' ? 'nodeId' : null;
                    },
                },
            });
        },
    };
    return container;
}
function makeApp(nodes = makeNodes()) {
    const updates = [];
    let selectedId = nodes[0]?.nodeId ?? null;
    return {
        updates,
        get selectedId() {
            return selectedId;
        },
        getQuestNodes() {
            return nodes;
        },
        getSelectedQuestNode() {
            return selectedId ? nodes.find((n) => n.nodeId === selectedId) ?? null : null;
        },
        selectQuestNode(nodeId) {
            selectedId = nodeId;
            return nodeId ? nodes.find((n) => n.nodeId === nodeId) ?? null : null;
        },
        updateQuestNodeBasics(nodeId, fields) {
            updates.push({ nodeId, name: fields.name, kind: fields.kind });
            return true;
        },
    };
}
test('StoryPanelController: selecting node dispatches selectQuestNode', () => {
    const app = makeApp();
    const container = makeContainer({
        name: { value: 'End Updated' },
        kind: { value: 'objective' },
    });
    new StoryPanelController(app, container);
    container.fireNodeChange('node_end');
    assert.equal(app.selectedId, 'node_end');
});
test('StoryPanelController: Apply dispatches updateQuestNodeBasics for selected node', () => {
    const app = makeApp();
    const container = makeContainer({
        name: { value: 'Changed Name' },
        kind: { value: 'reward' },
    });
    new StoryPanelController(app, container);
    container.fireApply();
    assert.equal(app.updates.length, 1);
    assert.equal(app.updates[0].nodeId, 'node_start');
    assert.equal(app.updates[0].name, 'Changed Name');
    assert.equal(app.updates[0].kind, 'reward');
});
test('StoryPanelController: dispose removes event listeners', () => {
    const app = makeApp();
    const container = makeContainer({
        name: { value: 'Changed Name' },
        kind: { value: 'reward' },
    });
    const ctrl = new StoryPanelController(app, container);
    ctrl.dispose();
    container.fireApply();
    assert.equal(app.updates.length, 0);
});
//# sourceMappingURL=story-panel-controller.test.js.map