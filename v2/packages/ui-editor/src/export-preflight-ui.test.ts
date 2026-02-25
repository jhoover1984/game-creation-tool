import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EditorApp } from './editor-app.js';
import { renderExportPanel } from './export-panel.js';

describe('EXPORT-PREFLIGHT-001: EditorApp preflight integration', () => {
  it('returns blocking report when player is missing', () => {
    const app = new EditorApp();
    app.newProject('exp', 8, 8, 16);
    const report = app.runExportPreflight();
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((i) => i.code === 'EXPORT_PREFLIGHT_PLAYER_MISSING'));
    assert.ok(app.getTasks().some((t) => t.label.includes('player')));
  });

  it('passes when player exists and map has painted tile', () => {
    const app = new EditorApp();
    app.newProject('exp', 8, 8, 16);
    app.paintTile('layer-0', 0, 0, 1);
    app.createEntity('Player', 0, 0);
    const player = app.store.entities[0];
    player.tags.push('player');
    const report = app.runExportPreflight();
    assert.equal(report.ok, true);
    assert.equal(report.blockingCount, 0);
  });

  it('clears prior export diagnostics before rerun', () => {
    const app = new EditorApp();
    app.newProject('exp', 8, 8, 16);
    const first = app.runExportPreflight();
    assert.equal(first.ok, false);
    const beforeCount = app.getDiagnostics().filter((d) => d.code.startsWith('EXPORT_PREFLIGHT_')).length;
    assert.ok(beforeCount > 0);

    app.createEntity('Player', 0, 0);
    app.store.entities[0].tags.push('player');
    app.paintTile('layer-0', 0, 0, 1);
    app.runExportPreflight();

    const afterCount = app.getDiagnostics().filter((d) => d.code.startsWith('EXPORT_PREFLIGHT_')).length;
    assert.equal(afterCount, 0);
  });
});

describe('EXPORT-PREFLIGHT-001: renderExportPanel', () => {
  it('renders empty state when no report exists', () => {
    const html = renderExportPanel(null);
    assert.ok(html.includes('Run preflight'));
    assert.ok(html.includes('Build Preview'));
  });

  it('disables build button when report is blocking', () => {
    const html = renderExportPanel({
      ok: false,
      blockingCount: 1,
      warningCount: 0,
      issues: [
        {
          code: 'EXPORT_PREFLIGHT_PLAYER_MISSING',
          severity: 'error',
          blocking: true,
          path: '/entities',
          message: 'Export requires a player entity (tag: player).',
        },
      ],
    });
    assert.ok(html.includes('disabled'));
    assert.ok(html.includes('EXPORT_PREFLIGHT_PLAYER_MISSING'));
  });
});

describe('EXPORT-BUILD-001: EditorApp build integration', () => {
  it('returns deterministic build report for same state + seed', () => {
    const app = new EditorApp();
    app.newProject('exp', 8, 8, 16);
    app.paintTile('layer-0', 0, 0, 1);
    app.createEntity('Player', 0, 0);
    app.store.entities[0].tags.push('player');

    const a = app.runExportBuild(7);
    const b = app.runExportBuild(7);
    assert.equal(a.buildId, b.buildId);
    assert.deepEqual(a.artifacts, b.artifacts);
  });

  it('changes build id when seed changes', () => {
    const app = new EditorApp();
    app.newProject('exp', 8, 8, 16);
    app.paintTile('layer-0', 0, 0, 1);
    app.createEntity('Player', 0, 0);
    app.store.entities[0].tags.push('player');

    const a = app.runExportBuild(1);
    const b = app.runExportBuild(2);
    assert.notEqual(a.buildId, b.buildId);
  });
});

describe('EXPORT-BUILD-001: renderExportPanel build summary', () => {
  it('renders build metadata when build report exists', () => {
    const html = renderExportPanel(
      {
        ok: true,
        blockingCount: 0,
        warningCount: 0,
        issues: [],
      },
      {
        ok: true,
        buildId: 'abc12345',
        metadata: {
          buildSchemaVersion: '1.0.0',
          compatibilityMarker: 'gcsv2-web:project-0.1.0:quest-2.0.0:build-1',
          projectVersion: '0.1.0',
          questSchemaVersion: '2.0.0',
          seed: 0,
          sourceHash: 'deadbeef',
        },
        artifacts: [
          { path: 'export/manifest.json', bytes: 10, hash: 'a' },
          { path: 'export/project.json', bytes: 20, hash: 'b' },
          { path: 'export/provenance.json', bytes: 30, hash: 'c' },
        ],
        projectJson: '{}',
        manifestJson: '{}',
        provenanceJson: '{}',
      },
    );
    assert.ok(html.includes('Build ID'));
    assert.ok(html.includes('abc12345'));
    assert.ok(html.includes('Artifacts: 3'));
  });
});
