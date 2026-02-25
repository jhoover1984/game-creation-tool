# V2 Visual System

Status: Locked (V2 baseline), with Planned extensions marked.

## Intent
Deliver a calm, readable, production-capable editor UI that scales from beginner to advanced users.

## Visual Foundations (Locked)
1. Theme support:
   - Dark and light themes.
   - Accessibility contrast targets.
2. Density support:
   - Comfort and dense layouts.
3. Stable shell composition:
   - Top bar
   - Left mode rail
   - Center canvas
   - Right inspector
   - Bottom utility tabs
4. Token-driven styling:
   - Color/spacing/typography/radius/motion values must come from shared token definitions.

## Interaction Clarity (Locked)
1. Strong visual hierarchy for primary actions (playtest, save, fix task).
2. Consistent feedback for selection, validation, and errors.
3. Tasks and warnings are actionable, not passive logs.

## Pixel + HD Preview Policy (Locked)
1. Pixel mode prioritizes readability and snapping consistency.
2. HD mode allows richer passes while preserving authored intent.
3. Both modes must consume the same canonical scene data.

## Planned (Post-V2)
1. Advanced visual debug overlays for flow/lighting domains.
2. Additional design tokens for broader branding variations.
3. Dashboard visual refinement and onboarding polish layers.

## References
1. `docs/design/V2 Product UX Spec.md`
2. `docs/design/V2 UI Blueprint.md`
3. `docs/design/V2 Visual System Tokens.md`
4. `docs/design/V2 Dashboard UX Spec.md`
5. `docs/design/V2 Onboarding Spec.md`
6. `docs/performance/V2 Performance Budget.md`
