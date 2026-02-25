# Project Parking Note

Last updated: 2026-02-25
Branch: park/v2-stable-2026-02-25

## Current Status
- UI shell/playtest movement path was repaired so runtime snapshot positions now drive canvas render during playtest.
- Manual QA run artifacts exist under `v2/docs/qa/runs/` and `v2/docs/qa/evidence/`.
- Follow-up UX/movement work is in progress in `v2/packages/ui-editor/src/`.

## What Is Stable
- Build and test gates were previously green on the latest movement/render fixes.
- Branch protections and CI workflow are configured.
- QA runbook/process exists and is being used.

## Known Open Items
- Additional UX follow-ups (movement ergonomics, inspector behavior, polish) still need verification.
- Current working tree includes generated `dist/` outputs and test build info files from local runs.

## Resume Checklist
1. Checkout this branch:
   - `git checkout park/v2-stable-2026-02-25`
2. Install deps and run gates:
   - `cd v2`
   - `npm install`
   - `npx tsc --build`
   - `npm test`
3. Re-run targeted manual QA from the latest run file:
   - `v2/docs/qa/runs/qa-run-2026-02-25-ux-followups-6c1fdca.md`
4. Update docs if results changed:
   - `v2/docs/status/V2 Status Snapshot.md`
   - `v2/AGENT_STATE.md`

## Pivot Option
If pausing this repo for C++ learning, keep this branch as the parking baseline and do new C++ work in a separate repository.
