import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CommandBus } from './command-bus.js';
import { ProjectStore } from './project-store.js';
import { DiagnosticStore } from './diagnostic-store.js';
describe('recovery actions smoke', () => {
    it('loads fixture and produces actionable recovery task from warning diagnostics', () => {
        const fixturePath = resolve(process.cwd(), 'fixtures', 'recovery_actions.runtime.json');
        const fixtureJson = readFileSync(fixturePath, 'utf8');
        const store = new ProjectStore(new CommandBus());
        store.loadFromJson(fixtureJson);
        assert.equal(store.manifest.id, 'proj_recovery_actions');
        const loadDiags = store.getValidationDiagnostics();
        assert.ok(loadDiags.some((d) => d.code === 'QUEST_NODE_UNREACHABLE'));
        const diagnostics = new DiagnosticStore();
        diagnostics.ingestSemanticDiagnostics(loadDiags, 'project-load');
        const tasks = diagnostics.generateTasks();
        const recoveryTask = tasks.find((t) => t.label === 'Connect unreachable node');
        assert.ok(recoveryTask);
        assert.equal(recoveryTask?.severity, 'warning');
        assert.equal(recoveryTask?.category, 'topology');
        assert.ok(recoveryTask?.fixAction);
        assert.equal(recoveryTask?.fixAction?.deterministic, false);
    });
});
//# sourceMappingURL=recovery-actions-smoke.test.js.map