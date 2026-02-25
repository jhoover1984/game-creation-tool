# Viewport Visual Assertion Strategy

Last updated: 2026-02-16
Purpose: Define visual parity assertion method and thresholds for viewport/export checks.

Status: In Progress (Phase 1 shipped, Phase 2 partially shipped)

## Goal
- Detect renderer regressions in playtest viewport output using deterministic checks.
- Keep assertions stable across machines and CI.

## Current Approach (Phase 1)
1. Use browser E2E (`Playwright`) to render a known scene setup.
2. Sample controlled pixels from `#playtest-viewport` canvas via `getImageData`.
3. Assert semantic expectations (for example: tile pixel is not base background color).
4. Validate sampled pixels against deterministic expected signatures produced by shared viewport signature logic.

Implemented baseline:
- `apps/desktop/tests-e2e/smoke.spec.mjs`
  - `playtest viewport scene signature includes background, tile, and entity samples`
- `apps/desktop/tests/viewport-parity.test.mjs`
  - `preview and export signatures match for golden viewport scenes`
- `apps/desktop/tests-e2e/export-parity.spec.mjs`
  - `export preview artifact is pixel-exact for golden scenes`

## Why Pixel Sampling First
- Lower maintenance than full screenshot baselines.
- More deterministic under minor anti-aliasing/environment variation.
- Good early warning signal while renderer is still evolving.

## Next Phase (Phase 2)
1. Add fixed-scene visual signature assertions:
   - multiple sample points (tile/entity/background regions)
   - expected palette bucket checks
2. Add optional screenshot snapshots for stable milestone builds.
3. Expand assertions beyond canonical parity scenes to authored export lanes and theme/density surfaces.

## Stability Rules
1. Avoid timing-sensitive assertions; pause playtest before sampling when possible.
2. Sample pixels in core map regions away from overlay text.
3. Keep expected values tied to profile palette and deterministic scene setup.

