/**
 * visual-density.test.ts -- UI-VISUAL-002 Slice B
 * Verifies that density vars are decoupled from data-mode.
 *
 * Assertions (CSS text-based; no DOM/CSSOM):
 *   1. [data-density="dense"] block exists with all 4 override vars.
 *   2. [data-mode="pro"] block does NOT contain any density override vars
 *      (proving decoupling -- mode controls feature surface only).
 */
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutCss = readFileSync(resolve(__dirname, '../src/styles/layout.css'), 'utf-8');
/** Extract the first CSS rule block for a given selector. */
function extractBlock(css, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
    return match ? match[1] : null;
}
const DENSITY_VARS = ['--control-height', '--row-gap', '--panel-padding', '--text-sm'];
describe('UI-VISUAL-002 Slice B: density decoupling', () => {
    it('[data-density="dense"] block exists in layout.css', () => {
        assert.ok(layoutCss.includes('[data-density="dense"]'), '[data-density="dense"] selector not found in layout.css');
    });
    for (const varName of DENSITY_VARS) {
        it(`[data-density="dense"] contains ${varName} override`, () => {
            const block = extractBlock(layoutCss, '[data-density="dense"]');
            assert.ok(block !== null, '[data-density="dense"] block not found');
            assert.ok(block.includes(varName), `${varName} not found in [data-density="dense"] block`);
        });
    }
    it('[data-mode="pro"] block absent from layout.css (density decoupled)', () => {
        assert.ok(!layoutCss.includes('[data-mode="pro"]'), '[data-mode="pro"] still present in layout.css -- density vars not yet decoupled');
    });
});
//# sourceMappingURL=visual-density.test.js.map