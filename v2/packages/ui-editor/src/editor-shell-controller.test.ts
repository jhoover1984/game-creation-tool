import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorShellController } from './editor-shell-controller.js';

class FakeButton {
  private clickHandlers: Array<() => void> = [];

  addEventListener(type: string, handler: () => void): void {
    if (type === 'click') this.clickHandlers.push(handler);
  }

  click(): void {
    for (const handler of this.clickHandlers) {
      handler();
    }
  }
}

class FakeInput {
  value: string;
  private changeHandlers: Array<() => void> = [];

  constructor(value: string) {
    this.value = value;
  }

  addEventListener(type: string, handler: () => void): void {
    if (type === 'change') this.changeHandlers.push(handler);
  }

  triggerChange(): void {
    for (const handler of this.changeHandlers) {
      handler();
    }
  }
}

class FakeContainer {
  innerHTML = '';
  private listeners: Array<(event: Event) => void> = [];

  addEventListener(type: string, handler: (event: Event) => void): void {
    if (type === 'click') this.listeners.push(handler);
  }

  removeEventListener(type: string, handler: (event: Event) => void): void {
    if (type !== 'click') return;
    this.listeners = this.listeners.filter((h) => h !== handler);
  }
}

class FakeStorage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

function createMockCanvas() {
  const listeners = new Map<string, Array<(event: Event) => void>>();
  const ctx = {
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    strokeRect() {},
    fillRect() {},
    fillText() {},
    strokeStyle: '#000',
    lineWidth: 1,
    fillStyle: '#000',
    font: '10px monospace',
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    style: { cursor: '' },
    getContext: () => ctx,
    addEventListener(type: string, handler: (event: Event) => void) {
      const existing = listeners.get(type) ?? [];
      existing.push(handler);
      listeners.set(type, existing);
    },
    removeEventListener(type: string, handler: (event: Event) => void) {
      const existing = listeners.get(type) ?? [];
      listeners.set(
        type,
        existing.filter((fn) => fn !== handler),
      );
    },
    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        width: canvas.width || 320,
        height: canvas.height || 240,
      } as DOMRect;
    },
    emit(type: string, event: Event): void {
      const existing = listeners.get(type) ?? [];
      for (const handler of existing) {
        handler(event);
      }
    },
  };

  return canvas as unknown as HTMLCanvasElement;
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
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;

  const controller = new EditorShellController({
    canvas,
    tasksContainer,
    inspectorContainer,
    consoleContainer,
    status,
  });

  assert.equal(status.textContent, 'Project: Untitled (64x36, tile 16)');
  assert.match((tasksContainer as unknown as FakeContainer).innerHTML, /No diagnostics/);
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
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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
  assert.match((tasksContainer as unknown as FakeContainer).innerHTML, /Connect unreachable node/);
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
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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
  assert.match((consoleContainer as unknown as FakeContainer).innerHTML, /Added player entity/);
  controller.dispose();
});

test('EditorShellController Add Starter Scene paints starter row and creates player', () => {
  const canvas = createMockCanvas();
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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
  assert.match((consoleContainer as unknown as FakeContainer).innerHTML, /Starter scene ready/);
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
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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

  assert.match((consoleContainer as unknown as FakeContainer).innerHTML, /Tick 1: 2 entities, 1 interactions/);
  assert.match((consoleContainer as unknown as FakeContainer).innerHTML, /Interact player_1 -> npc_1/);
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
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
  const playtestHud = { textContent: '' } as unknown as HTMLElement;
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
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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

  (canvas as unknown as {
    emit(type: string, event: Event): void;
  }).emit('pointerdown', {
    button: 0,
    clientX: 8,
    clientY: 8,
    preventDefault() {},
  } as unknown as Event);
  (canvas as unknown as {
    emit(type: string, event: Event): void;
  }).emit('pointermove', {
    button: 0,
    clientX: 24,
    clientY: 8,
    preventDefault() {},
  } as unknown as Event);
  (canvas as unknown as {
    emit(type: string, event: Event): void;
  }).emit('pointerup', {
    button: 0,
    clientX: 24,
    clientY: 8,
    preventDefault() {},
  } as unknown as Event);

  assert.equal(controller.app.store.tileLayers[0].data[0], 1);
  assert.equal(controller.app.store.tileLayers[0].data[1], 1);

  controller.app.undo();
  assert.equal(controller.app.store.tileLayers[0].data[0], 0);
  assert.equal(controller.app.store.tileLayers[0].data[1], 0);

  controller.dispose();
});

test('EditorShellController apply map recreates project with requested dimensions', () => {
  const canvas = createMockCanvas();
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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
  assert.equal((canvas as unknown as HTMLCanvasElement).width, 288);
  assert.equal((canvas as unknown as HTMLCanvasElement).height, 192);
  assert.match(status.textContent ?? '', /12x8, tile 24/);
  controller.dispose();
});

