import type { BehaviorRow, EntityDef, MapEffectState, ProjectManifest, QuestGraphV2, TileLayer } from '@gcs/contracts';
export interface ExportBuildArtifact {
    path: string;
    bytes: number;
    hash: string;
}
export interface ExportBuildMetadata {
    buildSchemaVersion: '1.0.0';
    compatibilityMarker: string;
    projectVersion: string;
    questSchemaVersion: string;
    seed: number;
    sourceHash: string;
}
export interface ExportBuildReport {
    ok: true;
    buildId: string;
    metadata: ExportBuildMetadata;
    artifacts: ExportBuildArtifact[];
    projectJson: string;
    manifestJson: string;
    provenanceJson: string;
}
export interface ExportBuildInput {
    manifest: ProjectManifest;
    tileLayers: readonly TileLayer[];
    entities: readonly EntityDef[];
    questGraph: QuestGraphV2;
    behaviors: Record<string, BehaviorRow[]>;
    effectState: MapEffectState;
    seed: number;
}
/**
 * EXPORT-BUILD-001 deterministic export baseline.
 * Produces stable JSON artifacts + metadata from equivalent project state and seed.
 */
export declare function buildDeterministicExport(input: ExportBuildInput): ExportBuildReport;
//# sourceMappingURL=export-build.d.ts.map