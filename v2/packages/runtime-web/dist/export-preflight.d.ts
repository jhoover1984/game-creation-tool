import type { EntityDef, ProjectManifest, TileLayer } from '@gcs/contracts';
export interface ExportPreflightIssue {
    code: string;
    severity: 'error' | 'warning';
    blocking: boolean;
    path: string;
    message: string;
}
export interface ExportPreflightReport {
    ok: boolean;
    blockingCount: number;
    warningCount: number;
    issues: ExportPreflightIssue[];
}
/**
 * Deterministic export preflight checks for EXPORT-PREFLIGHT-001.
 * Pure function: no state mutation, no side effects.
 */
export declare function evaluateExportPreflight(manifest: ProjectManifest, tileLayers: readonly TileLayer[], entities: readonly EntityDef[]): ExportPreflightReport;
//# sourceMappingURL=export-preflight.d.ts.map