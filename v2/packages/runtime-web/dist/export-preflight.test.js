import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExportPreflight } from './export-preflight.js';
function fixtureManifest() {
    return {
        id: 'proj_1',
        name: 'Test',
        version: '0.1.0',
        resolution: { width: 320, height: 240 },
        tileSize: 16,
        createdAt: 'now',
        updatedAt: 'now',
    };
}
function fixtureLayer(painted) {
    return {
        id: 'layer-0',
        name: 'Ground',
        width: 4,
        height: 4,
        tileSize: 16,
        data: painted ? [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : new Array(16).fill(0),
    };
}
function fixturePlayer() {
    return {
        id: 'ent_player',
        name: 'Player',
        position: { x: 0, y: 0 },
        size: { w: 16, h: 16 },
        solid: true,
        tags: ['player'],
    };
}
describe('EXPORT-PREFLIGHT-001: evaluateExportPreflight', () => {
    it('passes with painted map and player entity', () => {
        const report = evaluateExportPreflight(fixtureManifest(), [fixtureLayer(true)], [fixturePlayer()]);
        assert.equal(report.ok, true);
        assert.equal(report.blockingCount, 0);
    });
    it('blocks when no tile layers exist', () => {
        const report = evaluateExportPreflight(fixtureManifest(), [], [fixturePlayer()]);
        assert.equal(report.ok, false);
        assert.ok(report.issues.some((i) => i.code === 'EXPORT_PREFLIGHT_LAYER_MISSING'));
    });
    it('blocks when no player entity exists', () => {
        const report = evaluateExportPreflight(fixtureManifest(), [fixtureLayer(true)], []);
        assert.equal(report.ok, false);
        assert.ok(report.issues.some((i) => i.code === 'EXPORT_PREFLIGHT_PLAYER_MISSING'));
    });
    it('warns when map is empty', () => {
        const report = evaluateExportPreflight(fixtureManifest(), [fixtureLayer(false)], [fixturePlayer()]);
        assert.equal(report.ok, true);
        assert.equal(report.warningCount, 1);
        assert.ok(report.issues.some((i) => i.code === 'EXPORT_PREFLIGHT_MAP_EMPTY'));
    });
    it('returns deterministic issue ordering', () => {
        const a = evaluateExportPreflight(fixtureManifest(), [], []);
        const b = evaluateExportPreflight(fixtureManifest(), [], []);
        assert.deepEqual(a.issues, b.issues);
    });
});
//# sourceMappingURL=export-preflight.test.js.map