# Visual Design Audit 2026-02-16

Last updated: 2026-02-16
Owner: Frontend + UX
Scope: `apps/desktop/src` shell UX, design docs, external mockup intake (Gemini + Grok)

## Purpose
- Evaluate current UI against:
  - original product vision (`Design Doc Final v1.1.txt`)
  - current visual/launch docs (`docs/frontend/*`)
  - practical best-practice constraints (accessibility, responsiveness, performance, progressive disclosure)
- Recommend one best course of action (COA) that keeps sprint velocity and quality.

## Inputs Reviewed
- `Design Doc Final v1.1.txt`
- `docs/frontend/Visual Design System.md`
- `docs/frontend/Launch Dashboard and Entry Flow.md`
- `apps/desktop/src/index.html`
- `apps/desktop/src/styles.css`
- `apps/desktop/src/ui-launch-dashboard.js`
- `apps/desktop/src/ui-layout-panels.js`
- `apps/desktop/tests-e2e/smoke.spec.mjs`
- `apps/desktop/tests-e2e/visual-shell.spec.mjs`
- `docs/testing/Viewport Visual Assertion Strategy.md`
- External mockups shared in discussion (Gemini React versions + Grok React/HTML version)

## Executive Summary
- The project now has a strong visual architecture foundation: dashboard-first entry, panel collapse, right-panel tabs, beginner/builder progressive disclosure, and visual regression checks are in place.
- Main gap is not raw styling quality; it is **design-system drift + unfinished Phase C**:
  - original design doc visual language (Forge/Gemstone) diverges from current blue-token system.
  - theme/density system is specified but not fully delivered in runtime controls.
  - icon strategy is specified but not yet materially implemented in the shipped shell.
- External mockups are useful for layout and hierarchy patterns, but direct code adoption would add architecture/perf risk.

## Scorecard
- Visual coherence: `7.8/10`
- UX clarity for first-time users: `8.3/10`
- Accessibility baseline: `8.0/10`
- Responsiveness across widths: `7.5/10`
- Performance-safe styling approach: `8.4/10`
- Drift risk (docs vs implementation): `6.9/10`
- Overall: `8.0/10`

## What Is Working Well
1. Dashboard-first routing and progressive disclosure are correctly implemented and tested.
2. Workspace structure (topbar + rail + viewport + inspector/issues) is stable and practical.
3. Panel collapse and right-panel tabbing reduce cognitive load and improve laptop viability.
4. Motion is restrained and `prefers-reduced-motion` support exists.
5. Visual E2E baselines are already in place (`visual-shell.spec.mjs`), reducing polish regression risk.
6. Performance telemetry budgets for launch/workspace/playtest are integrated into CI.

## Findings (Severity Ordered)
### High
1. ~~Visual direction drift between original design doc and active design system.~~ **RESOLVED 2026-02-17.**
   - Original doc defined Forge/Gemstone system and dockable layout language.
   - Current active system uses blue-neutral tokens.
   - **Resolution**: Design Doc v1.1 updated to archive Forge/Gemstone as optional Phase D personality concept. Active blue-neutral token system (`docs/frontend/Visual Design System.md`) is now the canonical direction in both documents.

### Medium
2. Theme/density strategy is documented but only partially exposed in product controls.
   - Design system Phase C is active, but runtime UI preferences are currently profile-only (beginner/builder).
   - Risk: delayed completion of core UX promise and repetitive styling debates.
   - Evidence:
     - `docs/frontend/Visual Design System.md:149`
     - `apps/desktop/src/ui-preferences.js` (only `ui_profile` preference currently managed)

3. Icon strategy is defined but not materially implemented as a unified icon system.
   - Visual system requires one icon family and fixed sizes.
   - Current shell remains mostly text-button based.
   - Risk: reduced scanability and inconsistency if icons are later added ad hoc.
   - Evidence:
     - `docs/frontend/Visual Design System.md:84`
     - `docs/frontend/Visual Design System.md:85`

