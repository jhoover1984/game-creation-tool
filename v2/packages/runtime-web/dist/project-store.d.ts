import type { ProjectManifest, EntityDef, SemanticDiagnostic, TileLayer, QuestGraphNode, QuestGraphV2, BehaviorRow, MapEffectState, AnimationClipDef } from '@gcs/contracts';
import { CommandBus } from './command-bus.js';
import type { SpriteAssetData } from './project-validation.js';
/** In-memory project state. Mirrors Rust Project struct until WASM is wired. */
export declare class ProjectStore {
    manifest: ProjectManifest;
    tileLayers: TileLayer[];
    entities: EntityDef[];
    questGraph: QuestGraphV2;
    behaviors: Record<string, BehaviorRow[]>;
    clips: AnimationClipDef[];
    /** Sprite pixel buffers authored in the Sprite Workspace (SPRITE-PERSIST-001). */
    sprites: Record<string, SpriteAssetData>;
    effectState: MapEffectState;
    selectedEntityId: string | null;
    selectedQuestNodeId: string | null;
    private undoStack;
    private redoStack;
    private activeBatch;
    private validationDiagnostics;
    private bus;
    constructor(bus: CommandBus);
    /** Create a new empty project. */
    createProject(name: string, width: number, height: number, tileSize: number): void;
    /** Save project to JSON string. */
    saveToJson(): string;
    /** Load project from JSON string. */
    loadFromJson(json: string): void;
    /** Upsert a sprite asset's pixel data (SPRITE-PERSIST-001). */
    setSpriteAsset(data: SpriteAssetData): void;
    /** Return all stored sprite assets. */
    getAllSpriteAssets(): Record<string, SpriteAssetData>;
    /** Return latest project load diagnostics (warnings/info). */
    getValidationDiagnostics(): SemanticDiagnostic[];
    /** Get all behavior rows for an entity. Returns [] if none exist. */
    getBehaviors(entityId: string): BehaviorRow[];
    canUndo(): boolean;
    canRedo(): boolean;
    beginUndoBatch(): boolean;
    endUndoBatch(): boolean;
    undo(): void;
    redo(): void;
    /** Select an entity by ID. Pass null to deselect. */
    selectEntity(entityId: string | null): void;
    /** Select a quest node by ID. Pass null to deselect. */
    selectQuestNode(nodeId: string | null): void;
    /** Return selected quest node, if any. */
    getSelectedQuestNode(): QuestGraphNode | null;
    /** Find entity at a pixel position (for click-to-select). */
    entityAtPoint(px: number, py: number): EntityDef | undefined;
    private registerHandlers;
    /** Apply an undo record in reverse. */
    private applyInverse;
    /** Apply an undo record forward (for redo). */
    private applyForward;
    private pushUndoRecord;
}
//# sourceMappingURL=project-store.d.ts.map