/**
 * Dirty-state correctness tests -- UI-DIRTY-001
 * Verifies snapshot-based isDirty across: fresh project, commands, save, undo/redo,
 * new project, load, and story-panel mutations (bus bypass).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorShellController } from './editor-shell-controller.js';
import { StoryPanelController } from './story-panel-controller.js';
class FakeButton {
    clickHandlers = [];
    addEventListener(type, handler) {
        if (type === 'click')
            this.clickHandlers.push(handler);
    }
    click() {
        for (const handler of this.clickHandlers)
            handler();
    }
}
// ---------------------------------------------------------------------------
// Helper: read private isDirty via type cast
// ---------------------------------------------------------------------------
function isDirty(shell) {
    return shell.isDirty;
}
// ---------------------------------------------------------------------------
// Helper: minimal shell elements with optional persistence
// ---------------------------------------------------------------------------
function makeMinimalElements(extraElements = {}) {
    const canvas = {
        style: { cursor: '' },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 240 }),
        getContext: () => ({
            clearRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, stroke() { },
            strokeRect() { }, fillRect() { }, fillText() { },
            strokeStyle: '#000', lineWidth: 1, fillStyle: '#000', font: '10px monospace',
        }),
        width: 320,
        height: 240,
    };
    const makeContainer = () => ({
        innerHTML: '',
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        querySelector: () => null,
        querySelectorAll: () => [],
    });
    return {
        canvas,
        tasksContainer: makeContainer(),
        inspectorContainer: makeContainer(),
        consoleContainer: makeContainer(),
        status: { textContent: '' },
        ...extraElements,
    };
}
// ---------------------------------------------------------------------------
// Tests: core dirty invariants
// ---------------------------------------------------------------------------
test('UI-DIRTY-001: fresh project is clean (isDirty === false on init)', () => {
    const shell = new EditorShellController(makeMinimalElements());
    assert.ok(!isDirty(shell), 'fresh project should be clean');
});
test('UI-DIRTY-001: dispatching a command makes project dirty', () => {
    const shell = new EditorShellController(makeMinimalElements());
    assert.ok(!isDirty(shell));
    shell.app.createEntity('Hero', 0, 0);
    assert.ok(isDirty(shell), 'project should be dirty after entity create');
});
test('UI-DIRTY-001: undo back to saved baseline returns clean', () => {
    const shell = new EditorShellController(makeMinimalElements());
    shell.app.createEntity('Hero', 0, 0);
    assert.ok(isDirty(shell));
    // Undo manually and call recomputeDirty (simulate btn-undo click path)
    shell.app.undo();
    // Access private recomputeDirty via type cast
    shell.recomputeDirty();
    assert.ok(!isDirty(shell), 'undo back to baseline should return clean');
});
test('UI-DIRTY-001: redo after undo makes project dirty again', () => {
    const shell = new EditorShellController(makeMinimalElements());
    shell.app.createEntity('Hero', 0, 0);
    shell.app.undo();
    shell.recomputeDirty();
    assert.ok(!isDirty(shell), 'after undo: clean');
    shell.app.redo();
    shell.recomputeDirty();
    assert.ok(isDirty(shell), 'redo should make project dirty again');
});
test('UI-DIRTY-001: markClean after save -- project is clean', () => {
    const shell = new EditorShellController(makeMinimalElements());
    shell.app.createEntity('Hero', 0, 0);
    assert.ok(isDirty(shell));
    shell.markClean();
    assert.ok(!isDirty(shell), 'project should be clean after markClean (save)');
});
test('UI-DIRTY-001: new project resets clean baseline (isDirty=false after new)', () => {
    const shell = new EditorShellController(makeMinimalElements());
    shell.app.createEntity('Hero', 0, 0);
    assert.ok(isDirty(shell));
    // Simulate doNewProject (used by btnNew handler)
    shell.app.newProject('Fresh', 10, 10, 16);
    shell.markClean();
    assert.ok(!isDirty(shell), 'after new project markClean: should be clean');
    // No further commands -- should stay clean
    assert.ok(!isDirty(shell));
});
test('UI-DIRTY-001: Apply Map recomputes dirty state and marks project dirty', () => {
    const btnApplyMap = new FakeButton();
    const mapWidthInput = { value: '20' };
    const mapHeightInput = { value: '15' };
    const mapTileSizeInput = { value: '16' };
    const shell = new EditorShellController(makeMinimalElements({
        btnApplyMap,
        mapWidthInput,
        mapHeightInput,
        mapTileSizeInput,
    }));
    assert.ok(!isDirty(shell), 'fresh project should start clean');
    mapWidthInput.value = '12';
    mapHeightInput.value = '11';
    btnApplyMap.click();
    assert.ok(isDirty(shell), 'applying map changes should mark project dirty');
});
test('UI-DIRTY-001: undo past a previous save baseline keeps project dirty', () => {
    // Sequence: create A, save (baseline=A), create B, undo B -> clean, undo A -> dirty
    const shell = new EditorShellController(makeMinimalElements());
    shell.app.createEntity('A', 0, 0);
    shell.markClean(); // save here: baseline includes A
    shell.app.createEntity('B', 16, 0);
    assert.ok(isDirty(shell), 'after create B: dirty');
    shell.app.undo(); // undo B
    shell.recomputeDirty();
    assert.ok(!isDirty(shell), 'after undo B: clean (matches saved baseline)');
    shell.app.undo(); // undo A
    shell.recomputeDirty();
    assert.ok(isDirty(shell), 'after undo A: dirty (baseline had A, now it is gone)');
});
// ---------------------------------------------------------------------------
// Tests: StoryPanelController onMutate hook
// ---------------------------------------------------------------------------
test('UI-DIRTY-001: StoryPanelController calls onMutate after successful apply', () => {
    let mutateCount = 0;
    const mockNode = { nodeId: 'n1', name: 'Start', kind: 'start' };
    const mockApp = {
        getQuestNodes: () => [mockNode],
        getSelectedQuestNode: () => mockNode,
        selectQuestNode: () => mockNode,
        updateQuestNodeBasics: (_id, fields) => {
            mockNode.name = fields.name;
            return true;
        },
    };
    const clickListeners = [];
    const container = {
        innerHTML: '',
        addEventListener: (type, fn) => {
            if (type === 'click')
                clickListeners.push(fn);
        },
        removeEventListener: () => undefined,
        querySelector: (sel) => {
            if (sel === '[data-path="kind"]')
                return { value: 'start' };
            if (sel === 'input[data-path="name"]')
                return { value: 'Renamed' };
            return null;
        },
        querySelectorAll: () => [],
    };
    new StoryPanelController(mockApp, container, () => { mutateCount++; });
    // Simulate clicking the apply button
    const applyTarget = {
        getAttribute: (name) => name === 'data-action' ? 'apply-story-inspector' : null,
    };
    clickListeners.forEach((fn) => fn({ target: applyTarget }));
    assert.equal(mutateCount, 1, 'onMutate should be called once after successful apply');
});
test('UI-DIRTY-001: StoryPanelController does not call onMutate when updateQuestNodeBasics fails', () => {
    let mutateCount = 0;
    const mockApp = {
        getQuestNodes: () => [{ nodeId: 'n1', name: 'Start', kind: 'start' }],
        getSelectedQuestNode: () => ({ nodeId: 'n1', name: 'Start', kind: 'start' }),
        selectQuestNode: () => null,
        updateQuestNodeBasics: () => false, // simulate failure
    };
    const clickListeners = [];
    const container = {
        innerHTML: '',
        addEventListener: (type, fn) => {
            if (type === 'click')
                clickListeners.push(fn);
        },
        removeEventListener: () => undefined,
        querySelector: (sel) => {
            if (sel === '[data-path="kind"]')
                return { value: 'start' };
            if (sel === 'input[data-path="name"]')
                return { value: 'Renamed' };
            return null;
        },
        querySelectorAll: () => [],
    };
    new StoryPanelController(mockApp, container, () => { mutateCount++; });
    const applyTarget = {
        getAttribute: (name) => name === 'data-action' ? 'apply-story-inspector' : null,
    };
    clickListeners.forEach((fn) => fn({ target: applyTarget }));
    assert.equal(mutateCount, 0, 'onMutate should NOT be called when update fails');
});
// ---------------------------------------------------------------------------
// Tests: sprite edit dirty detection (UI-DIRTY-001 + SPRITE-PERSIST-001)
// ---------------------------------------------------------------------------
test('UI-DIRTY-001: sprite store mutation marks project dirty', () => {
    const shell = new EditorShellController(makeMinimalElements());
    assert.ok(!isDirty(shell), 'fresh project is clean');
    // Open a sprite and paint -- this triggers spriteStore.subscribe
    shell.spriteStore.openSprite('spr-test', 4, 4);
    shell.spriteStore.applyStroke([{ x: 0, y: 0, rgba: [255, 0, 0, 255] }], 'pencil');
    assert.ok(isDirty(shell), 'sprite paint should make project dirty');
});
test('UI-DIRTY-001: markClean after sprite edit returns clean (sprite generation saved)', () => {
    const shell = new EditorShellController(makeMinimalElements());
    shell.spriteStore.openSprite('spr-test', 4, 4);
    shell.spriteStore.applyStroke([{ x: 0, y: 0, rgba: [255, 0, 0, 255] }], 'pencil');
    assert.ok(isDirty(shell));
    shell.markClean();
    assert.ok(!isDirty(shell), 'markClean after sprite edit should return clean');
});
test('UI-DIRTY-001: clearAll on new project resets sprite generation to clean', () => {
    const shell = new EditorShellController(makeMinimalElements());
    shell.spriteStore.openSprite('spr-test', 4, 4);
    shell.spriteStore.applyStroke([{ x: 0, y: 0, rgba: [255, 0, 0, 255] }], 'pencil');
    assert.ok(isDirty(shell));
    // Simulate doNewProject: clearAll + markClean
    shell.spriteStore.clearAll();
    shell.markClean();
    assert.ok(!isDirty(shell), 'after clearAll + markClean: should be clean');
});
//# sourceMappingURL=dirty-state.test.js.map