4. Layout still relies on fixed panel widths; collapse exists, but adaptive behavior can be improved.
   - Current widths are static token values with breakpoint reflow.
   - Risk: avoidable cramped workspace in mid-width windows before breakpoint transitions.
   - Evidence:
     - `apps/desktop/src/styles.css:53`
     - `apps/desktop/src/styles.css:54`
     - `apps/desktop/src/styles.css:1265`

### Low
5. Typography stack still includes platform fallback before explicit design-font intent.
   - Risk: subtle cross-machine UI inconsistency.
   - Evidence:
     - `apps/desktop/src/styles.css:63`
     - `Design Doc Final v1.1.txt:189`

## External Mockup Comparison (Gemini + Grok)
### Reuse
1. Stronger hero hierarchy and clearer CTA grouping on launch dashboard.
2. Better visual grouping of editor modes (Layout/Logic) and task identity.
3. Clearer top-level action affordances (Playtest/Export/Save) and status badges.

### Do Not Copy Directly
1. React/Tailwind/Framer replatform patterns while current shell is modular vanilla JS.
2. Heavy blur/glow/noise and high animation density from concept mockups.
3. Fixed-width panel assumptions without collapse + responsive adaptation.
4. Placeholder media-heavy surfaces that do not improve production workflows.

## Best-Practice Alignment
### Already aligned
1. Progressive disclosure (`Beginner` vs `Builder`) and dashboard-first entry.
2. ARIA tab keyboard support and focus-visible strategy.
3. Reduced-motion support.
4. Selector-stable visual regression snapshots.

### Needs completion
1. Theme and density controls as first-class runtime settings.
2. One icon family and icon sizing policy implemented in the live shell.
3. Mid-width workspace ergonomics with fewer fixed-width pressure points.
4. Drift-control contract between original design doc and active visual system docs.

## COA Options
### COA-A: Replatform UI to React + motion-heavy style
- Pros: rapid concept fidelity to mockups.
- Cons: major architecture churn, perf risk, test rewrite churn.
- Decision: **Reject for current sprint window**.

### COA-B: Big visual-overhaul branch now
- Pros: immediate cosmetic jump.
- Cons: high integration risk against active map/playtest/export hardening.
- Decision: **Defer**.

### COA-C: Incremental, performance-first visual convergence (Recommended)
- Keep current modular shell.
- Apply mockup ideas selectively as token/component updates.
- Complete Phase C and lock design decisions before Phase D personality pass.
- Decision: **Adopt**.

## Recommended COA (C) - Execution Plan
### Sprint slice 1 (now)
1. ~~Finalize visual source-of-truth policy~~ **DONE 2026-02-17**:
   - active visual language lives in `docs/frontend/Visual Design System.md`
   - Forge/Gemstone marked as archived in Design Doc v1.1 (section 9).
2. Implement runtime theme + density controls in preferences controller.
3. Add visual regression snapshots for:
   - dark/light/high-contrast shell
   - comfortable/compact density
   - dashboard at small-width.

### Sprint slice 2
1. Introduce single icon family in topbar/rail/issues severity affordances.
2. Improve mid-width layout ergonomics:
   - adaptive panel widths (tokenized) + collapse defaults based on width.
3. Tighten typography consistency to declared UI font stack.

### Sprint slice 3
1. Add restrained personality pass (Phase D) behind stable performance gates.
2. Keep viewport-first hierarchy; no decorative effect that harms map readability.

## Acceptance Criteria For COA-C
1. Theme + density controls are user-accessible and persisted safely.
2. Visual E2E suite includes theme/density/dashboard width variants.
3. One icon family is used consistently across primary UI controls.
4. No regression in playtest/map/edit workflows or perf-budget gates.
5. Design docs and implemented token system are explicitly aligned.

## Recommended Priority Mapping
1. `P1` Visual consistency lock and icon standardization.
2. `P1` Theme/density Phase C completion.
3. `P1` Dashboard scalability and mid-width ergonomics.
4. `P2` Phase D personality polish after functional stability.
