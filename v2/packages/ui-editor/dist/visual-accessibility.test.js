/**
 * visual-accessibility.test.ts -- UI-VISUAL-004
 * Verifies accessibility normalization: expanded focus-visible coverage,
 * centralized :disabled opacity, reduced-motion clamping, and consistency
 * fixes in base/workspace CSS.
 *
 * All assertions are CSS text-based (no DOM/CSSOM).
 */
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const stylesDir = resolve(__dirname, '../src/styles');
function readCss(file) {
    return readFileSync(resolve(stylesDir, file), 'utf-8');
}
const a11yCss = readCss('accessibility.css');
const tokensCss = readCss('tokens.css');
const baseCss = readCss('base.css');
const workspacesCss = readCss('workspaces.css');
describe('UI-VISUAL-004: accessibility normalization', () => {
    // --- Focus ring coverage ---
    it('a:focus-visible covered in accessibility.css', () => {
        assert.ok(a11yCss.includes('a:focus-visible'), 'a:focus-visible missing from accessibility.css');
    });
    it('textarea:focus-visible covered in accessibility.css', () => {
        assert.ok(a11yCss.includes('textarea:focus-visible'), 'textarea:focus-visible missing from accessibility.css');
    });
    it('[tabindex]:focus-visible covered in accessibility.css', () => {
        assert.ok(a11yCss.includes('[tabindex]:focus-visible'), '[tabindex]:focus-visible missing from accessibility.css');
    });
    // --- Reduced-motion clamping ---
    it('reduced-motion block clamps transition-duration to 0.01ms', () => {
        assert.ok(a11yCss.includes('transition-duration: 0.01ms'), 'reduced-motion transition-duration clamp missing');
    });
    it('reduced-motion block clamps animation-duration to 0.01ms', () => {
        assert.ok(a11yCss.includes('animation-duration:  0.01ms'), 'reduced-motion animation-duration clamp missing');
    });
    // --- Disabled normalization ---
    it('--opacity-disabled token defined in tokens.css', () => {
        assert.ok(tokensCss.includes('--opacity-disabled'), '--opacity-disabled token missing from tokens.css');
    });
    it('centralized :disabled rule uses var(--opacity-disabled) in accessibility.css', () => {
        assert.ok(a11yCss.includes('var(--opacity-disabled)'), 'centralized :disabled opacity rule missing from accessibility.css');
    });
    it('no inline opacity: 0.4x disabled overrides remain in workspaces.css', () => {
        const inlineDisabled = /opacity:\s*0\.4[0-9]*;/.test(workspacesCss);
        assert.ok(!inlineDisabled, 'Inline disabled opacity override still present in workspaces.css');
    });
    // --- Base hover fix ---
    it('button:hover uses :not(:disabled) guard in base.css', () => {
        assert.ok(baseCss.includes('button:hover:not(:disabled)'), 'button:hover does not guard against :disabled in base.css');
    });
    // --- Workspace consistency ---
    it('.dash-recent-card:hover exists in workspaces.css', () => {
        assert.ok(workspacesCss.includes('.dash-recent-card:hover'), '.dash-recent-card:hover rule missing from workspaces.css');
    });
});
//# sourceMappingURL=visual-accessibility.test.js.map