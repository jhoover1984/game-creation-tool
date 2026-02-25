/**
 * Behavior guardrail overflow tests (BEHAV-DEBUG-002).
 *
 * Verifies that BehaviorEvaluator and PlaytestRunner correctly track and
 * expose row-cap and action-cap overflow state. All tests are deterministic;
 * no wall-clock or random state involved.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BehaviorEvaluator } from './behavior-evaluator.js';
import { PlaytestRunner } from './playtest-runner.js';
function makeEntity(id) {
    return { id, name: id, position: { x: 0, y: 0 }, size: { w: 16, h: 16 }, solid: false, tags: [] };
}
/** Build a row with `actionCount` log actions on the on:tick trigger. */
function makeTickRow(id, actionCount) {
    return {
        id,
        label: id,
        enabled: true,
        trigger: { type: 'on:tick' },
        conditions: [],
        actions: Array.from({ length: actionCount }, (_, i) => ({
            id: `a${i}`,
            type: 'log',
            target: { type: 'this' },
            params: {},
        })),
    };
}
describe('BehaviorEvaluator guardrails (BEHAV-DEBUG-002)', () => {
    it('rowCapHit=true when evaluate processes more than 256 rows', () => {
        const ev = new BehaviorEvaluator();
        const entity = makeEntity('e1');
        // 257 enabled on:tick rows exceeds the 256-row global cap.
        const rows = Array.from({ length: 257 }, (_, i) => makeTickRow(`r${i}`, 1));
        ev.evaluate({ e1: rows }, [entity], 'on:tick');
        assert.equal(ev.getLastOverflow().rowCapHit, true);
    });
    it('rowCapHit=false when evaluate processes at most 256 rows', () => {
        const ev = new BehaviorEvaluator();
        const entity = makeEntity('e1');
        const rows = Array.from({ length: 10 }, (_, i) => makeTickRow(`r${i}`, 1));
        ev.evaluate({ e1: rows }, [entity], 'on:tick');
        assert.equal(ev.getLastOverflow().rowCapHit, false);
    });
    it('actionCapHits populated when row has 17 actions (cap is 16)', () => {
        const ev = new BehaviorEvaluator();
        const entity = makeEntity('e1');
        // Row with 17 log actions: index 16 is the first to exceed maxActionsPerRow=16.
        const row = makeTickRow('r1', 17);
        ev.evaluate({ e1: [row] }, [entity], 'on:tick');
        const ov = ev.getLastOverflow();
        assert.equal(ov.actionCapHits.length, 1);
        assert.equal(ov.actionCapHits[0].entityId, 'e1');
        assert.equal(ov.actionCapHits[0].rowId, 'r1');
    });
    it('actionCapHits entry appears only once per (entityId, rowId) even when 3 actions overflow', () => {
        const ev = new BehaviorEvaluator();
        const entity = makeEntity('e1');
        // 19 actions: indices 16, 17, 18 all overflow, but the dedup key fires only once.
        const row = makeTickRow('r1', 19);
        ev.evaluate({ e1: [row] }, [entity], 'on:tick');
        assert.equal(ev.getLastOverflow().actionCapHits.length, 1);
    });
    it('overflow resets between evaluate() calls (no cross-contamination)', () => {
        const ev = new BehaviorEvaluator();
        const entity = makeEntity('e1');
        // First call: hits both caps.
        const manyRows = Array.from({ length: 257 }, (_, i) => makeTickRow(`r${i}`, 17));
        ev.evaluate({ e1: manyRows }, [entity], 'on:tick');
        assert.equal(ev.getLastOverflow().rowCapHit, true);
        // Second call: single clean row -- overflow must reset.
        ev.evaluate({ e1: [makeTickRow('r0', 1)] }, [entity], 'on:tick');
        assert.equal(ev.getLastOverflow().rowCapHit, false);
        assert.equal(ev.getLastOverflow().actionCapHits.length, 0);
    });
    it('PlaytestRunner.getLastStepOverflow reflects action cap hit from tick behaviors', () => {
        const runner = new PlaytestRunner();
        const entity = makeEntity('e1');
        runner.init([entity], [], 16);
        // Row with 17 log actions: will hit the per-row action cap on every tick step.
        runner.setBehaviors({ e1: [makeTickRow('r1', 17)] });
        runner.enter();
        runner.step();
        const ov = runner.getLastStepOverflow();
        assert.equal(ov.actionCapHits.length, 1);
        assert.equal(ov.actionCapHits[0].entityId, 'e1');
        assert.equal(ov.actionCapHits[0].rowId, 'r1');
    });
});
//# sourceMappingURL=behavior-guard.test.js.map