test('EditorShellController contextmenu hit-test selects entity under cursor', () => {
  const canvas = createMockCanvas();
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;

  const controller = new EditorShellController({
    canvas,
    tasksContainer,
    inspectorContainer,
    consoleContainer,
    status,
  });

  controller.app.createEntity('RightClickMe', 0, 0);
  controller.app.store.selectEntity(null);

  (canvas as unknown as {
    emit(type: string, event: Event): void;
  }).emit('contextmenu', {
    clientX: 4,
    clientY: 4,
    preventDefault() {},
  } as unknown as Event);

  assert.ok(controller.app.store.selectedEntityId, 'right-click should select an entity at cursor');
  controller.dispose();
});

test('EditorShellController switches to erase tool and removes painted tile', () => {
  const canvas = createMockCanvas();
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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
  (canvas as unknown as { emit(type: string, event: Event): void }).emit('pointerdown', {
    button: 0, clientX: 8, clientY: 8, preventDefault() {},
  } as unknown as Event);
  (canvas as unknown as { emit(type: string, event: Event): void }).emit('pointerup', {
    button: 0, clientX: 8, clientY: 8, preventDefault() {},
  } as unknown as Event);
  assert.equal(controller.app.store.tileLayers[0].data[0], 7);

  toolSelect.value = 'erase';
  toolSelect.triggerChange();
  (canvas as unknown as { emit(type: string, event: Event): void }).emit('pointerdown', {
    button: 0, clientX: 8, clientY: 8, preventDefault() {},
  } as unknown as Event);
  (canvas as unknown as { emit(type: string, event: Event): void }).emit('pointerup', {
    button: 0, clientX: 8, clientY: 8, preventDefault() {},
  } as unknown as Event);

  assert.equal(controller.app.store.tileLayers[0].data[0], 0);
  controller.dispose();
});

test('EditorShellController place-entity tool auto-selects created entity', () => {
  const canvas = createMockCanvas();
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;
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

  (canvas as unknown as { emit(type: string, event: Event): void }).emit('pointerdown', {
    button: 0, clientX: 8, clientY: 8, preventDefault() {},
  } as unknown as Event);

  assert.equal(controller.app.store.entities.length, 1);
  assert.equal(controller.app.store.selectedEntityId, controller.app.store.entities[0].id);
  assert.match((inspectorContainer as unknown as FakeContainer).innerHTML, /<h2>Entity<\/h2>/);

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

function parseTransform(transform: string): { panX: number; panY: number; zoom: number } | null {
  const m = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s+scale\(([-\d.]+)\)/);
  if (!m) return null;
  return { panX: parseFloat(m[1]), panY: parseFloat(m[2]), zoom: parseFloat(m[3]) };
}

function makeFramingCanvas(container: { clientWidth: number; clientHeight: number }) {
  const ctx = {
    clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    strokeRect() {}, fillRect() {}, fillText() {},
    strokeStyle: '#000', lineWidth: 1, fillStyle: '#000', font: '10px monospace',
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 1024,
    height: 576,
    style: { cursor: '', transform: '', transformOrigin: '' },
    parentElement: container,
    getContext: () => ctx,
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1024, height: 576 } as DOMRect;
    },
  };
  return canvas as unknown as HTMLCanvasElement;
}

test('UI-SHELL-POLISH-001 A4/A5: fitViewportToMap sets a canvas transform that keeps map within container on startup', () => {
  // Default project: 64x36 tiles * 16px = 1024x576px map
  const container = { clientWidth: 800, clientHeight: 600 };
  const canvas = makeFramingCanvas(container);
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;

  const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });

  // Manually invoke the startup fit (rAF does not fire in Node.js)
  (controller as unknown as { fitViewportToMap(): void }).fitViewportToMap();

  const t = parseTransform((canvas as unknown as { style: { transform: string } }).style.transform);
  assert.ok(t !== null, 'canvas must have a CSS transform after fitViewportToMap');

  const mapWidth = controller.app.store.manifest.resolution.width;
  const mapHeight = controller.app.store.manifest.resolution.height;

  // No-clip invariant: scaled map must not overflow the container on either axis
  const scaledWidth = mapWidth * t.zoom;
  const scaledHeight = mapHeight * t.zoom;
  assert.ok(
    scaledWidth <= container.clientWidth + 0.5,
    `scaled map width ${scaledWidth.toFixed(2)} must not exceed container width ${container.clientWidth}`,
  );
  assert.ok(
    scaledHeight <= container.clientHeight + 0.5,
    `scaled map height ${scaledHeight.toFixed(2)} must not exceed container height ${container.clientHeight}`,
  );
  assert.ok(t.zoom > 0, 'zoom must be positive');

  controller.dispose();
});

