import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CommandBus } from './command-bus.js';
import { ProjectStore } from './project-store.js';
import { PlaytestRunner } from './playtest-runner.js';

describe('playable interaction smoke', () => {
  it('loads fixture and emits player->interactable interaction on step', () => {
    const fixturePath = resolve(process.cwd(), 'fixtures', 'playable_interaction.runtime.json');
    const fixtureJson = readFileSync(fixturePath, 'utf8');

    const store = new ProjectStore(new CommandBus());
    store.loadFromJson(fixtureJson);
    assert.equal(store.manifest.id, 'proj_playable_interaction');

    const runner = new PlaytestRunner();
    runner.init(store.entities, store.tileLayers, store.manifest.tileSize);
    assert.equal(runner.enter(), true);

    runner.setInput({ moveX: 0, moveY: 0, interact: true });
    const snap = runner.step();
    assert.ok(snap);
    assert.equal(snap?.interactions.length, 1);
    assert.equal(snap?.interactions[0].actorId, 'player_1');
    assert.equal(snap?.interactions[0].targetId, 'npc_1');
    assert.equal(snap?.interactions[0].type, 'interact');
  });
});
