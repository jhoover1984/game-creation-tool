/**
 * visual-tokens.test.ts -- UI-VISUAL-001 / UI-VISUAL-002
 * Verifies the CSS token layer is present and correctly applied.
 *
 * Slice A (UI-VISUAL-002): reads from extracted styles/*.css files
 * instead of the former inline app.html <style> block.
 */
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const stylesDir = resolve(__dirname, '../src/styles');
const cssFiles = ['tokens.css', 'base.css', 'layout.css', 'components.css', 'workspaces.css', 'accessibility.css'];
const allCss = cssFiles.map((f) => readFileSync(resolve(stylesDir, f), 'utf-8')).join('\n');
describe('UI-VISUAL-001: visual token layer', () => {
    it('primitive token layer exists (--prim-navy-900)', () => {
        assert.ok(allCss.includes('--prim-navy-900'), 'primitive color token missing');
    });
    it('semantic alias layer exists (--bg-base)', () => {
        assert.ok(allCss.includes('--bg-base'), 'semantic alias --bg-base missing');
    });
    it('dense density override block exists (UI-VISUAL-002 Slice B)', () => {
        assert.ok(allCss.includes('[data-density="dense"]'), 'dense density override block missing');
    });
    it('prefers-reduced-motion block exists', () => {
        assert.ok(allCss.includes('prefers-reduced-motion'), 'reduced-motion override missing');
    });
    it('focus-visible rule exists', () => {
        assert.ok(allCss.includes('focus-visible'), 'focus-visible rule missing');
    });
    it('--focus-ring token defined and applied', () => {
        assert.ok(allCss.includes('--focus-ring'), '--focus-ring token missing');
        assert.ok(allCss.includes('var(--focus-ring)'), 'var(--focus-ring) not applied');
    });
    it('body rule uses var( for background, not bare hex', () => {
        // Extract body rule block
        const bodyMatch = allCss.match(/body\s*\{([^}]+)\}/);
        assert.ok(bodyMatch, 'body rule not found');
        const bodyBlock = bodyMatch[1];
        assert.ok(!/#[0-9a-fA-F]{3,6}/.test(bodyBlock), `body rule contains bare hex: ${bodyBlock}`);
    });
    it('button rule uses var( for background, not bare hex', () => {
        // Match the standalone button rule (not button:hover or .dash-btn etc)
        const btnMatch = allCss.match(/(?<![.\w-])button\s*\{([^}]+)\}/);
        assert.ok(btnMatch, 'button rule not found');
        const btnBlock = btnMatch[1];
        assert.ok(!/#[0-9a-fA-F]{3,6}/.test(btnBlock), `button rule contains bare hex: ${btnBlock}`);
    });
    it('status badge classes use status tokens, not raw hex', () => {
        const readyMatch = allCss.match(/dash-health-badge--ready\s*\{([^}]+)\}/);
        assert.ok(readyMatch, 'dash-health-badge--ready rule not found');
        assert.ok(!/#[0-9a-fA-F]{3,6}/.test(readyMatch[1]), 'badge--ready contains bare hex');
        const warnMatch = allCss.match(/dash-health-badge--warnings\s*\{([^}]+)\}/);
        assert.ok(warnMatch, 'dash-health-badge--warnings rule not found');
        assert.ok(!/#[0-9a-fA-F]{3,6}/.test(warnMatch[1]), 'badge--warnings contains bare hex');
    });
    it('trace-pass and trace-fail use status tokens', () => {
        const passMatch = allCss.match(/\.trace-pass\s*\{([^}]+)\}/);
        assert.ok(passMatch, '.trace-pass rule not found');
        assert.ok(!/#[0-9a-fA-F]{3,6}/.test(passMatch[1]), '.trace-pass contains bare hex');
        const failMatch = allCss.match(/\.trace-fail\s*\{([^}]+)\}/);
        assert.ok(failMatch, '.trace-fail rule not found');
        assert.ok(!/#[0-9a-fA-F]{3,6}/.test(failMatch[1]), '.trace-fail contains bare hex');
    });
});
// UI-VISUAL-003: token compliance gate
// Non-token CSS files must not reference --prim-* or bare hex directly.
// tokens.css is the sole source of truth for primitives.
const nonTokenFiles = ['base.css', 'layout.css', 'components.css', 'workspaces.css', 'accessibility.css'];
const nonTokenCss = nonTokenFiles.map((f) => readFileSync(resolve(stylesDir, f), 'utf-8')).join('\n');
describe('UI-VISUAL-003: token compliance gate', () => {
    it('no --prim-* references outside tokens.css', () => {
        const match = nonTokenCss.match(/--prim-[a-z]/);
        assert.ok(match === null, `--prim-* reference found outside tokens.css: "${match?.[0]}"`);
    });
    it('no raw hex values outside tokens.css', () => {
        const match = nonTokenCss.match(/#[0-9a-fA-F]{3,6}\b/);
        assert.ok(match === null, `Raw hex found outside tokens.css: "${match?.[0]}"`);
    });
    it('--accent-highlight alias exists in tokens.css', () => {
        const tokensCss = readFileSync(resolve(stylesDir, 'tokens.css'), 'utf-8');
        assert.ok(tokensCss.includes('--accent-highlight'), '--accent-highlight alias missing from tokens.css');
    });
    it('canvas uses inset box-shadow for framing, not layout border -- UI-SHELL-POLISH-001 A5', () => {
        // border adds layout width causing right-edge clip on resize; inset box-shadow does not.
        const layoutContent = readFileSync(resolve(stylesDir, 'layout.css'), 'utf-8');
        const canvasBlock = layoutContent.match(/(?<![.\w-])canvas\s*\{([^}]+)\}/)?.[1] ?? '';
        assert.ok(!canvasBlock.includes('border:'), 'canvas must not use border: (adds layout width and causes right-edge clip)');
        assert.ok(canvasBlock.includes('box-shadow'), 'canvas must use box-shadow for framing');
        assert.ok(canvasBlock.includes('inset'), 'canvas box-shadow must be inset to avoid layout impact');
    });
});
// UI-SHELL-POLISH-001: shell structure and quick-action copy compliance
// Tests run from dist/; app.html lives in src/ alongside the source.
const appHtml = readFileSync(resolve(__dirname, '../src/app.html'), 'utf-8');
describe('UI-SHELL-POLISH-001: shell structure compliance', () => {
    it('btn-add-starter has btn--primary class (A1 primary action)', () => {
        // The starter scene button is the primary CTA; must carry btn--primary
        const starterMatch = appHtml.match(/id="btn-add-starter"[^>]*/);
        assert.ok(starterMatch, 'btn-add-starter must exist in app.html');
        assert.ok(starterMatch[0].includes('btn--primary'), 'btn-add-starter must have btn--primary class for visual hierarchy');
    });
    it('btn-add-starter text is "Add Starter Scene" (A1 copy alignment)', () => {
        assert.ok(appHtml.includes('Add Starter Scene'), '"Add Starter Scene" copy must be present in app.html');
    });
    it('btn-add-player has btn--secondary class (A1 secondary action)', () => {
        const playerMatch = appHtml.match(/id="btn-add-player"[^>]*/);
        assert.ok(playerMatch, 'btn-add-player must exist in app.html');
        assert.ok(playerMatch[0].includes('btn--secondary'), 'btn-add-player must have btn--secondary class for visual hierarchy');
    });
    it('toolbar has Apply Map button with btn--secondary class (A6)', () => {
        const applyMatch = appHtml.match(/id="btn-apply-map"[^>]*/);
        assert.ok(applyMatch, 'btn-apply-map must exist in app.html');
        assert.ok(applyMatch[0].includes('btn--secondary'), 'btn-apply-map must have btn--secondary class');
    });
});
//# sourceMappingURL=visual-tokens.test.js.map