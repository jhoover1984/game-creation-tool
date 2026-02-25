import { EditorApp } from './editor-app.js';
import { EntityInspectorController } from './entity-inspector-controller.js';
import { PlaytestRunner } from '@gcs/runtime-web';
import { createPersistenceStore } from './persistence-store.js';
import { TasksTabController } from './tasks-tab-controller.js';
import { StoryPanelController } from './story-panel-controller.js';
import { OnboardingStore } from './onboarding-store.js';
import { OnboardingChecklistController } from './onboarding-checklist-controller.js';
import { BehaviorPanelController } from './behavior-panel-controller.js';
import { SpritePanelController } from './sprite-panel-controller.js';
import { SpriteWorkspaceStore } from './sprite-workspace-store.js';
import { DEMO_RULESET } from './tile-rule-engine.js';
import { EffectsPanelController } from './effects-panel-controller.js';
import { ExportPanelController } from './export-panel-controller.js';
import { AnimationPanelController } from './animation-panel-controller.js';
import { ModalController } from './modal-controller.js';
import { ContextMenuController } from './context-menu-controller.js';
import { ViewportController } from './viewport-controller.js';
/**
 * Minimal shell integration controller.
 * Wires EditorApp + TasksTabController to real shell elements.
 */
export class EditorShellController {
    app;
    onboardingStore;
    tasksController;
    inspectorController;
    storyController;
    checklistController;
    behaviorController;
    spriteStore = new SpriteWorkspaceStore();
    spriteController;
    effectsController;
    exportController;
    animationController;
    contextMenuController;
    unsubscribeDiagnostics;
    unsubscribeBus;
    unsubscribeOnboardingStore;
    elements;
    onCanvasClickHandler;
    onPointerDownHandler;
    onPointerMoveHandler;
    onPointerUpHandler;
    onPointerLeaveClearHoverHandler;
    tabBarClickHandler;
    keydownHandler;
    onContextMenuHandler;
    playtest = new PlaytestRunner();
    pendingInteract = false;
    loopId = null;
    lastPlaySnap = null;
    resizeObserver = null;
    fitPendingId = null;
    consoleLines = [];
    isPainting = false;
    lastPaintCell = null;
    suppressNextClickSelect = false;
    currentTool = 'select';
    currentTileId = 1;
    rulePaintCells = [];
    activeTab = 'tasks';
    isDirty = false;
    /** Snapshot taken at last save/load/new -- used for snapshot-based dirty detection. UI-DIRTY-001. */
    lastSavedSnapshot = '';
    /** Sprite store mutation counter; compared to lastCleanSpriteGeneration for dirty detection. UI-DIRTY-001. */
    spriteStoreGeneration = 0;
    lastCleanSpriteGeneration = 0;
    unsubscribeSpriteStore;
    modalController;
    /** Viewport zoom/pan state. UI-VIEWPORT-001. */
    viewport = new ViewportController();
    isSpacePanning = false;
    onWheelHandler;
    keyupHandler;
    constructor(elements, onboardingStore) {
        this.elements = elements;
        this.app = new EditorApp();
        const persistence = globalThis.localStorage
            ? createPersistenceStore(globalThis.localStorage)
            : null;
        const nullStorage = { getItem: () => null, setItem: () => undefined };
        this.onboardingStore = onboardingStore
            ?? new OnboardingStore(globalThis.localStorage ?? nullStorage);
        this.app.mount(elements.canvas);
        this.app.newProject('Untitled', 64, 36, 16);
        this.syncControlsFromProject();
        this.markClean(); // establish baseline snapshot -- UI-DIRTY-001
        this.updateProjectStatus();
        this.writeConsole('Playtest console ready.');
        this.updatePlaytestHud(null);
        // Apply beginner/pro mode to shell root
        const mode = this.onboardingStore.getPreferences().mode;
        elements.shellRoot?.setAttribute('data-mode', mode);
        // Apply default density (comfort) -- independent of mode (UI-VISUAL-002 Slice B)
        elements.shellRoot?.setAttribute('data-density', 'comfort');
        this.unsubscribeOnboardingStore = this.onboardingStore.subscribe(() => {
            elements.shellRoot?.setAttribute('data-mode', this.onboardingStore.getPreferences().mode);
        });
        // Modal controller -- UI-SHELL-002
        this.modalController = elements.modalOverlay
            ? new ModalController(elements.modalOverlay)
            : null;
        // Tab bar -- UI-SHELL-001
        this.tabBarClickHandler = (e) => {
            const btn = e.target?.closest('[data-tab]');
            if (btn && btn.dataset['tab']) {
                this.setActiveTab(btn.dataset['tab']);
            }
        };
        if (elements.tabBar) {
            elements.tabBar.addEventListener('click', this.tabBarClickHandler);
        }
        this.setActiveTab('tasks');
        this.tasksController = new TasksTabController(this.app, elements.tasksContainer);
        this.inspectorController = new EntityInspectorController(this.app, elements.inspectorContainer);
        this.storyController = elements.storyContainer
            ? new StoryPanelController(this.app, elements.storyContainer, () => this.recomputeDirty())
            : null;
        this.checklistController = elements.checklistContainer
            ? new OnboardingChecklistController(this.app, this.onboardingStore, elements.checklistContainer, (action) => {
                if (action === 'add-starter')
                    this.createStarterGroundAndPlayer();
            })
            : null;
        this.behaviorController = elements.behaviorContainer
            ? new BehaviorPanelController({
                subscribe: (fn) => this.app.subscribe(fn),
                dispatch: (cmd) => this.app.dispatch(cmd),
                getBehaviors: (entityId) => this.app.store.getBehaviors(entityId),
                getTrace: () => this.playtest.getTrace(),
            }, elements.behaviorContainer)
            : null;
        this.spriteController = elements.spriteContainer
            ? new SpritePanelController(this.spriteStore, elements.spriteContainer, (assetId, results) => {
                // Clear all previous sprite palette diagnostics
                this.app.diagnosticStore.removeByCodeAndPath('SPRITE_COLOR_OUT_OF_PALETTE', '');
                if (assetId && results.length > 0) {
                    this.app.diagnosticStore.add({
                        id: `editor:SPRITE_COLOR_OUT_OF_PALETTE:${assetId}`,
                        code: 'SPRITE_COLOR_OUT_OF_PALETTE',
                        severity: 'warning',
                        source: 'editor',
                        category: 'interaction',
                        path: assetId,
                        message: `${results.length} pixel(s) outside the sprite palette`,
                        actions: [{ label: 'Use Remap in Sprite Panel', deterministic: false }],
                    });
                }
                this.tasksController.refresh();
            })
            : null;
        this.effectsController = elements.effectsContainer
            ? new EffectsPanelController(this.app, elements.effectsContainer, elements.effectsOverlay ?? null)
            : null;
        this.exportController = elements.exportContainer
            ? new ExportPanelController(this.app, elements.exportContainer, (line) => this.writeConsole(line))
            : null;
        this.animationController = elements.animationContainer
            ? new AnimationPanelController(this.app, elements.animationContainer)
            : null;
        this.unsubscribeDiagnostics = this.app.diagnosticStore.subscribe(() => this.tasksController.refresh());
        this.unsubscribeBus = this.app.subscribe(() => {
            this.inspectorController.refresh();
            this.recomputeDirty(); // snapshot-based dirty detection -- UI-DIRTY-001
            this.refreshUndoRedoState();
        });
        // Track sprite mutations for dirty detection (UI-DIRTY-001)
        this.unsubscribeSpriteStore = this.spriteStore.subscribe(() => {
            this.spriteStoreGeneration++;
            this.recomputeDirty();
        });
        this.onCanvasClickHandler = (event) => {
            if (this.suppressNextClickSelect) {
                this.suppressNextClickSelect = false;
                return;
            }
            this.selectEntityAtCanvasClientPoint(event.clientX, event.clientY);
        };
        this.onPointerDownHandler = (event) => {
            // Middle-mouse or Space+left: start viewport pan (UI-VIEWPORT-001)
            if (event.button === 1 || (event.button === 0 && this.isSpacePanning)) {
                event.preventDefault();
                this.viewport.startPan(event.clientX, event.clientY);
                this.elements.canvas.style.cursor = 'grabbing';
                return;
            }
            if (event.button !== 0)
                return;
            // Select tool: click-select is handled by the canvas click handler; no paint action needed.
            if (this.currentTool === 'select')
                return;
            if (this.currentTool === 'entity') {
                const cell = this.pointerToCell(event);
                if (!cell)
                    return;
                const px = cell.tx * this.app.store.manifest.tileSize;
                const py = cell.ty * this.app.store.manifest.tileSize;
                const prevCount = this.app.store.entities.length;
                this.app.createEntity(`Entity ${this.app.store.entities.length + 1}`, px, py);
                // Auto-select newly placed entity so inspector/workspace panels bind immediately.
                if (this.app.store.entities.length > prevCount) {
                    const created = this.app.store.entities[this.app.store.entities.length - 1];
                    this.app.store.selectEntity(created.id);
                    this.behaviorController?.notifyEntitySelected(created.id);
                    this.animationController?.notifyEntitySelected(created.id);
                    this.spriteController?.notifyEntitySelected(created.id, created.spriteId ?? null);
                }
                this.inspectorController.refresh();
                this.suppressNextClickSelect = true;
                event.preventDefault();
                return;
            }
            this.isPainting = true;
            this.lastPaintCell = null;
            if (this.currentTool === 'rule-paint') {
                this.rulePaintCells = [];
            }
            else {
                this.app.beginPaintStroke();
            }
            this.paintAtPointer(event);
            event.preventDefault();
        };
        this.onPointerMoveHandler = (event) => {
            // Viewport pan continuation (UI-VIEWPORT-001)
            if (this.viewport.isPanning) {
                this.viewport.continuePan(event.clientX, event.clientY);
                this.viewport.applyTransform(this.elements.canvas);
                return;
            }
            const cell = this.pointerToCell(event);
            this.app.setHoverCell(cell?.tx ?? null, cell?.ty);
            if (!this.isPainting)
                return;
            this.paintAtPointer(event);
        };
        this.onPointerUpHandler = () => {
            // End viewport pan if active (UI-VIEWPORT-001)
            if (this.viewport.isPanning) {
                this.viewport.endPan();
                this.updateCanvasCursor(this.currentTool);
                return;
            }
            if (!this.isPainting)
                return;
            this.isPainting = false;
            this.lastPaintCell = null;
            if (this.currentTool === 'rule-paint') {
                if (this.rulePaintCells.length > 0) {
                    this.app.applyRulePaint('layer-0', this.rulePaintCells, DEMO_RULESET);
                }
                this.rulePaintCells = [];
            }
            else {
                this.app.endPaintStroke();
            }
            this.suppressNextClickSelect = true;
        };
        this.onPointerLeaveClearHoverHandler = () => {
            this.app.setHoverCell(null);
        };
        // Context menu -- UI-CTX-001
        this.contextMenuController = elements.contextMenu
            ? new ContextMenuController(elements.contextMenu, {
                getSelectedEntityId: () => this.app.store.selectedEntityId,
                deleteSelected: () => {
                    const id = this.app.store.selectedEntityId;
                    if (!id)
                        return;
                    this.app.deleteEntity(id);
                    this.app.store.selectEntity(null);
                    this.inspectorController.refresh();
                    this.behaviorController?.notifyEntitySelected(null);
                    this.animationController?.notifyEntitySelected(null);
                    this.spriteController?.notifyEntitySelected(null, null);
                },
                deselectAll: () => {
                    this.app.store.selectEntity(null);
                    this.inspectorController.refresh();
                    this.behaviorController?.notifyEntitySelected(null);
                    this.animationController?.notifyEntitySelected(null);
                    this.spriteController?.notifyEntitySelected(null, null);
                },
                focusInspector: () => {
                    this.inspectorController.refresh();
                    this.elements.inspectorContainer.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
                    const focusTarget = this.elements.inspectorContainer.querySelector('input, select, textarea, button, [tabindex]');
                    focusTarget?.focus?.();
                },
            }, elements.contextMenuTarget)
            : null;
        this.onContextMenuHandler = (event) => {
            event.preventDefault();
            this.selectEntityAtCanvasClientPoint(event.clientX, event.clientY);
            this.contextMenuController?.show(event.clientX, event.clientY);
        };
        elements.canvas.addEventListener('contextmenu', this.onContextMenuHandler);
        elements.canvas.addEventListener('click', this.onCanvasClickHandler);
        elements.canvas.addEventListener('pointerdown', this.onPointerDownHandler);
        elements.canvas.addEventListener('pointermove', this.onPointerMoveHandler);
        elements.canvas.addEventListener('pointerup', this.onPointerUpHandler);
        elements.canvas.addEventListener('pointerleave', this.onPointerUpHandler);
        elements.canvas.addEventListener('pointercancel', this.onPointerUpHandler);
        elements.canvas.addEventListener('pointerleave', this.onPointerLeaveClearHoverHandler);
        // Viewport wheel zoom -- UI-VIEWPORT-001
        this.onWheelHandler = (e) => {
            e.preventDefault();
            const containerRect = this.elements.canvas.parentElement?.getBoundingClientRect();
            const mx = containerRect ? e.clientX - containerRect.left : e.clientX;
            const my = containerRect ? e.clientY - containerRect.top : e.clientY;
            this.viewport.handleWheel(e.deltaY, mx, my);
            this.viewport.applyTransform(this.elements.canvas);
        };
        elements.canvas.addEventListener('wheel', this.onWheelHandler, { passive: false });
        // Set initial canvas cursor for default tool (UI-SELECT-001)
        this.updateCanvasCursor(this.currentTool);
        elements.toolSelect?.addEventListener('change', () => {
            const next = elements.toolSelect?.value;
            if (next === 'select' ||
                next === 'paint' ||
                next === 'erase' ||
                next === 'entity' ||
                next === 'rule-paint') {
                this.currentTool = next;
                this.updateCanvasCursor(next);
            }
        });
        elements.tileIdInput?.addEventListener('change', () => {
            const raw = Number.parseInt(elements.tileIdInput?.value ?? '', 10);
            if (Number.isFinite(raw) && raw >= 0) {
                this.currentTileId = raw;
            }
        });
        const doNewProject = () => {
            const dims = this.readMapInputsOrDefault();
            this.app.newProject('Untitled', dims.width, dims.height, dims.tileSize);
            this.spriteStore.clearAll(); // drop all stale sprite buffers (SPRITE-PERSIST-001)
            this.markClean();
            this.syncControlsFromProject();
            this.updateProjectStatus();
            this.inspectorController.refresh();
            this.storyController?.refresh();
            this.stopPlayLoop(); // D-005a: halt run loop before exit
            this.playtest.exit();
            this.playtest.clearTrace();
            this.lastPlaySnap = null;
            this.app.diagnosticStore.removeByCodeAndPath('BEHAV_ROW_CAP_EXCEEDED', '');
            this.app.diagnosticStore.removeByCodeAndPath('BEHAV_ACTION_CAP_EXCEEDED', '');
            this.effectsController?.setPlaytestTick(0);
            this.behaviorController?.notifyEntitySelected(null);
            this.animationController?.notifyEntitySelected(null);
            this.behaviorController?.notifyPlaytestExited();
            this.spriteController?.notifyEntitySelected(null, null);
            this.effectsController?.refresh();
            this.writeConsole('Project reset. Playtest stopped.');
            this.updatePlaytestHud(null);
            this.fitViewportToMap();
            this.checklistController?.notifyProjectCreated();
            this.exportController?.invalidate();
            this.refreshUndoRedoState();
        };
        elements.btnNew?.addEventListener('click', () => {
            if (this.isDirty && this.modalController) {
                this.modalController.showConfirm('New Project', 'Create a new project? Unsaved changes will be lost.', doNewProject);
            }
            else {
                doNewProject();
            }
        });
        elements.btnApplyMap?.addEventListener('click', () => {
            const dims = this.readMapInputsOrDefault();
            const name = this.app.store.manifest.name || 'Untitled';
            this.app.newProject(name, dims.width, dims.height, dims.tileSize);
            this.recomputeDirty();
            this.syncControlsFromProject();
            this.updateProjectStatus();
            this.inspectorController.refresh();
            this.storyController?.refresh();
            this.effectsController?.refresh();
            this.stopPlayLoop(); // D-005a: halt run loop before exit
            this.playtest.exit();
            this.lastPlaySnap = null;
            this.app.diagnosticStore.removeByCodeAndPath('BEHAV_ROW_CAP_EXCEEDED', '');
            this.app.diagnosticStore.removeByCodeAndPath('BEHAV_ACTION_CAP_EXCEEDED', '');
            this.effectsController?.setPlaytestTick(0);
            this.writeConsole(`Applied map size ${dims.width}x${dims.height} @ tile ${dims.tileSize}.`);
            this.updatePlaytestHud(null);
            this.fitViewportToMap();
            this.exportController?.invalidate();
            this.refreshUndoRedoState();
        });
        // Undo/Redo buttons -- UI-UNDO-001
        elements.btnUndo?.addEventListener('click', () => {
            this.app.undo();
            this.inspectorController.refresh();
            this.recomputeDirty();
            this.refreshUndoRedoState();
        });
        elements.btnRedo?.addEventListener('click', () => {
            this.app.redo();
            this.inspectorController.refresh();
            this.recomputeDirty();
            this.refreshUndoRedoState();
        });
        this.refreshUndoRedoState();
        // Zoom-reset / fit-to-map button -- UI-VIEWPORT-001
        elements.btnZoomReset?.addEventListener('click', () => {
            this.fitViewportToMap();
        });
        // Keyboard shortcuts -- UI-HOTKEY-001
        this.keydownHandler = (e) => {
            const ke = e;
            const target = ke.target;
            const tag = target?.tagName?.toUpperCase() ?? '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
                return;
            if (ke.key === 'Escape' && this.modalController?.isOpen) {
                this.modalController.hide();
                return;
            }
            if (ke.ctrlKey && !ke.shiftKey && ke.key.toLowerCase() === 'z') {
                ke.preventDefault();
                this.app.undo();
                this.inspectorController.refresh();
                this.recomputeDirty();
                this.refreshUndoRedoState();
                return;
            }
            if ((ke.ctrlKey && ke.key.toLowerCase() === 'y') ||
                (ke.ctrlKey && ke.shiftKey && ke.key.toLowerCase() === 'z')) {
                ke.preventDefault();
                this.app.redo();
                this.inspectorController.refresh();
                this.recomputeDirty();
                this.refreshUndoRedoState();
                return;
            }
            if (!ke.ctrlKey && !ke.altKey && !ke.metaKey) {
                const lk = ke.key.toLowerCase();
                if (lk === 's') {
                    this.setTool('select');
                    return;
                }
                if (lk === 'p') {
                    this.setTool('paint');
                    return;
                }
                if (lk === 'e') {
                    this.setTool('erase');
                    return;
                }
                if (ke.key === ' ') {
                    ke.preventDefault();
                    if (this.playtest.getStatus() === 'stopped') {
                        // Not in playtest: Space enables viewport pan mode (UI-VIEWPORT-001)
                        this.isSpacePanning = true;
                        this.elements.canvas.style.cursor = 'grab';
                    }
                    else {
                        this.stepPlaytest();
                    }
                    return;
                }
            }
        };
        elements.keydownTarget?.addEventListener('keydown', this.keydownHandler);
        // Space-pan release -- UI-VIEWPORT-001
        this.keyupHandler = (e) => {
            const ke = e;
            if (ke.key === ' ') {
                this.isSpacePanning = false;
                if (!this.viewport.isPanning) {
                    this.updateCanvasCursor(this.currentTool);
                }
            }
        };
        elements.keydownTarget?.addEventListener('keyup', this.keyupHandler);
        elements.btnSave?.addEventListener('click', () => {
            // Flush sprite workspace buffers into the project store before serializing (SPRITE-PERSIST-001).
            for (const buf of this.spriteStore.exportBuffers()) {
                this.app.store.setSpriteAsset(buf);
            }
            const json = this.app.save();
            persistence?.saveProject(json);
            this.markClean();
            elements.status.textContent = `Saved: ${this.app.store.manifest.name}`;
            this.checklistController?.notifyProjectSaved();
            this.onboardingStore.pushRecent({
                id: this.app.store.manifest.id,
                name: this.app.store.manifest.name,
                lastOpened: new Date().toISOString(),
                hasWarnings: this.app.getTasks().some((t) => t.severity === 'warning'),
                hasErrors: this.app.getTasks().some((t) => t.severity === 'error' || t.severity === 'fatal'),
            });
        });
        const doLoadProject = () => {
            const raw = persistence?.loadProject() ?? null;
            if (!raw) {
                elements.status.textContent = 'No saved project found';
                return;
            }
            this.app.load(raw);
            // Clear stale sprite buffers then restore from loaded project (SPRITE-PERSIST-001).
            this.spriteStore.clearAll();
            for (const asset of Object.values(this.app.store.getAllSpriteAssets())) {
                this.spriteStore.importBuffer(asset.assetId, asset.width, asset.height, asset.pixels);
            }
            this.markClean();
            this.syncControlsFromProject();
            elements.status.textContent = `Loaded: ${this.app.store.manifest.name}`;
            this.inspectorController.refresh();
            this.storyController?.refresh();
            this.stopPlayLoop(); // D-005a: halt run loop before exit
            this.playtest.exit();
            this.playtest.clearTrace();
            this.lastPlaySnap = null;
            this.app.diagnosticStore.removeByCodeAndPath('BEHAV_ROW_CAP_EXCEEDED', '');
            this.app.diagnosticStore.removeByCodeAndPath('BEHAV_ACTION_CAP_EXCEEDED', '');
            this.effectsController?.setPlaytestTick(0);
            this.behaviorController?.notifyEntitySelected(null);
            this.animationController?.notifyEntitySelected(null);
            this.behaviorController?.notifyPlaytestExited();
            this.spriteController?.notifyEntitySelected(null, null);
            this.effectsController?.refresh();
            this.writeConsole(`Loaded project: ${this.app.store.manifest.name}`);
            this.updatePlaytestHud(null);
            this.fitViewportToMap();
            this.checklistController?.notifyProjectCreated();
            this.exportController?.invalidate();
            this.refreshUndoRedoState();
        };
        elements.btnLoad?.addEventListener('click', () => {
            if (this.isDirty && this.modalController) {
                this.modalController.showConfirm('Load Project', 'Load saved project? Unsaved changes will be lost.', doLoadProject);
            }
            else {
                doLoadProject();
            }
        });
        elements.btnPlay?.addEventListener('click', () => {
            this.playtest.init(this.app.store.entities, this.app.store.tileLayers, this.app.store.manifest.tileSize);
            this.playtest.setBehaviors(this.app.store.behaviors);
            const started = this.playtest.enter();
            if (!started)
                return;
            elements.status.textContent = `Playtest: ${this.playtest.getStatus()}`;
            this.writeConsole('Playtest entered.');
            this.updatePlaytestHud(null);
            this.checklistController?.notifyPlaytestEntered();
            this.behaviorController?.notifyPlaytestEntered();
            this.effectsController?.setPlaytestTick(0);
            this.startPlayLoop(); // D-005a: begin continuous tick/HUD updates
        });
        elements.btnPause?.addEventListener('click', () => {
            const status = this.playtest.getStatus();
            if (status === 'running') {
                this.stopPlayLoop(); // D-005a: halt the run loop before pausing
                this.playtest.pause();
            }
            else if (status === 'paused') {
                this.playtest.resume();
                this.startPlayLoop(); // D-005a: restart the loop on resume
            }
            elements.status.textContent = `Playtest: ${this.playtest.getStatus()}`;
            this.writeConsole(`Playtest ${this.playtest.getStatus()}.`);
            this.updatePlaytestHud(this.lastPlaySnap); // show last known tick/position on pause
        });
        elements.btnInteract?.addEventListener('click', () => {
            this.pendingInteract = true;
            this.writeConsole('Queued interact input for next step.');
        });
        elements.btnAddPlayer?.addEventListener('click', () => {
            this.createPlayablePlayer();
        });
        elements.btnAddStarter?.addEventListener('click', () => {
            this.createStarterGroundAndPlayer();
        });
        elements.btnStep?.addEventListener('click', () => {
            this.stepPlaytest();
        });
        // Defer initial fit until layout is stable. Double-rAF ensures two browser frames
        // pass so both layout and compositing are complete before measuring container size. UI-VIEWPORT-001.
        globalThis.requestAnimationFrame?.(() => {
            globalThis.requestAnimationFrame?.(() => this.fitViewportToMap());
        });
        // Re-fit on every container resize so the canvas stays framed at any viewport size.
        // ResizeObserver is absent in Node.js test environment -- guarded. CV-01/CV-05. D-002.
        const stage = this.elements.canvas.parentElement;
        if (stage && globalThis.ResizeObserver) {
            this.resizeObserver = new globalThis.ResizeObserver(() => {
                if (this.fitPendingId !== null) {
                    globalThis.cancelAnimationFrame?.(this.fitPendingId);
                }
                this.fitPendingId = globalThis.requestAnimationFrame?.(() => {
                    this.fitPendingId = null;
                    this.fitViewportToMap();
                }) ?? null;
            });
            this.resizeObserver.observe(stage);
        }
    }
    /** Switch layout density independently of onboarding mode (UI-VISUAL-002 Slice B). */
    setDensity(density) {
        this.elements.shellRoot?.setAttribute('data-density', density);
    }
    dispose() {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        if (this.fitPendingId !== null) {
            globalThis.cancelAnimationFrame?.(this.fitPendingId);
            this.fitPendingId = null;
        }
        this.unsubscribeDiagnostics();
        this.unsubscribeBus();
        this.unsubscribeSpriteStore();
        this.elements.keydownTarget?.removeEventListener('keydown', this.keydownHandler);
        this.elements.keydownTarget?.removeEventListener('keyup', this.keyupHandler);
        this.elements.canvas.removeEventListener('wheel', this.onWheelHandler);
        this.elements.tabBar?.removeEventListener('click', this.tabBarClickHandler);
        this.elements.canvas.removeEventListener('contextmenu', this.onContextMenuHandler);
        this.elements.canvas.removeEventListener('click', this.onCanvasClickHandler);
        this.elements.canvas.removeEventListener('pointerdown', this.onPointerDownHandler);
        this.elements.canvas.removeEventListener('pointermove', this.onPointerMoveHandler);
        this.elements.canvas.removeEventListener('pointerup', this.onPointerUpHandler);
        this.elements.canvas.removeEventListener('pointerleave', this.onPointerUpHandler);
        this.elements.canvas.removeEventListener('pointerleave', this.onPointerLeaveClearHoverHandler);
        this.elements.canvas.removeEventListener('pointercancel', this.onPointerUpHandler);
        this.inspectorController.dispose();
        this.storyController?.dispose();
        this.tasksController.dispose();
        this.checklistController?.dispose();
        this.behaviorController?.dispose();
        this.spriteController?.dispose();
        this.effectsController?.dispose();
        this.exportController?.dispose();
        this.animationController?.dispose();
        this.contextMenuController?.dispose();
        this.unsubscribeOnboardingStore();
    }
    /** Start the rAF-based playtest run loop. No-op if already running. D-005a. */
    startPlayLoop() {
        if (this.loopId !== null)
            return;
        const tick = (ts) => {
            if (this.playtest.getStatus() !== 'running') {
                this.loopId = null;
                return;
            }
            this.playtest.setInput({ moveX: 0, moveY: 0, interact: this.pendingInteract });
            this.pendingInteract = false;
            const snap = this.playtest.step();
            if (snap) {
                this.lastPlaySnap = snap;
                this.effectsController?.setPlaytestTick(snap.tick);
                this.updatePlaytestHud(snap);
            }
            this.loopId = globalThis.requestAnimationFrame?.(tick) ?? null;
        };
        this.loopId = globalThis.requestAnimationFrame?.(tick) ?? null;
    }
    /** Stop the rAF-based playtest run loop. No-op if not running. D-005a. */
    stopPlayLoop() {
        if (this.loopId !== null) {
            globalThis.cancelAnimationFrame?.(this.loopId);
            this.loopId = null;
        }
    }
    stepPlaytest() {
        const status = this.playtest.getStatus();
        if (status === 'stopped') {
            this.playtest.init(this.app.store.entities, this.app.store.tileLayers, this.app.store.manifest.tileSize);
            this.playtest.setBehaviors(this.app.store.behaviors);
            this.playtest.enter();
            this.behaviorController?.notifyPlaytestEntered();
        }
        else if (status === 'paused') {
            this.playtest.resume();
        }
        this.playtest.setInput({ moveX: 0, moveY: 0, interact: this.pendingInteract });
        this.pendingInteract = false;
        const snap = this.playtest.step();
        this.playtest.setInput({ moveX: 0, moveY: 0, interact: false });
        // Surface behavior guardrail overflows as playtest-time diagnostics (BEHAV-DEBUG-002).
        this.app.diagnosticStore.removeByCodeAndPath('BEHAV_ROW_CAP_EXCEEDED', '');
        this.app.diagnosticStore.removeByCodeAndPath('BEHAV_ACTION_CAP_EXCEEDED', '');
        const ov = this.playtest.getLastStepOverflow();
        if (ov.rowCapHit) {
            this.app.diagnosticStore.add({
                id: 'editor:BEHAV_ROW_CAP_EXCEEDED:playtest',
                code: 'BEHAV_ROW_CAP_EXCEEDED',
                severity: 'warning',
                source: 'runtime',
                path: 'playtest',
                message: 'Behavior row cap (256) exceeded this step -- some rows were skipped.',
                actions: [],
            });
        }
        for (const hit of ov.actionCapHits) {
            this.app.diagnosticStore.add({
                id: `editor:BEHAV_ACTION_CAP_EXCEEDED:${hit.entityId}:${hit.rowId}`,
                code: 'BEHAV_ACTION_CAP_EXCEEDED',
                severity: 'warning',
                source: 'runtime',
                path: `/entities/${hit.entityId}/behaviors/${hit.rowId}`,
                message: `Behavior row action cap (16) exceeded for entity ${hit.entityId}, row ${hit.rowId}.`,
                actions: [],
            });
        }
        if (snap) {
            this.effectsController?.setPlaytestTick(snap.tick);
            const primary = snap.entities[0];
            const pos = primary ? ` @ (${Math.round(primary.x)},${Math.round(primary.y)})` : '';
            this.writeConsole(`Tick ${snap.tick}: ${snap.entities.length} entities, ${snap.interactions.length} interactions${pos}`);
            for (const evt of snap.interactions) {
                this.writeConsole(`Interact ${evt.actorId} -> ${evt.targetId}`);
            }
        }
        else {
            this.writeConsole('No step emitted (not running).');
        }
        if (status === 'paused') {
            this.playtest.pause();
        }
        this.elements.status.textContent = `Playtest: ${this.playtest.getStatus()}`;
        if (snap) {
            this.lastPlaySnap = snap;
        } // D-005a: keep lastPlaySnap current
        this.updatePlaytestHud(snap);
    }
    writeConsole(line) {
        this.consoleLines.push(line);
        if (this.consoleLines.length > 50) {
            this.consoleLines.shift();
        }
        const html = this.consoleLines.map((l) => `<div>${l}</div>`).join('');
        this.elements.consoleContainer.innerHTML = html;
    }
    /**
     * Refresh compact playtest HUD in header: state, tick, and player position when available.
     */
    updatePlaytestHud(snap) {
        const hud = this.elements.playtestHud;
        if (!hud)
            return;
        const state = this.playtest.getStatus();
        if (!snap) {
            hud.textContent = `Playtest: ${state}`;
            return;
        }
        const playerId = this.app.store.entities.find((e) => e.tags.includes('player'))?.id ?? null;
        const player = playerId ? snap.entities.find((e) => e.id === playerId) : null;
        const pos = player ? `, player=(${Math.round(player.x)},${Math.round(player.y)})` : '';
        hud.textContent = `Playtest: ${state}, tick=${snap.tick}${pos}`;
    }
    paintAtPointer(event) {
        const cell = this.pointerToCell(event);
        if (!cell)
            return;
        const { tx, ty } = cell;
        const key = `${tx},${ty}`;
        if (key === this.lastPaintCell)
            return;
        this.lastPaintCell = key;
        if (this.currentTool === 'rule-paint') {
            // Accumulate cells; commit via applyRulePaint on pointerup
            this.rulePaintCells.push({ x: tx, y: ty });
            return;
        }
        if (this.currentTool === 'erase') {
            this.app.eraseTile('layer-0', tx, ty);
            return;
        }
        this.app.paintTile('layer-0', tx, ty, this.currentTileId);
    }
    pointerToCell(event) {
        const rect = this.elements.canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0)
            return null;
        const px = Math.floor((event.clientX - rect.left) * (this.elements.canvas.width / rect.width));
        const py = Math.floor((event.clientY - rect.top) * (this.elements.canvas.height / rect.height));
        const tileSize = this.app.store.manifest.tileSize;
        const tx = Math.floor(px / tileSize);
        const ty = Math.floor(py / tileSize);
        return { tx, ty };
    }
    /** Select entity under a canvas client-space point and sync dependent panels. */
    selectEntityAtCanvasClientPoint(clientX, clientY) {
        const rect = this.elements.canvas.getBoundingClientRect();
        const px = Math.floor((clientX - rect.left) * (this.elements.canvas.width / rect.width));
        const py = Math.floor((clientY - rect.top) * (this.elements.canvas.height / rect.height));
        this.app.selectEntityAtPoint(px, py);
        this.inspectorController.refresh();
        const selId = this.app.store.selectedEntityId;
        this.behaviorController?.notifyEntitySelected(selId);
        this.animationController?.notifyEntitySelected(selId);
        const spriteId = selId
            ? (this.app.store.entities.find((e) => e.id === selId)?.spriteId ?? null)
            : null;
        this.spriteController?.notifyEntitySelected(selId, spriteId);
    }
    readMapInputsOrDefault() {
        const currentTileSize = this.app.store.manifest.tileSize;
        const currentWidth = Math.max(1, Math.floor(this.app.store.manifest.resolution.width / currentTileSize));
        const currentHeight = Math.max(1, Math.floor(this.app.store.manifest.resolution.height / currentTileSize));
        const width = Number.parseInt(this.elements.mapWidthInput?.value ?? `${currentWidth}`, 10);
        const height = Number.parseInt(this.elements.mapHeightInput?.value ?? `${currentHeight}`, 10);
        const tileSize = Number.parseInt(this.elements.mapTileSizeInput?.value ?? `${currentTileSize}`, 10);
        return {
            width: Number.isFinite(width) && width > 0 ? width : currentWidth,
            height: Number.isFinite(height) && height > 0 ? height : currentHeight,
            tileSize: Number.isFinite(tileSize) && tileSize > 0 ? tileSize : currentTileSize,
        };
    }
    syncControlsFromProject() {
        const tileSize = this.app.store.manifest.tileSize;
        const width = Math.max(1, Math.floor(this.app.store.manifest.resolution.width / tileSize));
        const height = Math.max(1, Math.floor(this.app.store.manifest.resolution.height / tileSize));
        if (this.elements.mapWidthInput)
            this.elements.mapWidthInput.value = `${width}`;
        if (this.elements.mapHeightInput)
            this.elements.mapHeightInput.value = `${height}`;
        if (this.elements.mapTileSizeInput)
            this.elements.mapTileSizeInput.value = `${tileSize}`;
        if (this.elements.toolSelect)
            this.elements.toolSelect.value = this.currentTool;
        if (this.elements.tileIdInput)
            this.elements.tileIdInput.value = `${this.currentTileId}`;
    }
    /**
     * Create a centered player entity, tag it as `player`, and select it for immediate playtest use.
     */
    createPlayablePlayer() {
        const tileSize = this.app.store.manifest.tileSize;
        const centerX = Math.max(0, Math.floor(this.app.store.manifest.resolution.width / 2) - Math.floor(tileSize / 2));
        const centerY = Math.max(0, Math.floor(this.app.store.manifest.resolution.height / 2) - Math.floor(tileSize / 2));
        const beforeCount = this.app.store.entities.length;
        this.app.createEntity('Player', centerX, centerY);
        if (this.app.store.entities.length <= beforeCount)
            return;
        const created = this.app.store.entities[this.app.store.entities.length - 1];
        if (!created.tags.includes('player')) {
            created.tags.push('player');
        }
        created.solid = true;
        this.app.store.selectEntity(created.id);
        this.inspectorController.refresh();
        this.behaviorController?.notifyEntitySelected(created.id);
        this.animationController?.notifyEntitySelected(created.id);
        this.spriteController?.notifyEntitySelected(created.id, created.spriteId ?? null);
        this.recomputeDirty();
        this.writeConsole(`Added player entity: ${created.name} (${created.id})`);
    }
    /**
     * Paint a simple ground strip and create a player above it for quick first-playable setup.
     */
    createStarterGroundAndPlayer() {
        const tileSize = this.app.store.manifest.tileSize;
        const tilesX = Math.max(1, Math.floor(this.app.store.manifest.resolution.width / tileSize));
        const tilesY = Math.max(1, Math.floor(this.app.store.manifest.resolution.height / tileSize));
        const groundY = Math.max(0, tilesY - 2);
        this.app.beginPaintStroke();
        for (let tx = 0; tx < tilesX; tx++) {
            this.app.paintTile('layer-0', tx, groundY, 1);
        }
        this.app.endPaintStroke();
        const playerX = Math.max(0, Math.floor(this.app.store.manifest.resolution.width / 2) - Math.floor(tileSize / 2));
        const playerY = Math.max(0, (groundY - 1) * tileSize);
        const beforeCount = this.app.store.entities.length;
        this.app.createEntity('Player', playerX, playerY);
        if (this.app.store.entities.length <= beforeCount)
            return;
        const created = this.app.store.entities[this.app.store.entities.length - 1];
        if (!created.tags.includes('player')) {
            created.tags.push('player');
        }
        created.solid = true;
        this.app.store.selectEntity(created.id);
        this.inspectorController.refresh();
        this.behaviorController?.notifyEntitySelected(created.id);
        this.animationController?.notifyEntitySelected(created.id);
        this.spriteController?.notifyEntitySelected(created.id, created.spriteId ?? null);
        this.recomputeDirty();
        this.writeConsole(`Starter scene ready: ground at row ${groundY}, player ${created.id}`);
        this.checklistController?.notifyStarterSceneCreated();
    }
    /** Switch visible tab panel and update tab button active states. UI-SHELL-001. */
    setActiveTab(tab) {
        this.activeTab = tab;
        const tabBar = this.elements.tabBar;
        if (tabBar) {
            for (const btn of Array.from(tabBar.querySelectorAll('[data-tab]'))) {
                btn.setAttribute('aria-selected', btn.dataset['tab'] === tab ? 'true' : 'false');
            }
        }
        // Find the bottom-tabs container (sibling of the tab bar in the shell root)
        const bottomTabs = this.elements.shellRoot?.querySelector('.bottom-tabs');
        if (bottomTabs) {
            for (const panel of Array.from(bottomTabs.querySelectorAll('.tab[data-tab]'))) {
                if (panel.dataset['tab'] === tab) {
                    panel.classList.add('tab--active');
                }
                else {
                    panel.classList.remove('tab--active');
                }
            }
        }
    }
    /** Update undo/redo button disabled states. UI-UNDO-001. */
    refreshUndoRedoState() {
        if (this.elements.btnUndo) {
            this.elements.btnUndo.disabled = !this.app.canUndo();
        }
        if (this.elements.btnRedo) {
            this.elements.btnRedo.disabled = !this.app.canRedo();
        }
    }
    /** Set canvas cursor based on active tool. UI-SELECT-001. */
    updateCanvasCursor(tool) {
        this.elements.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    }
    /** Switch active tool, update cursor, and sync dropdown. UI-HOTKEY-001. */
    setTool(tool) {
        this.currentTool = tool;
        this.updateCanvasCursor(tool);
        if (this.elements.toolSelect) {
            this.elements.toolSelect.value = tool;
        }
    }
    updateProjectStatus() {
        const tileSize = this.app.store.manifest.tileSize;
        const width = Math.max(1, Math.floor(this.app.store.manifest.resolution.width / tileSize));
        const height = Math.max(1, Math.floor(this.app.store.manifest.resolution.height / tileSize));
        this.elements.status.textContent = `Project: ${this.app.store.manifest.name} (${width}x${height}, tile ${tileSize})`;
    }
    /**
     * Record current project state as the clean baseline.
     * Call after save, load, or new project. UI-DIRTY-001.
     */
    markClean() {
        this.lastSavedSnapshot = this.app.save();
        this.lastCleanSpriteGeneration = this.spriteStoreGeneration;
        this.isDirty = false;
    }
    /**
     * Recompute isDirty by comparing current project state to the last saved snapshot.
     * Also checks sprite workspace mutations via generation counter. UI-DIRTY-001.
     */
    recomputeDirty() {
        this.isDirty =
            this.app.save() !== this.lastSavedSnapshot ||
                this.spriteStoreGeneration !== this.lastCleanSpriteGeneration;
    }
    /**
     * Fit the viewport so the entire map is visible and centered.
     * Falls back to canvas intrinsic size if the container has no layout yet. UI-VIEWPORT-001.
     * FRAMING_MARGIN_PX prevents right/bottom edge clip under overflow:hidden. D-002.
     */
    fitViewportToMap() {
        const FRAMING_MARGIN_PX = 4;
        const container = this.elements.canvas.parentElement;
        const cw = (container?.clientWidth ?? 0) || this.elements.canvas.width;
        const ch = (container?.clientHeight ?? 0) || this.elements.canvas.height;
        this.viewport.fitToMap(cw, ch, this.app.store.manifest.resolution.width, this.app.store.manifest.resolution.height, FRAMING_MARGIN_PX);
        this.viewport.applyTransform(this.elements.canvas);
    }
}
//# sourceMappingURL=editor-shell-controller.js.map