test('UI-SHELL-POLISH-001 A4/A5: fitViewportToMap recalculates correctly after resize -- no clipping in smaller window', () => {
  // Start with a larger container, then simulate a resize to a smaller one.
  const container = { clientWidth: 1200, clientHeight: 700 };
  const canvas = makeFramingCanvas(container);
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;

  const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });
  const fit = (controller as unknown as { fitViewportToMap(): void }).fitViewportToMap.bind(controller);

  fit();
  const t1 = parseTransform((canvas as unknown as { style: { transform: string } }).style.transform)!;
  assert.ok(t1.zoom > 1.0, 'large window should upscale the map');

  // Simulate resize to compact window
  container.clientWidth = 600;
  container.clientHeight = 400;
  fit();
  const t2 = parseTransform((canvas as unknown as { style: { transform: string } }).style.transform)!;

  const mapWidth = controller.app.store.manifest.resolution.width;
  const mapHeight = controller.app.store.manifest.resolution.height;
  const scaledWidth2 = mapWidth * t2.zoom;
  const scaledHeight2 = mapHeight * t2.zoom;

  assert.ok(t2.zoom < 1.0, 'compact window should scale map down');
  assert.ok(
    scaledWidth2 <= container.clientWidth + 0.5,
    `after resize, scaled width ${scaledWidth2.toFixed(2)} must not exceed new container width ${container.clientWidth}`,
  );
  assert.ok(
    scaledHeight2 <= container.clientHeight + 0.5,
    `after resize, scaled height ${scaledHeight2.toFixed(2)} must not exceed new container height ${container.clientHeight}`,
  );

  controller.dispose();
});

test('D-002: fitViewportToMap applies FRAMING_MARGIN_PX -- scaled map is strictly smaller than container on both axes', () => {
  // Container sized to match the default 1024x576 map exactly.
  // Without a margin, zoom=1 and scaled dimensions = container; clip would occur.
  // With FRAMING_MARGIN_PX=4, scaled dimensions must be strictly < container on both axes.
  const container = { clientWidth: 1024, clientHeight: 576 };
  const canvas = makeFramingCanvas(container);
  const tasksContainer = new FakeContainer() as unknown as HTMLElement;
  const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
  const consoleContainer = new FakeContainer() as unknown as HTMLElement;
  const status = { textContent: '' } as unknown as HTMLElement;

  const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });
  (controller as unknown as { fitViewportToMap(): void }).fitViewportToMap();

  const t = parseTransform((canvas as unknown as { style: { transform: string } }).style.transform);
  assert.ok(t !== null, 'canvas must have a CSS transform');

  const mapWidth = controller.app.store.manifest.resolution.width;
  const mapHeight = controller.app.store.manifest.resolution.height;
  const scaledWidth = mapWidth * t.zoom;
  const scaledHeight = mapHeight * t.zoom;

  assert.ok(
    scaledWidth < container.clientWidth,
    `D-002: scaled width ${scaledWidth.toFixed(2)} must be strictly < container width ${container.clientWidth}`,
  );
  assert.ok(
    scaledHeight < container.clientHeight,
    `D-002: scaled height ${scaledHeight.toFixed(2)} must be strictly < container height ${container.clientHeight}`,
  );

  controller.dispose();
});

// --- D-005a: Playtest run loop tests ---
// rAF is mocked per-test and restored in a finally block to prevent cross-test flake.

function makeRafMock() {
  const queue: FrameRequestCallback[] = [];
  let id = 0;
  const origRaf = globalThis.requestAnimationFrame;
  const origCaf = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    queue.push(cb);
    return ++id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {
    queue.length = 0;
  }) as typeof cancelAnimationFrame;
  const flush = (n = 1) => { for (let i = 0; i < n; i++) queue.shift()?.(0); };
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
    const tasksContainer = new FakeContainer() as unknown as HTMLElement;
    const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
    const consoleContainer = new FakeContainer() as unknown as HTMLElement;
    const status = { textContent: '' } as unknown as HTMLElement;
    const playtestHud = { textContent: '' } as unknown as HTMLElement;
    const btnPlay = new FakeButton();

    const controller = new EditorShellController({
      canvas, tasksContainer, inspectorContainer, consoleContainer, status, playtestHud, btnPlay,
    });

    btnPlay.click();
    raf.flush(3);

    assert.match(
      playtestHud.textContent ?? '',
      /tick=\d+/,
      'HUD must contain tick= after rAF frames',
    );
    const m = /tick=(\d+)/.exec(playtestHud.textContent ?? '');
    assert.ok(m !== null && Number(m[1]) > 0, `tick should be > 0, got: ${playtestHud.textContent}`);

    controller.dispose();
  } finally {
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
    const tasksContainer = new FakeContainer() as unknown as HTMLElement;
    const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
    const consoleContainer = new FakeContainer() as unknown as HTMLElement;
    const status = { textContent: '' } as unknown as HTMLElement;
    const playtestHud = { textContent: '' } as unknown as HTMLElement;
    const btnLoad = new FakeButton();
    const btnPlay = new FakeButton();

    const controller = new EditorShellController({
      canvas, tasksContainer, inspectorContainer, consoleContainer, status, playtestHud, btnLoad, btnPlay,
    });

    btnLoad.click();
    btnPlay.click();
    raf.flush(3);

    assert.ok(
      (playtestHud.textContent ?? '').includes('player=('),
      `HUD must contain player=( when player entity present, got: "${playtestHud.textContent}"`,
    );

    controller.dispose();
  } finally {
    raf.restore();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: oldLocalStorage });
  }
});

