import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ExportBuildInput } from './export-build.js';
import { buildDeterministicExport } from './export-build.js';

function makeInput(seed = 7): ExportBuildInput {
  return {
    manifest: {
      id: 'proj-demo',
      name: 'Demo',
      version: '0.1.0',
      resolution: { width: 64, height: 64 },
      tileSize: 16,
      createdAt: '2026-02-22T00:00:00.000Z',
      updatedAt: '2026-02-22T00:00:00.000Z',
    },
    tileLayers: [{
      id: 'layer-0',
      name: 'Ground',
      width: 4,
      height: 4,
      tileSize: 16,
      data: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }],
    entities: [{
      id: 'e-player',
      name: 'Player',
      position: { x: 0, y: 0 },
      size: { w: 16, h: 16 },
      solid: true,
      spriteId: 'asset:sprite/player',
      animationClipId: undefined,
      tags: ['player'],
    }],
    questGraph: {
      schemaVersion: '2.0.0',
      nodes: [{ nodeId: 'node_start', kind: 'start', name: 'Start' }],
      edges: [],
    },
    behaviors: {},
    effectState: {
      activePresetId: null,
      intensity: 0.5,
      fieldLink: { fieldId: null, influence: 0 },
    },
    seed,
  };
}

describe('EXPORT-BUILD-001: buildDeterministicExport', () => {
  it('returns stable build outputs for equivalent input + seed', () => {
    const a = buildDeterministicExport(makeInput(11));
    const b = buildDeterministicExport(makeInput(11));
    assert.equal(a.buildId, b.buildId);
    assert.equal(a.projectJson, b.projectJson);
    assert.equal(a.manifestJson, b.manifestJson);
    assert.deepEqual(a.artifacts, b.artifacts);
  });

  it('changes buildId when seed changes', () => {
    const a = buildDeterministicExport(makeInput(1));
    const b = buildDeterministicExport(makeInput(2));
    assert.notEqual(a.buildId, b.buildId);
  });

  it('changes source hash when project content changes', () => {
    const base = makeInput(5);
    const a = buildDeterministicExport(base);
    const changed = makeInput(5);
    changed.tileLayers[0].data[1] = 2;
    const b = buildDeterministicExport(changed);
    assert.notEqual(a.metadata.sourceHash, b.metadata.sourceHash);
  });

  it('includes versioned compatibility metadata', () => {
    const report = buildDeterministicExport(makeInput(3));
    assert.equal(report.metadata.buildSchemaVersion, '1.0.0');
    assert.equal(report.metadata.projectVersion, '0.1.0');
    assert.equal(report.metadata.questSchemaVersion, '2.0.0');
    assert.ok(report.metadata.compatibilityMarker.includes('gcsv2-web'));
  });

  it('returns deterministic artifact ordering and provenance artifact', () => {
    const report = buildDeterministicExport(makeInput(9));
    assert.deepEqual(
      report.artifacts.map((a) => a.path),
      ['export/manifest.json', 'export/project.json', 'export/provenance.json'],
    );
    assert.ok(report.provenanceJson.includes('export/project.json'));
    assert.ok(report.provenanceJson.includes('export/manifest.json'));
  });
});
