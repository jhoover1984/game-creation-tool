import { EditorShellController } from './editor-shell-controller.js';
import { createOnboardingStore } from './onboarding-store.js';
import { DashboardController } from './dashboard-controller.js';
function requireElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`Missing required shell element: #${id}`);
    }
    return el;
}
/**
 * Bootstraps the module-driven editor shell.
 * Shell is always instantiated once at boot; dashboard overlay controls visibility only.
 * Returns the controller so callers can dispose in integration contexts.
 */
export function bootstrapEditorShell() {
    const nullStorage = { getItem: () => null, setItem: () => undefined };
    const onboardingStore = createOnboardingStore(globalThis.localStorage ?? nullStorage);
    const shell = new EditorShellController({
        canvas: requireElement('editor-canvas'),
        tasksContainer: requireElement('tasks-panel'),
        inspectorContainer: requireElement('inspector-panel'),
        storyContainer: document.getElementById('story-panel'),
        consoleContainer: requireElement('console-panel'),
        status: requireElement('status'),
        checklistContainer: document.getElementById('onboarding-checklist'),
        behaviorContainer: document.getElementById('behavior-panel'),
        spriteContainer: document.getElementById('sprite-panel'),
        effectsContainer: document.getElementById('effects-panel'),
        effectsOverlay: document.getElementById('fx-overlay'),
        exportContainer: document.getElementById('export-panel'),
        animationContainer: document.getElementById('animation-panel'),
        shellRoot: document.body,
        tabBar: document.getElementById('tab-bar'),
        modalOverlay: document.getElementById('modal-overlay'),
        btnNew: document.getElementById('btn-new'),
        btnSave: document.getElementById('btn-save'),
        btnLoad: document.getElementById('btn-load'),
        btnUndo: document.getElementById('btn-undo'),
        btnRedo: document.getElementById('btn-redo'),
        btnZoomReset: document.getElementById('btn-zoom-reset'),
        btnPlay: document.getElementById('btn-play'),
        btnPause: document.getElementById('btn-pause'),
        btnStep: document.getElementById('btn-step'),
        btnInteract: document.getElementById('btn-interact'),
        btnAddPlayer: document.getElementById('btn-add-player'),
        btnAddStarter: document.getElementById('btn-add-starter'),
        playtestHud: document.getElementById('playtest-hud'),
        toolSelect: document.getElementById('tool-select'),
        tileIdInput: document.getElementById('tile-id'),
        mapWidthInput: document.getElementById('map-width'),
        mapHeightInput: document.getElementById('map-height'),
        mapTileSizeInput: document.getElementById('map-tile-size'),
        btnApplyMap: document.getElementById('btn-apply-map'),
        keydownTarget: {
            addEventListener: (type, fn) => document.addEventListener(type, fn),
            removeEventListener: (type, fn) => document.removeEventListener(type, fn),
        },
        contextMenu: document.getElementById('context-menu'),
        contextMenuTarget: {
            addEventListener: (type, fn) => document.addEventListener(type, fn),
            removeEventListener: (type, fn) => document.removeEventListener(type, fn),
        },
    }, onboardingStore);
    const dashboardOverlay = document.getElementById('dashboard-overlay');
    if (dashboardOverlay) {
        new DashboardController(onboardingStore, dashboardOverlay, () => {
            // Dashboard dismissed: editor is already live underneath
        });
    }
    return shell;
}
if (typeof document !== 'undefined') {
    bootstrapEditorShell();
}
//# sourceMappingURL=main.js.map