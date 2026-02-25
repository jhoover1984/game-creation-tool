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
export function evaluateExportPreflight(
  manifest: ProjectManifest,
  tileLayers: readonly TileLayer[],
  entities: readonly EntityDef[],
): ExportPreflightReport {
  void manifest;
  const issues: ExportPreflightIssue[] = [];

  if (tileLayers.length === 0) {
    issues.push({
      code: 'EXPORT_PREFLIGHT_LAYER_MISSING',
      severity: 'error',
      blocking: true,
      path: '/tileLayers',
      message: 'Export requires at least one tile layer.',
    });
  } else {
    const layer0 = tileLayers[0];
    const hasPaintedTile = layer0.data.some((t) => t > 0);
    if (!hasPaintedTile) {
      issues.push({
        code: 'EXPORT_PREFLIGHT_MAP_EMPTY',
        severity: 'warning',
        blocking: false,
        path: `/tileLayers/${layer0.id}`,
        message: 'Map has no painted tiles.',
      });
    }
  }

  const hasPlayer = entities.some((e) => e.tags.includes('player'));
  if (!hasPlayer) {
    issues.push({
      code: 'EXPORT_PREFLIGHT_PLAYER_MISSING',
      severity: 'error',
      blocking: true,
      path: '/entities',
      message: 'Export requires a player entity (tag: player).',
    });
  }

  // Deterministic ordering
  issues.sort((a, b) => {
    const aw = a.severity === 'error' ? 2 : 1;
    const bw = b.severity === 'error' ? 2 : 1;
    if (aw !== bw) return bw - aw;
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return a.path.localeCompare(b.path);
  });

  const blockingCount = issues.filter((i) => i.blocking).length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    ok: blockingCount === 0,
    blockingCount,
    warningCount,
    issues,
  };
}

