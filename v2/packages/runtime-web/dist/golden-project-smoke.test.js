import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CommandBus } from './command-bus.js';
import { ProjectStore } from './project-store.js';
import { PlaytestRunner } from './playtest-runner.js';
describe('golden project smoke', () => {
    it('loads fixture, runs playtest tick, and save/load roundtrips', () => {
        const fixturePath = resolve(process.cwd(), 'fixtures', 'golden_project.runtime.json');
        const fixtureJson = readFileSync(fixturePath, 'utf8');
        const bus = new CommandBus();
        const store = new ProjectStore(bus);
        store.loadFromJson(fixtureJson);
        // Verify load baseline
        assert.equal(store.manifest.id, 'proj_golden');
        assert.equal(store.entities.length, 1);
        assert.equal(store.entities[0].name, 'Player');
        // Run one playtest step with movement input.
        const runner = new PlaytestRunner();
        runner.init(store.entities, store.tileLayers, store.manifest.tileSize);
        assert.equal(runner.enter(), true);
        runner.setInput({ moveX: 1, moveY: 0 });
        const snap = runner.step();
        assert.ok(snap, 'playtest step should produce a snapshot');
        assert.equal(snap?.state, 'running');
        assert.equal(snap?.entities.length, 1);
        assert.ok((snap?.entities[0].x ?? 0) > 16, 'player should move to the right after one step');
        // Save and reload must preserve authored state shape.
        const saved = store.saveToJson();
        const store2 = new ProjectStore(new CommandBus());
        store2.loadFromJson(saved);
        assert.equal(store2.manifest.id, 'proj_golden');
        assert.equal(store2.entities.length, 1);
        assert.equal(store2.tileLayers.length, 1);
    });
});
//# sourceMappingURL=golden-project-smoke.test.js.map