test('D-005a: run loop -- Pause stops the loop; HUD retains last tick', () => {
  const raf = makeRafMock();
  try {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer() as unknown as HTMLElement;
    const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
    const consoleContainer = new FakeContainer() as unknown as HTMLElement;
    const status = { textContent: '' } as unknown as HTMLElement;
    const playtestHud = { textContent: '' } as unknown as HTMLElement;
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
    assert.match(
      playtestHud.textContent ?? '',
      /tick=\d+/,
      'HUD must retain tick= after Pause',
    );

    controller.dispose();
  } finally {
    raf.restore();
  }
});

test('D-005a: Step from paused state increments HUD tick by 1', () => {
  const raf = makeRafMock();
  try {
    const canvas = createMockCanvas();
    const tasksContainer = new FakeContainer() as unknown as HTMLElement;
    const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
    const consoleContainer = new FakeContainer() as unknown as HTMLElement;
    const status = { textContent: '' } as unknown as HTMLElement;
    const playtestHud = { textContent: '' } as unknown as HTMLElement;
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
  } finally {
    raf.restore();
  }
});

// --- D-002: ResizeObserver re-fit tests ---
// Verifies that container resize events trigger a debounced fitViewportToMap() call.
// ResizeObserver is mocked since Node.js test environment does not provide it.

test('D-002: ResizeObserver re-fits viewport on container resize -- no-clip invariant holds after resize', () => {
  // Use a plain callback type -- ResizeObserverEntry is a DOM type not in the Node.js test lib.
  let capturedCb: (() => void) | null = null;
  const origResizeObserver = (globalThis as Record<string, unknown>)['ResizeObserver'];
  class MockResizeObserver {
    constructor(cb: (...args: unknown[]) => void) { capturedCb = cb as () => void; }
    observe(_target: unknown): void {}
    disconnect(): void {}
  }
  (globalThis as Record<string, unknown>)['ResizeObserver'] = MockResizeObserver;
  const raf = makeRafMock();
  try {
    const container = { clientWidth: 1200, clientHeight: 700 };
    const canvas = makeFramingCanvas(container);
    const tasksContainer = new FakeContainer() as unknown as HTMLElement;
    const inspectorContainer = new FakeContainer() as unknown as HTMLElement;
    const consoleContainer = new FakeContainer() as unknown as HTMLElement;
    const status = { textContent: '' } as unknown as HTMLElement;

    const controller = new EditorShellController({ canvas, tasksContainer, inspectorContainer, consoleContainer, status });

    assert.ok(capturedCb !== null, 'ResizeObserver callback should have been registered');

    // Drain startup double-rAF so baseline transform is set
    raf.flush(2);

    const t1 = parseTransform((canvas as unknown as { style: { transform: string } }).style.transform);
    assert.ok(t1 !== null, 'canvas must have a transform after startup fit');

    // Shrink the container and fire the observer callback
    container.clientWidth = 500;
    container.clientHeight = 400;
    (capturedCb as () => void)();

    // Flush the debounce rAF queued by the observer callback
    raf.flush(1);

    const t2 = parseTransform((canvas as unknown as { style: { transform: string } }).style.transform);
    assert.ok(t2 !== null, 'canvas must have a transform after resize fit');

    const mapWidth = controller.app.store.manifest.resolution.width;
    const mapHeight = controller.app.store.manifest.resolution.height;
    assert.ok(
      mapWidth * t2.zoom < container.clientWidth,
      `after resize, scaled width ${(mapWidth * t2.zoom).toFixed(2)} must be < container width ${container.clientWidth}`,
    );
    assert.ok(
      mapHeight * t2.zoom < container.clientHeight,
      `after resize, scaled height ${(mapHeight * t2.zoom).toFixed(2)} must be < container height ${container.clientHeight}`,
    );
    assert.ok(t2.zoom < t1.zoom, 'zoom should decrease when container shrinks');

    controller.dispose();
  } finally {
    (globalThis as Record<string, unknown>)['ResizeObserver'] = origResizeObserver;
    raf.restore();
  }
});
