# GitHub Workflow (Solo)

Last updated: 2026-02-25
Purpose: Define the default Git/GitHub workflow for a solo maintainer so local velocity stays high while `main` remains protected.

## Scope
- Applies to all work in this repository.
- Primary audience: repository owner and AI coding agents.
- This runbook defines process only (not product requirements).

## Branch Model
- `main`: protected branch, merge by PR only.
- `legacy-reference`: archived reference branch, no active feature work.
- Session branch format: `session/YYYY-MM-DD-<topic>` or `feature/<topic>`.

## Protection Baseline
Use lightweight protection suitable for solo development:
1. Require pull request before merging into `main`.
2. Require status checks to pass (`verify`).
3. Block force pushes and deletions on `main`.
4. Approval count may be `0` for solo mode.

## Default Session Workflow
1. Start from `main`:
   - `git checkout main`
   - `git pull`
2. Create one branch for the full work session:
   - `git checkout -b session/YYYY-MM-DD-<topic>`
3. Do all coding locally first (no mid-session PR churn).
4. Run gates once near end of session:
   - `cd v2 && npx tsc --build`
   - `cd v2 && npm test`
   - `cd v2 && npm run check:ascii -- <touched-files>`
5. Commit and push once:
   - `git add .`
   - `git commit -m "<session summary>"`
   - `git push -u origin <branch>`
6. Open one PR to `main` and merge after `verify` passes.

## PR Policy (Two Levels)
Use the PR template and choose one level:
- `Light`: docs/chore/refactor/non-UI behavior changes.
- `Full QA`: UI/layout/interaction/playtest UX changes.

`Full QA` requires the completed `docs/runbooks/Manual QA Checklist.md` + screenshots.
`Light` requires command evidence only.

## Required PR Sections
PR body must include:
- `## Doc References`
- `## Change-of-Plan Log`

## Manual QA Trigger Rules
Run manual browser QA when any of these change:
- Shell layout or navigation
- Canvas framing/viewport behavior
- Inspector rendering or panel visibility
- Playtest controls/HUD presentation

## AI Agent Operating Rules
1. Prefer local implementation first; batch changes into one PR at end of session.
2. Do not push directly to `main`.
3. Keep changes scope-bounded; avoid unrelated cleanup in same PR.
4. Update governed docs in same PR when behavior/spec status changes:
   - `v2/docs/status/V2 Status Snapshot.md`
   - `v2/docs/architecture/V2 Capability Matrix.md`
   - relevant design doc(s)
5. Report gate outputs in PR Testing Evidence.

## Recovery / Common Issues
- Push rejected on `main`:
  - Expected under protection. Create branch and PR.
- Required check missing in rules UI:
  - Ensure `verify` has run green on `main` at least once.
- Branch deletion fails:
  - Confirm branch is not targeted by a wildcard protection rule.
- CRLF/LF warning on Windows:
  - Non-blocking; proceed unless repository policy says otherwise.

## Quick Command Block
```powershell
git checkout main
git pull
git checkout -b session/YYYY-MM-DD-topic
# ...work...
cd v2
npx tsc --build
npm test
npm run check:ascii -- <touched-files>
cd ..
git add .
git commit -m "session: <topic summary>"
git push -u origin session/YYYY-MM-DD-topic
```

## References
- `docs/runbooks/PR Governance Checklist.md`
- `docs/runbooks/Manual QA Checklist.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml`
