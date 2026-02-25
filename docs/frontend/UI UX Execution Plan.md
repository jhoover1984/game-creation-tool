# UI UX Execution Plan (v1-core)

Last updated: 2026-02-16
Owner: Frontend + UX + QA
Scope: `v1-core` desktop/web shell

## Purpose
- Convert UX strategy into implementation-ready slices that improve flow, productivity, and beginner clarity.
- Keep UI changes aligned with runtime reliability and test gates.
- Provide one prioritized plan for what to ship now vs later.

Status source of truth:
- active execution queue: `docs/sprints/Sprint Plan.md`
- active risks and follow-ups: `docs/KNOWN_ISSUES.md`
- historical shipped record: `docs/CHANGELOG.md`

## North Star UX Outcomes
1. New user reaches first meaningful action in under 30 seconds.
2. Beginner can complete the create -> edit -> playtest -> export-preview loop in under 10 minutes.
3. Common edit actions (select, paint, move, undo, playtest) are reachable in at most two interactions.
4. UI stays responsive under normal workloads (no sustained interaction stalls).

## Prioritized Plan (Best COA)
### P0: Entry clarity and workspace simplicity
1. Dashboard-first flow remains default:
   - Primary CTA: `Create Project`
   - Secondary actions: `Open`, `Continue Recent`, `Recover`
2. Beginner-first workspace information architecture:
   - Left rail exposes only essential lanes in beginner mode.
   - Right panel favors `Selection` and `Issues` first; advanced controls are progressive.
3. Preserve one consistent action system:
   - Primary interactions use `--accent` (blue), not profile flavor colors.
   - Profile accents remain decorative/supportive only.

### P1: Productivity and speed
1. Keyboard-first productivity:
   - stable shortcuts for select/paint/erase/playtest/undo/redo.
2. Command discoverability:
   - command palette and recent actions path (phased).
3. Constraint-aware helpers:
   - issues panel should offer one clear, safe recovery action where possible.

### P1: Accessibility and readability
1. Contrast and legibility:
   - body text >= 4.5:1 target.
   - improve small label/meta text readability in rails and inspector.
2. Operability:
   - visible focus states and keyboard path for top-level actions.
   - pointer controls meet minimum hit target policy.
3. Reduced complexity:
   - beginner mode hides complexity without blocking core outcomes.

### P1: Performance-aware UX
1. Keep dashboard/editor interactions responsive under normal usage.
2. Scale list surfaces safely:
   - recents baseline is shipped (sort/cap/open).
   - next: virtualization/windowing policy for larger lists.
3. Defer expensive non-critical rendering until needed.

### P2: Visual personality and brand polish
1. Adopt strong, modern dark theme direction from approved mockups.
2. Add personality after interaction quality is stable.
3. Avoid decorative surfaces that reduce scan speed or accessibility.

## Mockup Intake Decisions (Adopt / Adjust / Defer)
### Adopt now
1. Canvas-first editor composition (left workflow rail, center viewport, right inspector).
2. Dashboard with one dominant primary action and clear secondary actions.
3. Strong section hierarchy and cleaner spacing rhythm.

### Adjust before implementation
1. Color semantics:
   - keep yellow out of global primary action role.
   - reserve yellow for profile flavor/highlight and status accents.
2. Beginner information load:
   - reduce visible hierarchy depth and advanced controls at startup.
3. Inspector density:
   - default to concise sections; advanced fields via progressive disclosure.

### Defer (post-v1-core)
1. Real-time collaboration/share-heavy surfaces.
2. Persistent large "generate build" treatment as primary workspace chrome.
3. Non-essential decorative motion and branding effects.

## Delivery Slices
1. Slice A: Dashboard readability and CTA hierarchy cleanup.
2. Slice B: Workspace rail/inspector simplification for beginner mode.
3. Slice C: Accessibility pass (contrast, focus, keyboard path, hit targets).
4. Slice D: Performance pass (list scaling policy + expensive panel deferral).
5. Slice E: Personality pass (optional, non-blocking).

Each slice must be independently test-gated and releasable.

## Required Validation Gates For UX Changes
1. `cd apps/desktop && npm run lint`
2. `cd apps/desktop && npm run typecheck`
3. `cd apps/desktop && npm test`
4. `cd apps/desktop && npm run test:e2e:smoke`
5. `cd apps/desktop && npm run test:e2e:visual`

## Definition Of Done (UX Slice)
1. Meets the slice acceptance criteria in this plan and visual system rules.
2. No regression in map edit/playtest loops.
3. Beginner mode still enforces progressive disclosure.
4. Docs updated:
   - `docs/CHANGELOG.md`
   - `docs/sprints/Sprint Plan.md`
   - `docs/KNOWN_ISSUES.md` (if risk status changed)

## Out Of Scope For This Plan
1. Replatforming frontend stack.
2. Rewriting runtime architecture for visual-only goals.
3. Expanding v1 scope into multiplayer/cloud ecosystem features.

## References
1. Nielsen Norman Group - Ten Usability Heuristics:
   - https://www.nngroup.com/articles/ten-usability-heuristics/
2. Nielsen Norman Group - Progressive Disclosure:
   - https://www.nngroup.com/articles/progressive-disclosure/
3. WCAG 2.2 - Target Size Minimum:
   - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
4. WCAG 2.2 - Dragging Movements:
   - https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
5. web.dev - Optimize Interaction to Next Paint (INP):
   - https://web.dev/articles/optimize-inp
6. Unity Hub template entry patterns:
   - https://docs.unity3d.com/hub/manual/Templates.html
7. Godot Project Manager entry patterns:
   - https://docs.godotengine.org/en/latest/tutorials/editor/project_manager.html
