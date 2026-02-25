import { EditorApp } from './editor-app.js';
import { OnboardingStore } from './onboarding-store.js';
import { SpriteWorkspaceStore } from './sprite-workspace-store.js';
import { ViewportController } from './viewport-controller.js';
export interface EditorShellElements {
    canvas: HTMLCanvasElement;
    tasksContainer: HTMLElement;
    inspectorContainer: HTMLElement;
    storyContainer?: HTMLElement | null;
    consoleContainer: HTMLElement;
    status: HTMLElement;
    checklistContainer?: HTMLElement | null;
    behaviorContainer?: HTMLElement | null;
    spriteContainer?: HTMLElement | null;
    effectsContainer?: HTMLElement | null;
    effectsOverlay?: HTMLElement | null;
    exportContainer?: HTMLElement | null;
    animationContainer?: HTMLElement | null;
    shellRoot?: HTMLElement | null;
    tabBar?: HTMLElement | null;
    modalOverlay?: HTMLElement | null;
    btnNew?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnSave?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnLoad?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnUndo?: {
        addEventListener(type: string, handler: () => void): void;
        disabled?: boolean;
    } | null;
    btnRedo?: {
        addEventListener(type: string, handler: () => void): void;
        disabled?: boolean;
    } | null;
    btnZoomReset?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnPlay?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnPause?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnStep?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnInteract?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnAddPlayer?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    btnAddStarter?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    playtestHud?: HTMLElement | null;
    toolSelect?: {
        value: string;
        addEventListener(type: string, handler: () => void): void;
    } | null;
    tileIdInput?: {
        value: string;
        addEventListener(type: string, handler: () => void): void;
    } | null;
    mapWidthInput?: {
        value: string;
    } | null;
    mapHeightInput?: {
        value: string;
    } | null;
    mapTileSizeInput?: {
        value: string;
    } | null;
    btnApplyMap?: {
        addEventListener(type: string, handler: () => void): void;
    } | null;
    /** Target for document-level keyboard shortcuts (pass `document` in production). UI-HOTKEY-001. */
    keydownTarget?: {
        addEventListener(type: string, fn: (e: Event) => void): void;
        removeEventListener(type: string, fn: (e: Event) => void): void;
    } | null;
    /** Context menu overlay element (pass `#context-menu` in production). UI-CTX-001. */
    contextMenu?: HTMLElement | null;
    /** Target for context menu click-away and Escape dismissal. UI-CTX-001. */
    contextMenuTarget?: {
        addEventListener(type: string, fn: (e: Event) => void): void;
        removeEventListener(type: string, fn: (e: Event) => void): void;
    } | null;
}
/**
 * Minimal shell integration controller.
 * Wires EditorApp + TasksTabController to real shell elements.
 */
export declare class EditorShellController {
    readonly app: EditorApp;
    readonly onboardingStore: OnboardingStore;
    private readonly tasksController;
    private readonly inspectorController;
    private readonly storyController;
    private readonly checklistController;
    private readonly behaviorController;
    readonly spriteStore: SpriteWorkspaceStore;
    private readonly spriteController;
    private readonly effectsController;
    private readonly exportController;
    private readonly animationController;
    private readonly contextMenuController;
    private readonly unsubscribeDiagnostics;
    private readonly unsubscribeBus;
    private readonly unsubscribeOnboardingStore;
    private readonly elements;
    private readonly onCanvasClickHandler;
    private readonly onPointerDownHandler;
    private readonly onPointerMoveHandler;
    private readonly onPointerUpHandler;
    private readonly onPointerLeaveClearHoverHandler;
    private readonly tabBarClickHandler;
    private readonly keydownHandler;
    private readonly onContextMenuHandler;
    private readonly playtest;
    private pendingInteract;
    private readonly consoleLines;
    private isPainting;
    private lastPaintCell;
    private suppressNextClickSelect;
    private currentTool;
    private currentTileId;
    private rulePaintCells;
    private activeTab;
    private isDirty;
    /** Snapshot taken at last save/load/new -- used for snapshot-based dirty detection. UI-DIRTY-001. */
    private lastSavedSnapshot;
    /** Sprite store mutation counter; compared to lastCleanSpriteGeneration for dirty detection. UI-DIRTY-001. */
    private spriteStoreGeneration;
    private lastCleanSpriteGeneration;
    private readonly unsubscribeSpriteStore;
    private readonly modalController;
    /** Viewport zoom/pan state. UI-VIEWPORT-001. */
    readonly viewport: ViewportController;
    private isSpacePanning;
    private readonly onWheelHandler;
    private readonly keyupHandler;
    constructor(elements: EditorShellElements, onboardingStore?: OnboardingStore);
    /** Switch layout density independently of onboarding mode (UI-VISUAL-002 Slice B). */
    setDensity(density: 'comfort' | 'dense'): void;
    dispose(): void;
    private stepPlaytest;
    private writeConsole;
    /**
     * Refresh compact playtest HUD in header: state, tick, and player position when available.
     */
    private updatePlaytestHud;
    private paintAtPointer;
    private pointerToCell;
    /** Select entity under a canvas client-space point and sync dependent panels. */
    private selectEntityAtCanvasClientPoint;
    private readMapInputsOrDefault;
    private syncControlsFromProject;
    /**
     * Create a centered player entity, tag it as `player`, and select it for immediate playtest use.
     */
    private createPlayablePlayer;
    /**
     * Paint a simple ground strip and create a player above it for quick first-playable setup.
     */
    private createStarterGroundAndPlayer;
    /** Switch visible tab panel and update tab button active states. UI-SHELL-001. */
    private setActiveTab;
    /** Update undo/redo button disabled states. UI-UNDO-001. */
    private refreshUndoRedoState;
    /** Set canvas cursor based on active tool. UI-SELECT-001. */
    private updateCanvasCursor;
    /** Switch active tool, update cursor, and sync dropdown. UI-HOTKEY-001. */
    private setTool;
    private updateProjectStatus;
    /**
     * Record current project state as the clean baseline.
     * Call after save, load, or new project. UI-DIRTY-001.
     */
    private markClean;
    /**
     * Recompute isDirty by comparing current project state to the last saved snapshot.
     * Also checks sprite workspace mutations via generation counter. UI-DIRTY-001.
     */
    private recomputeDirty;
    /**
     * Fit the viewport so the entire map is visible and centered.
     * Falls back to canvas intrinsic size if the container has no layout yet. UI-VIEWPORT-001.
     */
    private fitViewportToMap;
}
//# sourceMappingURL=editor-shell-controller.d.ts.map