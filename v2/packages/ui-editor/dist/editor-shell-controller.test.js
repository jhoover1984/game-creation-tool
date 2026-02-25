import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorShellController } from './editor-shell-controller.js';
class FakeButton {
    clickHandlers = [];
    addEventListener(type, handler) {
        if (type === 'click')
            this.clickHandlers.push(handler);
    }
    click() {
        for (const handler of this.clickHandlers) {
            handler();
        }
    }
}
class FakeInput {
    value;
    changeHandlers = [];
    constructor(value) {
        this.value = value;
    }
    addEventListener(type, handler) {
        if (type === 'change')
            this.changeHandlers.push(handler);
    }
    triggerChange() {
        for (const handler of this.changeHandlers) {
            handler();
        }
    }
}
class FakeContainer {
    innerHTML = '';
    listeners = [];
    addEventListener(type, handler) {
        if (type === 'click')
            this.listeners.push(handler);
    }
    removeEventListener(type, handler) {
        if (type !== 'click')
            return;
        this.listeners = this.listeners.filter((h) => h !== handler);
    }
}
class FakeStorage {
    map = new Map();
    get length() {
        return this.map.size;
    }
    getItem(key) {
        return this.map.get(key) ?? null;
    }
    setItem(key, value) {
        this.map.set(key, value);
    }
    removeItem(key) {
        this.map.delete(key);
    }
    key(index) {
        return [...this.map.keys()][index] ?? null;
    }
}
function createMockCanvas() {
    const listeners = new Map();
    const ctx = {
        clearRect() { },
        beginPath() { },
        moveTo() { },
        lineTo() { },
        stroke() { },
        strokeRect() { },
        fillRect() { },
        fillText() { },
        strokeStyle: '#000',
        lineWidth: 1,
        fillStyle: '#000',
        font: '10px monospace',
    };
    const canvas = {
        width: 0,
        height: 0,
        style: { cursor: '' },
        getContext: () => ctx,
        addEventListener(type, handler) {
            const existing = listeners.get(type) ?? [];
            existing.push(handler);
            listeners.set(type, existing);
        },
        removeEventListener(type, handler) {
            const existing = listeners.get(type) ?? [];
            listeners.set(type, existing.filter((fn) => fn !== handler));
        },
        getBoundingClientRect() {
            return {
                left: 0,
                top: 0,
                width: canvas.width || 320,
                height: canvas.height || 240,
            };
        },
        emit(type, event) {
            const existing = listeners.get(type) ?? [];
            for (const handler of existing) {
                handler(event);
            }
        },
    };
    return canvas;
}
function storyProjectJson() {
    return JSON.stringify({
        manifest: {
            id: 'proj_1',
            name: 'Warn Story',
            version: '0.1.0',
            resolution: { width: 320, height: 240 },
            tileSize: 16,
            createdAt: 'now',
            updatedAt: 'now',
        },
        tileLayers: [],
        entities: [],
        story: {
            questGraph: {
                schemaVersion: '2.0.0',
                nodes: [
                    { nodeId: 'node_start', kind: 'start', name: 'Start' },
                    { nodeId: 'node_end', kind: 'end', name: 'End' },
                    { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' },
                ],
                edges: [{ from: 'node_start', to: 'node_end' }],
            },
        },
    });
}
test('EditorShellController initializes shell and tasks empty state', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
    });
    assert.equal(status.textContent, 'Project: Untitled (64x36, tile 16)');
    assert.match(tasksContainer.innerHTML, /No diagnostics/);
    controller.dispose();
});
test('EditorShellController load button refreshes tasks from diagnostics', () => {
    const oldLocalStorage = globalThis.localStorage;
    const fakeStore = new FakeStorage();
    fakeStore.setItem('gcs-v2-project', storyProjectJson());
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: fakeStore,
    });
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const btnLoad = new FakeButton();
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        btnLoad,
    });
    btnLoad.click();
    assert.match(status.textContent ?? '', /Loaded: Warn Story/);
    assert.match(tasksContainer.innerHTML, /Connect unreachable node/);
    controller.dispose();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: oldLocalStorage,
    });
});
test('EditorShellController save button persists project json', () => {
    const oldLocalStorage = globalThis.localStorage;
    const fakeStore = new FakeStorage();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: fakeStore,
    });
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const btnSave = new FakeButton();
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        btnSave,
    });
    btnSave.click();
    const saved = fakeStore.getItem('gcs-v2-project');
    assert.ok(saved);
    assert.match(saved ?? '', /"manifest"/);
    assert.match(status.textContent ?? '', /Saved: Untitled/);
    controller.dispose();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: oldLocalStorage,
    });
});
test('EditorShellController Add Player button creates tagged player and selects it', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const btnAddPlayer = new FakeButton();
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        btnAddPlayer,
    });
    btnAddPlayer.click();
    assert.equal(controller.app.store.entities.length, 1);
    const player = controller.app.store.entities[0];
    assert.equal(player.name, 'Player');
    assert.ok(player.tags.includes('player'));
    assert.equal(controller.app.store.selectedEntityId, player.id);
    assert.match(consoleContainer.innerHTML, /Added player entity/);
    controller.dispose();
});
test('EditorShellController Add Starter Scene paints starter row and creates player', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const btnAddStarter = new FakeButton();
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        btnAddStarter,
    });
    btnAddStarter.click();
    assert.equal(controller.app.store.entities.length, 1);
    const player = controller.app.store.entities[0];
    assert.ok(player.tags.includes('player'));
    assert.equal(controller.app.store.selectedEntityId, player.id);
    const layer = controller.app.store.tileLayers[0];
    const groundY = layer.height - 2;
    for (let tx = 0; tx < layer.width; tx++) {
        assert.equal(layer.data[groundY * layer.width + tx], 1);
    }
    assert.match(consoleContainer.innerHTML, /Starter scene ready/);
    controller.dispose();
});
test('EditorShellController logs interaction events in console when stepping playtest', () => {
    const oldLocalStorage = globalThis.localStorage;
    const interactionProject = JSON.stringify({
        manifest: {
            id: 'proj_int',
            name: 'Interaction Slice',
            version: '0.1.0',
            resolution: { width: 320, height: 240 },
            tileSize: 16,
            createdAt: 'now',
            updatedAt: 'now',
        },
        tileLayers: [{
                id: 'layer-0',
                name: 'Ground',
                width: 20,
                height: 15,
                tileSize: 16,
                data: new Array(20 * 15).fill(0),
            }],
        entities: [
            {
                id: 'player_1',
                name: 'Player',
                position: { x: 16, y: 16 },
                size: { w: 16, h: 16 },
                solid: true,
                tags: ['player'],
            },
            {
                id: 'npc_1',
                name: 'NPC',
                position: { x: 20, y: 16 },
                size: { w: 16, h: 16 },
                solid: false,
                tags: ['interactable'],
            },
        ],
    });
    const fakeStore = new FakeStorage();
    fakeStore.setItem('gcs-v2-project', interactionProject);
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: fakeStore,
    });
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const btnLoad = new FakeButton();
    const btnPlay = new FakeButton();
    const btnStep = new FakeButton();
    const btnInteract = new FakeButton();
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        btnLoad,
        btnPlay,
        btnStep,
        btnInteract,
    });
    btnLoad.click();
    btnPlay.click();
    btnInteract.click();
    btnStep.click();
    assert.match(consoleContainer.innerHTML, /Tick 1: 2 entities, 1 interactions/);
    assert.match(consoleContainer.innerHTML, /Interact player_1 -> npc_1/);
    controller.dispose();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: oldLocalStorage,
    });
});
test('EditorShellController updates playtest HUD with tick and player position on step', () => {
    const oldLocalStorage = globalThis.localStorage;
    const project = JSON.stringify({
        manifest: {
            id: 'proj_hud',
            name: 'HUD Slice',
            version: '0.1.0',
            resolution: { width: 320, height: 240 },
            tileSize: 16,
            createdAt: 'now',
            updatedAt: 'now',
        },
        tileLayers: [{
                id: 'layer-0',
                name: 'Ground',
                width: 20,
                height: 15,
                tileSize: 16,
                data: new Array(20 * 15).fill(0),
            }],
        entities: [
            {
                id: 'player_hud',
                name: 'Player',
                position: { x: 16, y: 16 },
                size: { w: 16, h: 16 },
                solid: true,
                tags: ['player'],
            },
        ],
    });
    const fakeStore = new FakeStorage();
    fakeStore.setItem('gcs-v2-project', project);
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: fakeStore,
    });
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const playtestHud = { textContent: '' };
    const btnLoad = new FakeButton();
    const btnPlay = new FakeButton();
    const btnStep = new FakeButton();
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        playtestHud,
        btnLoad,
        btnPlay,
        btnStep,
    });
    btnLoad.click();
    btnPlay.click();
    btnStep.click();
    assert.match(playtestHud.textContent ?? '', /tick=1/);
    assert.match(playtestHud.textContent ?? '', /player=\(/);
    controller.dispose();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: oldLocalStorage,
    });
});
test('EditorShellController batches drag paint into a single undo step', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const toolSelect = new FakeInput('paint');
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        toolSelect,
    });
    // Default tool is 'select'; explicitly switch to paint before drag-painting.
    toolSelect.value = 'paint';
    toolSelect.triggerChange();
    canvas.emit('pointerdown', {
        button: 0,
        clientX: 8,
        clientY: 8,
        preventDefault() { },
    });
    canvas.emit('pointermove', {
        button: 0,
        clientX: 24,
        clientY: 8,
        preventDefault() { },
    });
    canvas.emit('pointerup', {
        button: 0,
        clientX: 24,
        clientY: 8,
        preventDefault() { },
    });
    assert.equal(controller.app.store.tileLayers[0].data[0], 1);
    assert.equal(controller.app.store.tileLayers[0].data[1], 1);
    controller.app.undo();
    assert.equal(controller.app.store.tileLayers[0].data[0], 0);
    assert.equal(controller.app.store.tileLayers[0].data[1], 0);
    controller.dispose();
});
test('EditorShellController apply map recreates project with requested dimensions', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const btnApplyMap = new FakeButton();
    const mapWidthInput = new FakeInput('12');
    const mapHeightInput = new FakeInput('8');
    const mapTileSizeInput = new FakeInput('24');
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        btnApplyMap,
        mapWidthInput,
        mapHeightInput,
        mapTileSizeInput,
    });
    mapWidthInput.value = '12';
    mapHeightInput.value = '8';
    mapTileSizeInput.value = '24';
    btnApplyMap.click();
    assert.equal(controller.app.store.tileLayers[0].width, 12);
    assert.equal(controller.app.store.tileLayers[0].height, 8);
    assert.equal(controller.app.store.manifest.tileSize, 24);
    assert.equal(canvas.width, 288);
    assert.equal(canvas.height, 192);
    assert.match(status.textContent ?? '', /12x8, tile 24/);
    controller.dispose();
});
test('EditorShellController contextmenu hit-test selects entity under cursor', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
    });
    controller.app.createEntity('RightClickMe', 0, 0);
    controller.app.store.selectEntity(null);
    canvas.emit('contextmenu', {
        clientX: 4,
        clientY: 4,
        preventDefault() { },
    });
    assert.ok(controller.app.store.selectedEntityId, 'right-click should select an entity at cursor');
    controller.dispose();
});
test('EditorShellController switches to erase tool and removes painted tile', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const toolSelect = new FakeInput('paint');
    const tileIdInput = new FakeInput('7');
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        toolSelect,
        tileIdInput,
    });
    // Default tool is 'select'; explicitly switch to paint before painting tile 7.
    toolSelect.value = 'paint';
    toolSelect.triggerChange();
    tileIdInput.value = '7';
    tileIdInput.triggerChange();
    canvas.emit('pointerdown', {
        button: 0, clientX: 8, clientY: 8, preventDefault() { },
    });
    canvas.emit('pointerup', {
        button: 0, clientX: 8, clientY: 8, preventDefault() { },
    });
    assert.equal(controller.app.store.tileLayers[0].data[0], 7);
    toolSelect.value = 'erase';
    toolSelect.triggerChange();
    canvas.emit('pointerdown', {
        button: 0, clientX: 8, clientY: 8, preventDefault() { },
    });
    canvas.emit('pointerup', {
        button: 0, clientX: 8, clientY: 8, preventDefault() { },
    });
    assert.equal(controller.app.store.tileLayers[0].data[0], 0);
    controller.dispose();
});
test('EditorShellController place-entity tool auto-selects created entity', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const toolSelect = new FakeInput('entity');
    const controller = new EditorShellController({
        canvas,
        tasksContainer,
        inspectorContainer,
        consoleContainer,
        status,
        toolSelect,
    });
    toolSelect.value = 'entity';
    toolSelect.triggerChange();
    canvas.emit('pointerdown', {
        button: 0, clientX: 8, clientY: 8, preventDefault() { },
    });
    assert.equal(controller.app.store.entities.length, 1);
    assert.equal(controller.app.store.selectedEntityId, controller.app.store.entities[0].id);
    assert.match(inspectorContainer.innerHTML, /<h2>Entity<\/h2>/);
    controller.dispose();
});
// --- Framing integration tests -- UI-SHELL-POLISH-001 A4/A5 ---
//
// These tests exercise the full path:
//   EditorShellController -> fitViewportToMap() -> ViewportController.fitToMap()
//   -> ViewportController.applyTransform() -> canvas.style.transform
//
// The key no-clip invariant: after fitting, the scaled canvas must not overflow
// the container on either axis (scaledWidth <= containerWidth and
// scaledHeight <= containerHeight), i.e. no right-edge or bottom-edge clip.
//
// We cannot test rAF directly in Node.js, so we call the private
// fitViewportToMap() explicitly via type assertion to exercise the real chain.
function parseTransform(transform) {
    const m = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s+scale\(([-\d.]+)\)/);
    if (!m)
        return null;
    return { panX: parseFloat(m[1]), panY: parseFloat(m[2]), zoom: parseFloat(m[3]) };
}
function makeFramingCanvas(container) {
    const ctx = {
        clearRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, stroke() { },
        strokeRect() { }, fillRect() { }, fillText() { },
        strokeStyle: '#000', lineWidth: 1, fillStyle: '#000', font: '10px monospace',
    };
    const canvas = {
        width: 1024,
        height: 576,
        style: { cursor: '', transform: '', transformOrigin: '' },
        parentElement: container,
        getContext: () => ctx,
        addEventListener() { },
        removeEventListener() { },
        getBoundingClientRect() {
            return { left: 0, top: 0, width: 1024, height: 576 };
        },
    };
    return canvas;
}
test('UI-SHELL-POLISH-001 A4/A5: fitViewportToMap sets a canvas transform that keeps map within container on startup', () => {
    // Default project: 64x36 tiles * 16px = 1024x576px map
    const container = { clientWidth: 800, clientHeight: 600 };
    const canvas = makeFramingCanvas(container);
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });
    // Manually invoke the startup fit (rAF does not fire in Node.js)
    controller.fitViewportToMap();
    const t = parseTransform(canvas.style.transform);
    assert.ok(t !== null, 'canvas must have a CSS transform after fitViewportToMap');
    const mapWidth = controller.app.store.manifest.resolution.width;
    const mapHeight = controller.app.store.manifest.resolution.height;
    // No-clip invariant: scaled map must not overflow the container on either axis
    const scaledWidth = mapWidth * t.zoom;
    const scaledHeight = mapHeight * t.zoom;
    assert.ok(scaledWidth <= container.clientWidth + 0.5, `scaled map width ${scaledWidth.toFixed(2)} must not exceed container width ${container.clientWidth}`);
    assert.ok(scaledHeight <= container.clientHeight + 0.5, `scaled map height ${scaledHeight.toFixed(2)} must not exceed container height ${container.clientHeight}`);
    assert.ok(t.zoom > 0, 'zoom must be positive');
    controller.dispose();
});
test('UI-SHELL-POLISH-001 A4/A5: fitViewportToMap recalculates correctly after resize -- no clipping in smaller window', () => {
    // Start with a larger container, then simulate a resize to a smaller one.
    const container = { clientWidth: 1200, clientHeight: 700 };
    const canvas = makeFramingCanvas(container);
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });
    const fit = controller.fitViewportToMap.bind(controller);
    fit();
    const t1 = parseTransform(canvas.style.transform);
    assert.ok(t1.zoom > 1.0, 'large window should upscale the map');
    // Simulate resize to compact window
    container.clientWidth = 600;
    container.clientHeight = 400;
    fit();
    const t2 = parseTransform(canvas.style.transform);
    const mapWidth = controller.app.store.manifest.resolution.width;
    const mapHeight = controller.app.store.manifest.resolution.height;
    const scaledWidth2 = mapWidth * t2.zoom;
    const scaledHeight2 = mapHeight * t2.zoom;
    assert.ok(t2.zoom < 1.0, 'compact window should scale map down');
    assert.ok(scaledWidth2 <= container.clientWidth + 0.5, `after resize, scaled width ${scaledWidth2.toFixed(2)} must not exceed new container width ${container.clientWidth}`);
    assert.ok(scaledHeight2 <= container.clientHeight + 0.5, `after resize, scaled height ${scaledHeight2.toFixed(2)} must not exceed new container height ${container.clientHeight}`);
    controller.dispose();
});
//# sourceMappingURL=editor-shell-controller.test.js.map