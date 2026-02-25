# V2 Dashboard UX Spec

Status: Planned (V2 staged), beginner-first and non-blocking.

## Purpose
Define the launch/dashboard surface so beginners can start quickly and returning users can resume work immediately.

## Entry Rules
1. If `onboarding.openLastProjectOnLaunch=true` and last project is valid, open editor directly.
2. Otherwise show Dashboard.
3. Dashboard is always reachable from a Home action in shell.

## Core Sections
1. Recents:
   - Project name
   - Last-opened timestamp
   - Health badge (`ready`, `warnings`, `needs_fixes`)
   - Actions: `open`, `repair`, `export` (when eligible)
2. Start:
   - `New Project`
   - `Open Project`
   - `Open Sample`
   - Template cards (top-down, side-scroller, tactics, blank)
3. Learn:
   - Start Here checklist
   - Optional guided tour entry
   - Docs/help links

## Health Badge Rules
1. Health is computed from diagnostics metadata.
2. Use metadata-first scan on dashboard load; deep scan only on explicit repair.
3. `repair` opens project and focuses Tasks panel.

## Non-Blocking UX Rules
1. Dashboard must not block project opening.
2. Checklist and tour are dismissible.
3. "Do not show again" preference is always visible.

## Performance Guardrails
1. Dashboard initial render target: <= 500ms on warm start.
2. Recents list should be virtualized once item count exceeds threshold.
3. Thumbnail generation is lazy and cached.
4. Background scans are throttled and cancelable.
