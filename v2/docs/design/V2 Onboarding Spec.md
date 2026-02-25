# V2 Onboarding Spec

Status: Planned (V2 staged), optional and skippable by design.

## Purpose
Provide guided onboarding that accelerates first success without blocking expert workflows.

## Onboarding Modes
1. First-run dashboard onboarding:
   - Welcome actions and template guidance.
2. In-editor checklist:
   - Small dismissible checklist for first playable path.
3. Context tips:
   - Lightweight workspace tips on first entry.
4. Guided tour overlay:
   - Explicit opt-in only.

## Preferences
1. `onboarding.showDashboardOnLaunch` (default: true)
2. `onboarding.showFirstRunTips` (default: true)
3. `onboarding.showProjectChecklist` (default: true)
4. `onboarding.enableGuidedTourOverlays` (default: true)
5. `onboarding.mode` (`beginner` | `pro`, default: `beginner`)
6. `onboarding.openLastProjectOnLaunch` (default: false)

## Behavior Rules
1. Onboarding is always skippable.
2. Onboarding never blocks paint/place/play/save/export actions.
3. Checklist progression is event-driven, not manual-only.
4. "Reset onboarding" action must clear onboarding state safely.

## Beginner vs Pro Mode
1. Beginner:
   - Advanced controls collapsed.
   - Recipe/task recommendations visible.
2. Pro:
   - Full control surface visible.
   - Guidance minimized.

## Tasks Integration
1. Checklist steps should reuse diagnostics/tasks where possible.
2. Shared codes and task targets prevent duplicate logic.
3. "Go" actions should navigate to relevant panel/tool deterministically.
