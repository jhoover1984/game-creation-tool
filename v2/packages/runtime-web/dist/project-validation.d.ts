import type { AnimationClipDef, BehaviorRow, EntityDef, MapEffectState, ProjectManifest, QuestGraphV2, SemanticDiagnostic, TileLayer } from '@gcs/contracts';
export interface SpriteAssetData {
    assetId: string;
    width: number;
    height: number;
    /** RGBA flat array, length = width * height * 4. Stored as plain numbers for JSON round-trip. */
    pixels: number[];
}
export interface PersistedProjectFile {
    manifest: ProjectManifest;
    tileLayers: TileLayer[];
    entities: EntityDef[];
    story?: {
        questGraph?: QuestGraphV2;
    };
    behaviors?: Record<string, BehaviorRow[]>;
    effectState?: MapEffectState;
    /** Animation clips stored in the project (ANIM-ANCHOR-001). Passed through without deep validation. */
    clips?: AnimationClipDef[];
    /** Sprite pixel buffers authored in the Sprite Workspace (SPRITE-PERSIST-001). */
    sprites?: Record<string, SpriteAssetData>;
}
export interface ProjectValidationResult {
    project: PersistedProjectFile;
    diagnostics: SemanticDiagnostic[];
}
export declare function validateProjectJson(json: string): ProjectValidationResult;
export declare function parseAndValidateProjectJson(json: string): PersistedProjectFile;
//# sourceMappingURL=project-validation.d.ts.map