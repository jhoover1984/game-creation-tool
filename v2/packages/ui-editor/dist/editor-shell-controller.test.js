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
test('EditorShellController select-drag moves entity and undo/redo restores positions', () => {
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
    controller.app.createEntity('DragMe', 0, 0);
    const entityId = controller.app.store.entities[0].id;
    canvas.emit('pointerdown', {
        button: 0,
        clientX: 4,
        clientY: 4,
        preventDefault() { },
    });
    canvas.emit('pointermove', {
        button: 0,
        clientX: 40,
        clientY: 4,
        preventDefault() { },
    });
    canvas.emit('pointerup', {
        button: 0,
        clientX: 40,
        clientY: 4,
        preventDefault() { },
    });
    let entity = controller.app.store.entities.find((e) => e.id === entityId);
    assert.ok(entity, 'drag target entity should still exist');
    assert.equal(entity.position.x, 32);
    assert.equal(entity.position.y, 0);
    controller.app.undo();
    entity = controller.app.store.entities.find((e) => e.id === entityId);
    assert.ok(entity, 'entity should still exist after undo');
    assert.equal(entity.position.x, 0);
    assert.equal(entity.position.y, 0);
    controller.app.redo();
    entity = controller.app.store.entities.find((e) => e.id === entityId);
    assert.ok(entity, 'entity should still exist after redo');
    assert.equal(entity.position.x, 32);
    assert.equal(entity.position.y, 0);
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
test('D-002: fitViewportToMap applies FRAMING_MARGIN_PX -- scaled map is strictly smaller than container on both axes', () => {
    // Container sized to match the default 1024x576 map exactly.
    // Without a margin, zoom=1 and scaled dimensions = container; clip would occur.
    // With FRAMING_MARGIN_PX=4, scaled dimensions must be strictly < container on both axes.
    const container = { clientWidth: 1024, clientHeight: 576 };
    const canvas = makeFramingCanvas(container);
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });
    controller.fitViewportToMap();
    const t = parseTransform(canvas.style.transform);
    assert.ok(t !== null, 'canvas must have a CSS transform');
    const mapWidth = controller.app.store.manifest.resolution.width;
    const mapHeight = controller.app.store.manifest.resolution.height;
    const scaledWidth = mapWidth * t.zoom;
    const scaledHeight = mapHeight * t.zoom;
    assert.ok(scaledWidth < container.clientWidth, `D-002: scaled width ${scaledWidth.toFixed(2)} must be strictly < container width ${container.clientWidth}`);
    assert.ok(scaledHeight < container.clientHeight, `D-002: scaled height ${scaledHeight.toFixed(2)} must be strictly < container height ${container.clientHeight}`);
    controller.dispose();
});
// --- D-005a: Playtest run loop tests ---
// rAF is mocked per-test and restored in a finally block to prevent cross-test flake.
function makeRafMock() {
    const queue = [];
    let id = 0;
    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = ((cb) => {
        queue.push(cb);
        return ++id;
    });
    globalThis.cancelAnimationFrame = (() => {
        queue.length = 0;
    });
    const flush = (n = 1) => { for (let i = 0; i < n; i++)
        queue.shift()?.(0); };
    const restore = () => {
        globalThis.requestAnimationFrame = origRaf;
        globalThis.cancelAnimationFrame = origCaf;
    };
    return { queue, flush, restore };
}
test('D-005a: run loop -- HUD shows tick > 0 after rAF frames', () => {
    const raf = makeRafMock();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const playtestHud = { textContent: '' };
        const btnPlay = new FakeButton();
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, playtestHud, btnPlay,
        });
        btnPlay.click();
        raf.flush(3);
        assert.match(playtestHud.textContent ?? '', /tick=\d+/, 'HUD must contain tick= after rAF frames');
        const m = /tick=(\d+)/.exec(playtestHud.textContent ?? '');
        assert.ok(m !== null && Number(m[1]) > 0, `tick should be > 0, got: ${playtestHud.textContent}`);
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
test('D-005a: run loop -- HUD shows player=( substring when player entity present', () => {
    const oldLocalStorage = globalThis.localStorage;
    const project = JSON.stringify({
        manifest: {
            id: 'proj_loop_player',
            name: 'Loop Player',
            version: '0.1.0',
            resolution: { width: 320, height: 240 },
            tileSize: 16,
            createdAt: 'now',
            updatedAt: 'now',
        },
        tileLayers: [{
                id: 'layer-0', name: 'Ground', width: 20, height: 15, tileSize: 16,
                data: new Array(20 * 15).fill(0),
            }],
        entities: [
            { id: 'player_loop', name: 'Player', position: { x: 16, y: 16 }, size: { w: 16, h: 16 }, solid: true, tags: ['player'] },
        ],
    });
    const fakeStore = new FakeStorage();
    fakeStore.setItem('gcs-v2-project', project);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fakeStore });
    const raf = makeRafMock();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const playtestHud = { textContent: '' };
        const btnLoad = new FakeButton();
        const btnPlay = new FakeButton();
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, playtestHud, btnLoad, btnPlay,
        });
        btnLoad.click();
        btnPlay.click();
        raf.flush(3);
        assert.ok((playtestHud.textContent ?? '').includes('player=('), `HUD must contain player=( when player entity present, got: "${playtestHud.textContent}"`);
        controller.dispose();
    }
    finally {
        raf.restore();
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: oldLocalStorage });
    }
});
test('D-005a: run loop -- Pause stops the loop; HUD retains last tick', () => {
    const raf = makeRafMock();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const playtestHud = { textContent: '' };
        const btnPlay = new FakeButton();
        const btnPause = new FakeButton();
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, playtestHud, btnPlay, btnPause,
        });
        btnPlay.click();
        raf.flush(5);
        const hudAfterPlay = playtestHud.textContent ?? '';
        assert.match(hudAfterPlay, /tick=\d+/, 'HUD must show tick after 5 rAF frames');
        const queueLengthBeforePause = raf.queue.length;
        btnPause.click();
        // After pause the loop should be cancelled; no further rAF callbacks should be queued.
        assert.ok(raf.queue.length <= queueLengthBeforePause, 'rAF queue must not grow after Pause');
        // HUD must still show a tick= value (not reset to plain state string).
        assert.match(playtestHud.textContent ?? '', /tick=\d+/, 'HUD must retain tick= after Pause');
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
test('D-005a: Step from paused state increments HUD tick by 1', () => {
    const raf = makeRafMock();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const playtestHud = { textContent: '' };
        const btnPlay = new FakeButton();
        const btnPause = new FakeButton();
        const btnStep = new FakeButton();
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, playtestHud,
            btnPlay, btnPause, btnStep,
        });
        btnPlay.click();
        raf.flush(3);
        btnPause.click();
        const mBefore = /tick=(\d+)/.exec(playtestHud.textContent ?? '');
        assert.ok(mBefore !== null, 'HUD must show tick before Step');
        const tickBefore = Number(mBefore[1]);
        btnStep.click();
        const mAfter = /tick=(\d+)/.exec(playtestHud.textContent ?? '');
        assert.ok(mAfter !== null, 'HUD must show tick after Step');
        const tickAfter = Number(mAfter[1]);
        assert.equal(tickAfter, tickBefore + 1, `tick should increment by 1 from ${tickBefore} to ${tickBefore + 1}`);
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
// --- D-002: ResizeObserver re-fit tests ---
// Verifies that container resize events trigger a debounced fitViewportToMap() call.
// ResizeObserver is mocked since Node.js test environment does not provide it.
test('D-002: ResizeObserver re-fits viewport on container resize -- no-clip invariant holds after resize', () => {
    // Use a plain callback type -- ResizeObserverEntry is a DOM type not in the Node.js test lib.
    let capturedCb = null;
    const origResizeObserver = globalThis['ResizeObserver'];
    class MockResizeObserver {
        constructor(cb) { capturedCb = cb; }
        observe(_target) { }
        disconnect() { }
    }
    globalThis['ResizeObserver'] = MockResizeObserver;
    const raf = makeRafMock();
    try {
        const container = { clientWidth: 1200, clientHeight: 700 };
        const canvas = makeFramingCanvas(container);
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });
        assert.ok(capturedCb !== null, 'ResizeObserver callback should have been registered');
        // Drain startup double-rAF so baseline transform is set
        raf.flush(2);
        const t1 = parseTransform(canvas.style.transform);
        assert.ok(t1 !== null, 'canvas must have a transform after startup fit');
        // Shrink the container and fire the observer callback
        container.clientWidth = 500;
        container.clientHeight = 400;
        capturedCb();
        // Flush the debounce rAF queued by the observer callback
        raf.flush(1);
        const t2 = parseTransform(canvas.style.transform);
        assert.ok(t2 !== null, 'canvas must have a transform after resize fit');
        const mapWidth = controller.app.store.manifest.resolution.width;
        const mapHeight = controller.app.store.manifest.resolution.height;
        assert.ok(mapWidth * t2.zoom < container.clientWidth, `after resize, scaled width ${(mapWidth * t2.zoom).toFixed(2)} must be < container width ${container.clientWidth}`);
        assert.ok(mapHeight * t2.zoom < container.clientHeight, `after resize, scaled height ${(mapHeight * t2.zoom).toFixed(2)} must be < container height ${container.clientHeight}`);
        assert.ok(t2.zoom < t1.zoom, 'zoom should decrease when container shrinks');
        controller.dispose();
    }
    finally {
        globalThis['ResizeObserver'] = origResizeObserver;
        raf.restore();
    }
});
// --- D-005b: Keyboard movement tests ---
// makeKeyTarget captures keydown/keyup handlers registered by the controller.
function makeKeyTarget() {
    const map = {};
    return {
        addEventListener(type, fn) { (map[type] ??= []).push(fn); },
        removeEventListener() { },
        fire(type, key) {
            const evt = {
                key,
                ctrlKey: false, altKey: false, metaKey: false, shiftKey: false,
                preventDefault() { },
                target: { tagName: 'BODY' },
            };
            map[type]?.forEach((h) => h(evt));
        },
        /** Fire a key event as if the active element has the given tagName (e.g. 'INPUT'). */
        fireFrom(type, key, tagName) {
            const evt = {
                key,
                ctrlKey: false, altKey: false, metaKey: false, shiftKey: false,
                preventDefault() { },
                target: { tagName },
            };
            map[type]?.forEach((h) => h(evt));
        },
    };
}
test('D-005b: opposing horizontal keys cancel while both are held', () => {
    const raf = makeRafMock();
    const kt = makeKeyTarget();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const btnPlay = new FakeButton();
        const keydownTarget = kt;
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, btnPlay, keydownTarget,
        });
        btnPlay.click(); // status becomes 'running'
        kt.fire('keydown', 'ArrowRight');
        assert.equal(controller.pendingMoveX, 1, 'ArrowRight should set pendingMoveX=1');
        kt.fire('keydown', 'ArrowLeft');
        assert.equal(controller.pendingMoveX, 0, 'Opposing keys should cancel to pendingMoveX=0 while both are held');
        kt.fire('keyup', 'ArrowRight');
        assert.equal(controller.pendingMoveX, -1, 'Releasing ArrowRight while ArrowLeft is held should resolve pendingMoveX=-1');
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
test('D-005b: ArrowRight keyup clears pendingMoveX to 0', () => {
    const raf = makeRafMock();
    const kt = makeKeyTarget();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const btnPlay = new FakeButton();
        const keydownTarget = kt;
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, btnPlay, keydownTarget,
        });
        btnPlay.click();
        kt.fire('keydown', 'ArrowRight');
        assert.equal(controller.pendingMoveX, 1);
        kt.fire('keyup', 'ArrowRight');
        assert.equal(controller.pendingMoveX, 0, 'keyup ArrowRight should clear pendingMoveX back to 0');
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
test('D-005b: movement keys are no-ops when playtest is stopped', () => {
    const raf = makeRafMock();
    const kt = makeKeyTarget();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const keydownTarget = kt;
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, keydownTarget,
        });
        // No btnPlay click -- playtest is stopped
        kt.fire('keydown', 'ArrowRight');
        kt.fire('keydown', 'ArrowUp');
        assert.equal(controller.pendingMoveX, 0, 'ArrowRight should not set pendingMoveX when stopped');
        assert.equal(controller.pendingMoveY, 0, 'ArrowUp should not set pendingMoveY when stopped');
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
test('D-005b: HUD contains movement hint when playtest is running', () => {
    const raf = makeRafMock();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const playtestHud = { textContent: '' };
        const btnPlay = new FakeButton();
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, playtestHud, btnPlay,
        });
        btnPlay.click();
        raf.flush(3);
        assert.ok((playtestHud.textContent ?? '').includes('Arrows/WASD: move'), `HUD should include movement hint when running; got: "${playtestHud.textContent}"`);
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
// D-005b (fix): movement keys bypass INPUT focus guard during playtest
test('D-005b (fix): ArrowRight from focused INPUT sets pendingMoveX=1 while running', () => {
    const raf = makeRafMock();
    const kt = makeKeyTarget();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const btnPlay = new FakeButton();
        const keydownTarget = kt;
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, btnPlay, keydownTarget,
        });
        btnPlay.click(); // playtest running
        // Simulate pressing ArrowRight while an inspector INPUT has focus
        kt.fireFrom('keydown', 'ArrowRight', 'INPUT');
        assert.equal(controller.pendingMoveX, 1, 'pendingMoveX should be 1 even when event.target is INPUT during playtest');
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
test('D-005b (fix): editor shortcut s from INPUT when stopped does not set pendingMoveX', () => {
    const raf = makeRafMock();
    const kt = makeKeyTarget();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const keydownTarget = kt;
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, keydownTarget,
        });
        // Playtest is stopped -- 's' from INPUT should be guarded (no movement)
        kt.fireFrom('keydown', 's', 'INPUT');
        assert.equal(controller.pendingMoveX, 0, 'pendingMoveX must remain 0 when stopped and target is INPUT');
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
// D-005b (end-to-end): full movement pipeline -- key capture -> setInput -> step -> position change
test('D-005b (end-to-end): ArrowRight held over 10 frames advances player X in snapshot', () => {
    const raf = makeRafMock();
    const kt = makeKeyTarget();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const btnPlay = new FakeButton();
        const keydownTarget = kt;
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, btnPlay, keydownTarget,
        });
        // Plant a player entity in the store so playtest.init() sees isPlayer=true
        controller.createPlayablePlayer();
        const playerId = controller.app.store.entities.find((e) => e.tags.includes('player'))?.id;
        assert.ok(playerId !== undefined, 'player entity must exist with player tag');
        // Start playtest and run enough frames to establish initial position.
        // flush(3): constructor enqueues a double-rAF for viewport fitting (2 slots)
        // before the playtest tick; need at least 3 flushes to reach the first tick.
        btnPlay.click();
        raf.flush(3);
        const getSnap = () => controller.lastPlaySnap;
        const snap0 = getSnap();
        assert.ok(snap0 !== null, 'snapshot must exist after first frame');
        const initialX = snap0.entities.find((e) => e.id === playerId)?.x ?? 0;
        // Hold ArrowRight and run 10 frames
        kt.fire('keydown', 'ArrowRight');
        raf.flush(10);
        const snap1 = getSnap();
        assert.ok(snap1 !== null, 'snapshot must exist after movement frames');
        const finalX = snap1.entities.find((e) => e.id === playerId)?.x ?? 0;
        assert.ok(finalX > initialX, `player X must increase after 10 frames with ArrowRight; initial=${initialX}, final=${finalX}`);
        const authoredX = controller.app.store.entities.find((e) => e.id === playerId)?.position.x ?? 0;
        const renderedX = controller.app.getRenderedEntityPosition(playerId)?.x ?? 0;
        assert.equal(authoredX, initialX, 'authored store position should remain unchanged during playtest preview');
        assert.ok(renderedX > authoredX, `rendered preview X should advance beyond authored X; authored=${authoredX}, rendered=${renderedX}`);
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
// D-005b (pause): pausing stops the rAF loop -- tick must not advance after Pause
test('D-005b (pause): tick does not advance after Pause, movement stops', () => {
    const raf = makeRafMock();
    const kt = makeKeyTarget();
    try {
        const canvas = createMockCanvas();
        const tasksContainer = new FakeContainer();
        const inspectorContainer = new FakeContainer();
        const consoleContainer = new FakeContainer();
        const status = { textContent: '' };
        const btnPlay = new FakeButton();
        const btnPause = new FakeButton();
        const keydownTarget = kt;
        const controller = new EditorShellController({
            canvas, tasksContainer, inspectorContainer, consoleContainer, status, btnPlay, btnPause, keydownTarget,
        });
        controller.createPlayablePlayer();
        btnPlay.click();
        raf.flush(3);
        const getSnap = () => controller.lastPlaySnap;
        const tickBeforePause = getSnap()?.tick ?? 0;
        assert.ok(tickBeforePause > 0, `tick must be > 0 before pause, got ${tickBeforePause}`);
        // Pause stops the loop; subsequent flush calls have an empty queue
        btnPause.click();
        raf.flush(5);
        const tickAfterPause = getSnap()?.tick ?? 0;
        assert.equal(tickAfterPause, tickBeforePause, `tick must not advance while paused (before=${tickBeforePause}, after=${tickAfterPause})`);
        controller.dispose();
    }
    finally {
        raf.restore();
    }
});
// --- D-008: Tile-aligned spawn tests ---
test('D-008: createStarterGroundAndPlayer -- player spawn X is a multiple of tileSize', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });
    controller.createStarterGroundAndPlayer();
    const player = controller.app.store.entities.find((e) => e.tags.includes('player'));
    assert.ok(player !== undefined, 'player entity should exist after createStarterGroundAndPlayer');
    const tileSize = controller.app.store.manifest.tileSize;
    assert.equal(player.position.x % tileSize, 0, `player spawn X ${player.position.x} must be a multiple of tileSize ${tileSize}`);
    assert.equal(player.position.y % tileSize, 0, `player spawn Y ${player.position.y} must be a multiple of tileSize ${tileSize}`);
    controller.dispose();
});
test('D-008: createPlayablePlayer -- player spawn X and Y are both multiples of tileSize', () => {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer();
    const inspectorContainer = new FakeContainer();
    const consoleContainer = new FakeContainer();
    const status = { textContent: '' };
    const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });
    controller.createPlayablePlayer();
    const player = controller.app.store.entities.find((e) => e.tags.includes('player'));
    assert.ok(player !== undefined, 'player entity should exist after createPlayablePlayer');
    const tileSize = controller.app.store.manifest.tileSize;
    assert.equal(player.position.x % tileSize, 0, `player spawn X ${player.position.x} must be a multiple of tileSize ${tileSize}`);
    assert.equal(player.position.y % tileSize, 0, `player spawn Y ${player.position.y} must be a multiple of tileSize ${tileSize}`);
    controller.dispose();
});
//# sourceMappingURL=editor-shell-controller.test.js.map