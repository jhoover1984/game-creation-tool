/**
 * viewport-controller.test.ts -- UI-VIEWPORT-001
 * Tests for ViewportController zoom, pan, fit, and reset logic.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ViewportController, VIEWPORT_MIN_ZOOM, VIEWPORT_MAX_ZOOM } from './viewport-controller.js';

describe('UI-VIEWPORT-001: ViewportController', () => {
  describe('initial state', () => {
    it('starts at zoom=1, pan=(0,0)', () => {
      const vc = new ViewportController();
      assert.equal(vc.zoom, 1.0);
      assert.equal(vc.panX, 0);
      assert.equal(vc.panY, 0);
    });

    it('is not panning initially', () => {
      const vc = new ViewportController();
      assert.equal(vc.isPanning, false);
    });
  });

  describe('resetZoom', () => {
    it('resets zoom and pan to defaults', () => {
      const vc = new ViewportController();
      vc.handleWheel(-1, 0, 0); // zoom in
      vc.startPan(0, 0);
      vc.continuePan(50, 30);
      vc.endPan();
      vc.resetZoom();
      assert.equal(vc.zoom, 1.0);
      assert.equal(vc.panX, 0);
      assert.equal(vc.panY, 0);
    });
  });

  describe('handleWheel', () => {
    it('zooms in on negative deltaY', () => {
      const vc = new ViewportController();
      vc.handleWheel(-1, 0, 0);
      assert.ok(vc.zoom > 1.0, 'zoom should increase on scroll up');
    });

    it('zooms out on positive deltaY', () => {
      const vc = new ViewportController();
      vc.handleWheel(1, 0, 0);
      assert.ok(vc.zoom < 1.0, 'zoom should decrease on scroll down');
    });

    it('clamps zoom at VIEWPORT_MIN_ZOOM', () => {
      const vc = new ViewportController();
      for (let i = 0; i < 100; i++) vc.handleWheel(1, 0, 0);
      assert.equal(vc.zoom, VIEWPORT_MIN_ZOOM);
    });

    it('clamps zoom at VIEWPORT_MAX_ZOOM', () => {
      const vc = new ViewportController();
      for (let i = 0; i < 100; i++) vc.handleWheel(-1, 0, 0);
      assert.equal(vc.zoom, VIEWPORT_MAX_ZOOM);
    });

    it('zooms centered on mouse: origin stays fixed when zooming from (0,0)', () => {
      const vc = new ViewportController();
      vc.handleWheel(-1, 0, 0);
      // When zooming around (0,0), panX/Y should remain 0
      assert.equal(vc.panX, 0);
      assert.equal(vc.panY, 0);
    });

    it('adjusts pan to keep world point under cursor fixed when zooming off-center', () => {
      const vc = new ViewportController();
      const mouseX = 100;
      const mouseY = 80;
      const z0 = vc.zoom;
      vc.handleWheel(-1, mouseX, mouseY); // zoom in
      const z1 = vc.zoom;
      // World point under cursor: worldX = (mouseX - panX) / zoom
      const worldXBefore = (mouseX - 0) / z0;
      const worldXAfter = (mouseX - vc.panX) / z1;
      assert.ok(
        Math.abs(worldXBefore - worldXAfter) < 0.001,
        `world point must stay fixed under cursor: before=${worldXBefore}, after=${worldXAfter}`,
      );
    });
  });

  describe('pan', () => {
    it('startPan sets isPanning to true', () => {
      const vc = new ViewportController();
      vc.startPan(0, 0);
      assert.equal(vc.isPanning, true);
    });

    it('endPan sets isPanning to false', () => {
      const vc = new ViewportController();
      vc.startPan(0, 0);
      vc.endPan();
      assert.equal(vc.isPanning, false);
    });

    it('continuePan moves pan by drag delta', () => {
      const vc = new ViewportController();
      vc.startPan(100, 50);
      vc.continuePan(130, 80);
      assert.equal(vc.panX, 30);
      assert.equal(vc.panY, 30);
    });

    it('continuePan accumulates deltas across multiple moves', () => {
      const vc = new ViewportController();
      vc.startPan(0, 0);
      vc.continuePan(10, 5);
      vc.continuePan(20, 15);
      assert.equal(vc.panX, 20);
      assert.equal(vc.panY, 15);
    });

    it('continuePan is a no-op when not panning', () => {
      const vc = new ViewportController();
      vc.continuePan(50, 50);
      assert.equal(vc.panX, 0);
      assert.equal(vc.panY, 0);
    });
  });

  describe('fitToMap', () => {
    it('upscales and centers map when container is larger than map', () => {
      const vc = new ViewportController();
      // Container: 800x600, Map: 320x240 (fits at zoom=1)
      vc.fitToMap(800, 600, 320, 240);
      assert.equal(vc.zoom, 2.5, 'zoom should upscale to fit container');
      assert.equal(vc.panX, 0, 'map should fill width at this aspect ratio');
      assert.equal(vc.panY, 0, 'map should fill height at this aspect ratio');
    });

    it('scales down to fit large map', () => {
      const vc = new ViewportController();
      // Container: 400x300, Map: 800x600 (must scale down to fit)
      vc.fitToMap(400, 300, 800, 600);
      assert.equal(vc.zoom, 0.5, 'zoom should be 0.5 to fit 800x600 in 400x300');
      assert.equal(vc.panX, 0, 'no horizontal padding when width exactly fills');
      assert.equal(vc.panY, 0, 'no vertical padding when height exactly fills');
    });

    it('uses the smaller scale factor to fit both dimensions', () => {
      const vc = new ViewportController();
      // Container: 400x300, Map: 800x300 (constrained by width)
      vc.fitToMap(400, 300, 800, 300);
      assert.equal(vc.zoom, 0.5, 'zoom limited by width constraint');
    });

    it('centers when map does not fill container on one axis', () => {
      const vc = new ViewportController();
      // Container: 400x300, Map: 200x200 -- upscales to 1.5, centered in X
      vc.fitToMap(400, 300, 200, 200);
      assert.equal(vc.zoom, 1.5);
      assert.equal(vc.panX, 50); // (400 - 200*1.5) / 2
      assert.equal(vc.panY, 0); // (300 - 200*1.5) / 2
    });

    it('clamps fitToMap upscale at VIEWPORT_MAX_ZOOM', () => {
      const vc = new ViewportController();
      vc.fitToMap(5000, 5000, 100, 100);
      assert.equal(vc.zoom, VIEWPORT_MAX_ZOOM);
    });

    it('is a no-op for zero-size inputs', () => {
      const vc = new ViewportController();
      vc.fitToMap(0, 0, 320, 240); // zero container
      assert.equal(vc.zoom, 1.0);
      assert.equal(vc.panX, 0);
      assert.equal(vc.panY, 0);
    });

    it('startup scenario: wide window (1200x700) with default 1024x576 map upscales and centers -- UI-SHELL-POLISH-001 A4', () => {
      // Width-constrained: 1200/1024=1.171875, 700/576=1.2152... => zoom=1.171875
      const vc = new ViewportController();
      vc.fitToMap(1200, 700, 1024, 576);
      const expectedZoom = 1200 / 1024; // width is the bottleneck
      assert.ok(Math.abs(vc.zoom - expectedZoom) < 0.001, 'zoom should be width-constrained');
      assert.ok(vc.zoom > 1.0, 'map should upscale in a wide window');
      // No horizontal padding (width exactly fills); vertical centering adds positive panY
      assert.ok(Math.abs(vc.panX) < 0.001, 'no horizontal padding when limited by width');
      assert.ok(vc.panY > 0, 'vertical centering should produce positive panY');
    });

    it('startup scenario: compact window (900x500) with 1024x576 map scales down and centers horizontally -- UI-SHELL-POLISH-001 A4', () => {
      // Height-constrained: 900/1024=0.878, 500/576=0.868 => zoom=0.868...
      const vc = new ViewportController();
      vc.fitToMap(900, 500, 1024, 576);
      const expectedZoom = 500 / 576; // height is the bottleneck
      assert.ok(Math.abs(vc.zoom - expectedZoom) < 0.001, 'zoom should be height-constrained');
      assert.ok(vc.zoom < 1.0, 'map must scale down in compact window');
      assert.ok(vc.panX > 0, 'width headroom should produce positive panX for centering');
      assert.ok(Math.abs(vc.panY) < 0.001, 'height is exact fit, no vertical padding');
    });
  });

  describe('applyTransform', () => {
    it('sets transform and transform-origin on the element', () => {
      const vc = new ViewportController();
      vc.startPan(0, 0);
      vc.continuePan(20, 10);
      vc.endPan();
      const el = { style: { transform: '', transformOrigin: '' } };
      vc.applyTransform(el as unknown as HTMLElement);
      assert.match(el.style.transform, /translate\(20px, 10px\)/);
      assert.match(el.style.transform, /scale\(1\)/);
      assert.equal(el.style.transformOrigin, '0 0');
    });
  });
});
