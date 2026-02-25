import type { AnyCommand, Diagnostic, EditorTask, EntityDef, GameEvent, QuestGraphNode } from '@gcs/contracts';
import type { TileRuleSet } from './tile-rule-engine.js';
import { CommandBus, DiagnosticStore, ProjectStore } from '@gcs/runtime-web';
import type { ExportBuildReport, ExportPreflightReport } from '@gcs/runtime-web';
import type { SemanticDiagnostic } from '@gcs/contracts';
/**
 * EditorApp -- top-level controller for the GCS editor.
 * Owns the command bus, project store, diagnostic store, and coordinates UI panels.
 *
 * Implements:
 * - UI-TASKS-001: Diagnostic display via diagnosticStore
 * - UI-TASKS-002: Task generation via diagnosticStore.generateTasks()
 * - UI-TASKS-003: Auto-fix via applyFix()
 */
export declare class EditorApp {
    readonly bus: CommandBus;
    readonly store: ProjectStore;
    readonly diagnosticStore: DiagnosticStore;
    private canvas;
    private ctx;
    private hoverCell;
    constructor();
    /**
     * Run export preflight checks and emit diagnostics/tasks.
     * Preflight is read-only and deterministic.
     */
    runExportPreflight(): ExportPreflightReport;
    /**
     * Build deterministic export artifacts from the current project state.
     * Caller is responsible for preflight gating.
     */
    runExportBuild(seed?: number): ExportBuildReport;
    /** Initialize with a canvas element for rendering. */
    mount(canvas: HTMLCanvasElement): void;
    /** Create a new project and render it. */
    newProject(name: string, widthTiles: number, heightTiles: number, tileSize: number): void;
    /** Paint a tile at grid position. */
    paintTile(layerId: string, x: number, y: number, tileId: number): void;
    /**
     * Begin a grouped paint stroke so multiple tile mutations undo as one command.
     * Mirrors UI-UNDO-001 pointer-down start behavior.
     */
    beginPaintStroke(): boolean;
    /**
     * End a grouped paint stroke.
     * Mirrors UI-UNDO-001 pointer-up end behavior.
     */
    endPaintStroke(): boolean;
    /** Erase a tile (set to 0). */
    eraseTile(layerId: string, x: number, y: number): void;
    /**
     * Apply rule-based tile painting for a set of user-painted cells (TILE-RULE-001).
     *
     * 2-pass algorithm:
     *   Pass A (intent): paint each user cell with ruleSet.fallbackTileId.
     *   Pass B (resolve): for each cell in the 1-ring neighborhood that contains a
     *     matching tile, compute the cardinal adjacency mask and paint the resolved variant.
     *
     * All writes are grouped into one undo unit via beginUndoBatch/endUndoBatch.
     * Iteration order is deterministic: ascending y, then x.
     *
     * @param layerId - Layer to paint on.
     * @param userCells - Cells the user explicitly painted (intent set).
     * @param ruleSet - The active ruleset governing tile variant selection.
     */
    applyRulePaint(layerId: string, userCells: readonly {
        x: number;
        y: number;
    }[], ruleSet: TileRuleSet): void;
    /** Create an entity at a position. */
    createEntity(name: string, x: number, y: number): void;
    /** Delete an entity by ID. */
    deleteEntity(entityId: string): void;
    /** Rename an entity. */
    renameEntity(entityId: string, name: string): void;
    /** Move an entity to a new position. */
    moveEntity(entityId: string, x: number, y: number): void;
    /** Update entity visual fields through command path. */
    updateEntityVisual(entityId: string, visual: {
        solid: boolean;
        spriteId?: string;
        animationClipId?: string;
    }): boolean;
    /** Set player entity movement speed through command path (entity:setSpeed). UI-PLAYFLOW-001. */
    setEntitySpeed(entityId: string, speed: number): boolean;
    /** Dispatch any command through the bus. */
    dispatch(command: AnyCommand): void;
    /** Subscribe to command bus events for shell-level UI refresh logic. */
    subscribe(listener: (event: GameEvent) => void): () => void;
    /** Undo last action. */
    undo(): void;
    /** Returns true when there is at least one action to undo. */
    canUndo(): boolean;
    /** Redo last undone action. */
    redo(): void;
    /** Returns true when there is at least one action to redo. */
    canRedo(): boolean;
    /** Save project to JSON string. */
    save(): string;
    /** Load project from JSON string. Ingests diagnostics into the diagnostic store. */
    load(json: string): void;
    /** Latest diagnostics emitted while loading/validating a project. */
    getLoadDiagnostics(): SemanticDiagnostic[];
    /** All diagnostics from the unified diagnostic store (UI-TASKS-001). */
    getDiagnostics(): readonly Diagnostic[];
    /** Return currently selected entity, if any. */
    getSelectedEntity(): EntityDef | null;
    /** Return all quest graph nodes for Story panel workflows. */
    getQuestNodes(): readonly QuestGraphNode[];
    /** Return selected quest node, if any. */
    getSelectedQuestNode(): QuestGraphNode | null;
    /** Select quest node by ID for Story panel inspector binding. */
    selectQuestNode(nodeId: string | null): QuestGraphNode | null;
    /**
     * Apply or clear a map-level effects preset via command bus.
     * Mutations must go through runtime-web ProjectStore for determinism + undo/redo.
     */
    applyEffectPreset(presetId: import('@gcs/contracts').EffectPresetId | null, intensity: number): boolean;
    /**
     * Link effect intensity to a world field (FX-FIELD-001).
     * Uses command path so coupling config remains undoable and persisted.
     */
    setEffectFieldCoupling(fieldId: import('@gcs/contracts').EffectFieldId | null, influence: number): boolean;
    /** Update editable basics of a quest node from Story inspector. */
    updateQuestNodeBasics(nodeId: string, fields: {
        name: string;
        kind: QuestGraphNode['kind'];
    }): boolean;
    /** Select entity at canvas-space pixel coordinates. */
    selectEntityAtPoint(px: number, py: number): EntityDef | null;
    /** Set hovered tile cell for editor feedback. Pass null to clear. */
    setHoverCell(tx: number | null, ty?: number): void;
    /**
     * Tasks derived from all diagnostics (UI-TASKS-002).
     * Uses the DiagnosticStore's task generation with actionable labels and fix actions.
     */
    getTasks(): EditorTask[];
    /**
     * Apply a fix action from a task (UI-TASKS-003).
     * Deterministic fixes dispatch through the CommandBus.
     * Non-deterministic fixes return false (caller should open the relevant editor surface).
     */
    applyFix(task: EditorTask): boolean;
    /** Render the current project state to canvas. */
    private render;
    /** Emit an editor-time diagnostic with auto-resolved fix actions. */
    private addEditorDiagnostic;
    /** Check if an entity extends beyond canvas bounds and emit diagnostic with deterministic fix. */
    private checkEntityBounds;
    /** Clears and re-emits EDIT_DUPLICATE_ENTITY_NAME diagnostics for all affected entities. */
    private refreshDuplicateNameDiagnostics;
    private suggestUniqueEntityName;
    private isValidAssetRef;
    private clearExportPreflightDiagnostics;
}
//# sourceMappingURL=editor-app.d.ts.map