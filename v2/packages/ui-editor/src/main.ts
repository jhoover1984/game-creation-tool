import { EditorShellController } from './editor-shell-controller.js';
import { createOnboardingStore } from './onboarding-store.js';
import { DashboardController } from './dashboard-controller.js';

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required shell element: #${id}`);
  }
  return el as T;
}

/**
 * Bootstraps the module-driven editor shell.
 * Shell is always instantiated once at boot; dashboard overlay controls visibility only.
 * Returns the controller so callers can dispose in integration contexts.
 */
export function bootstrapEditorShell(): EditorShellController {
  const nullStorage = { getItem: () => null, setItem: () => undefined };
  const onboardingStore = createOnboardingStore(globalThis.localStorage ?? nullStorage);

  const shell = new EditorShellController(
    {
      canvas: requireElement<HTMLCanvasElement>('editor-canvas'),
      tasksContainer: requireElement<HTMLElement>('tasks-panel'),
      inspectorContainer: requireElement<HTMLElement>('inspector-panel'),
      storyContainer: document.getElementById('story-panel') as HTMLElement | null,
      consoleContainer: requireElement<HTMLElement>('console-panel'),
      status: requireElement<HTMLElement>('status'),
      checklistContainer: document.getElementById('onboarding-checklist') as HTMLElement | null,
      behaviorContainer: document.getElementById('behavior-panel') as HTMLElement | null,
      spriteContainer: document.getElementById('sprite-panel') as HTMLElement | null,
      effectsContainer: document.getElementById('effects-panel') as HTMLElement | null,
      effectsOverlay: document.getElementById('fx-overlay') as HTMLElement | null,
      exportContainer: document.getElementById('export-panel') as HTMLElement | null,
      animationContainer: document.getElementById('animation-panel') as HTMLElement | null,
      shellRoot: document.body,
      tabBar: document.getElementById('tab-bar') as HTMLElement | null,
      modalOverlay: document.getElementById('modal-overlay') as HTMLElement | null,
      btnNew: document.getElementById('btn-new') as HTMLElement | null,
      btnSave: document.getElementById('btn-save') as HTMLElement | null,
      btnLoad: document.getElementById('btn-load') as HTMLElement | null,
      btnUndo: document.getElementById('btn-undo') as HTMLButtonElement | null,
      btnRedo: document.getElementById('btn-redo') as HTMLButtonElement | null,
      btnZoomReset: document.getElementById('btn-zoom-reset') as HTMLElement | null,
      btnPlay: document.getElementById('btn-play') as HTMLElement | null,
      btnPause: document.getElementById('btn-pause') as HTMLElement | null,
      btnStep: document.getElementById('btn-step') as HTMLElement | null,
      btnInteract: document.getElementById('btn-interact') as HTMLElement | null,
      btnAddPlayer: document.getElementById('btn-add-player') as HTMLElement | null,
      btnAddStarter: document.getElementById('btn-add-starter') as HTMLElement | null,
      playtestHud: document.getElementById('playtest-hud') as HTMLElement | null,
      toolSelect: document.getElementById('tool-select') as HTMLSelectElement | null,
      tileIdInput: document.getElementById('tile-id') as HTMLInputElement | null,
      mapWidthInput: document.getElementById('map-width') as HTMLInputElement | null,
      mapHeightInput: document.getElementById('map-height') as HTMLInputElement | null,
      mapTileSizeInput: document.getElementById('map-tile-size') as HTMLInputElement | null,
      btnApplyMap: document.getElementById('btn-apply-map') as HTMLElement | null,
      keydownTarget: {
        addEventListener: (type: string, fn: (e: Event) => void) => document.addEventListener(type, fn),
        removeEventListener: (type: string, fn: (e: Event) => void) => document.removeEventListener(type, fn),
      },
      contextMenu: document.getElementById('context-menu') as HTMLElement | null,
      contextMenuTarget: {
        addEventListener: (type: string, fn: (e: Event) => void) => document.addEventListener(type, fn),
        removeEventListener: (type: string, fn: (e: Event) => void) => document.removeEventListener(type, fn),
      },
    },
    onboardingStore,
  );

  const dashboardOverlay = document.getElementById('dashboard-overlay') as HTMLElement | null;
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
