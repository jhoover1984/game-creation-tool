import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateQuestGraphSemantics } from './semantic-validation.js';
function readQuestFixture() {
    const raw = readFileSync(resolve(process.cwd(), 'fixtures', 'story_quest_branch.v2.json'), 'utf8');
    return JSON.parse(raw);
}
describe('semantic validation', () => {
    it('accepts valid quest graph fixture', () => {
        const graph = readQuestFixture();
        const result = validateQuestGraphSemantics(graph);
        assert.equal(result.ok, true);
        assert.equal(result.diagnostics.length, 0);
    });
    it('rejects duplicate node IDs', () => {
        const graph = readQuestFixture();
        graph.nodes.push({ ...graph.nodes[0] });
        const result = validateQuestGraphSemantics(graph);
        assert.equal(result.ok, false);
        assert.ok(result.diagnostics.some((d) => d.code === 'QUEST_DUPLICATE_NODE_ID'));
    });
    it('rejects edges that reference missing nodes', () => {
        const graph = readQuestFixture();
        graph.edges[0].to = 'node_missing';
        const result = validateQuestGraphSemantics(graph);
        assert.equal(result.ok, false);
        assert.ok(result.diagnostics.some((d) => d.code === 'QUEST_EDGE_TO_MISSING'));
    });
    it('rejects quest graph with no start node', () => {
        const graph = readQuestFixture();
        graph.nodes[0].kind = 'objective';
        const result = validateQuestGraphSemantics(graph);
        assert.equal(result.ok, false);
        assert.ok(result.diagnostics.some((d) => d.code === 'QUEST_START_NODE_MISSING'));
    });
    it('rejects quest graph with multiple start nodes', () => {
        const graph = readQuestFixture();
        graph.nodes[1].kind = 'start';
        const result = validateQuestGraphSemantics(graph);
        assert.equal(result.ok, false);
        assert.ok(result.diagnostics.some((d) => d.code === 'QUEST_START_NODE_MULTIPLE'));
    });
    it('warns on unreachable nodes without failing validation', () => {
        const graph = readQuestFixture();
        graph.nodes.push({
            nodeId: 'node_unreachable',
            kind: 'reward',
            name: 'Unreachable Reward',
        });
        const result = validateQuestGraphSemantics(graph);
        assert.equal(result.ok, true, 'unreachable nodes should be warnings, not hard errors');
        assert.ok(result.diagnostics.some((d) => d.code === 'QUEST_NODE_UNREACHABLE'));
        assert.ok(result.diagnostics.some((d) => d.severity === 'warning'));
    });
});
//# sourceMappingURL=semantic-validation.test.js.map