# Drift Audit Checklist (Running)

Last updated: 2026-02-19

## Purpose
- Prevent drift between shipped code, tests, sprint plan, and design docs.
- Keep product claims aligned with real behavior.

Related: use `docs/reviews/Project Review Ledger (Running).md` for consolidated review findings and follow-up status; this file remains the operational audit checklist.

## When To Run
1. At each sprint checkpoint (minimum weekly).
2. Before release-tag cuts.
3. After major architecture or export pipeline changes.

## Audit Steps
1. Verify runtime contracts:
- `docs/commands/Command Surface.md` matches payloads in `apps/desktop/src/project-api.js` and `apps/desktop/src-tauri/src/invoke_api.rs`.
2. Verify type-safety gate health:
- run `cd apps/desktop && npm run typecheck`.
- confirm `apps/desktop/jsconfig.json` include set still matches high-churn modules.
3. Verify test coverage for changed behavior:
- command-level tests, frontend smoke tests, and relevant Playwright flows are present and green.
4. Verify export-lane separation:
- canonical parity lane still deterministic.
- authored export lane still validated.
5. Verify docs status labels:
- mark scope items as `Shipped`, `In Progress`, or `Planned`.
- update `docs/CHANGELOG.md`, `docs/sprints/Sprint Plan.md`, and `docs/KNOWN_ISSUES.md` as needed.

## Output Log

---
- Date: 2026-02-19
- Auditor: Codex (contract/doc consistency pass)
- Scope: Contract and command-surface docs + index/testing/review status metadata
- Drift findings:
  - `prefab_stamp` payload docs used `id` while implementation uses `prefabId`.
  - stale `Last updated` markers in running index/testing/review docs.
- Fixes applied:
  - corrected `prefab_stamp` payload shape in:
    - `docs/contracts/payload-contracts.md`
    - `docs/commands/Command Surface.md`
  - updated dates and cross-links in:
    - `docs/DOCUMENTATION_INDEX.md`
    - `docs/testing/Frontend Smoke Coverage.md`
    - `docs/reviews/Project Review Ledger (Running).md`
    - `docs/reviews/Drift Audit Checklist (Running).md`
  - recorded reconciliation in `docs/CHANGELOG.md`.
- Follow-ups:
  - run full drift checklist again after next command-surface expansion.

---
- Date: 2026-02-18
- Auditor: Claude (comprehensive doc review pass)
- Scope: All 45 docs across `docs/` and `research/` - ADRs, core docs, frontend, reviews, roadmap, scripting, sprints, testing, tooling, tutorials, research
- Drift findings:
  - Sprint Plan "Current Sprint Status" 2 milestones behind (still reading "Sprint 2 / In Progress")
  - CHANGELOG missing S3-G2, S4-UX1 entries
  - Command Surface missing `map_rename` and `import_sprite` (shipped in S4-UX1)
  - Review Ledger RF-2026-02-16-05 showing "Planned" for shipped script runtime bridge
  - Tool Capability Matrix: "Persistent state across scenes" still Planned
  - Gameplay Roadmap: S3-G2 not labeled Shipped
  - GLOSSARY missing 9 terms (Rhai, StateScope, sprite_registry, Script Graph, Event Graph, Profile, Authored Export, toast/snackbar, authored state)
  - Research doc missing required `Last updated` and `Purpose` headers
  - DOCUMENTATION_INDEX missing research doc entry
  - KNOWN_ISSUES inspector name bug not in "Resolved Recently"
  - Frontend Smoke Coverage count stale (76 vs actual 85)
- Fixes applied: All drift items above corrected in this pass. Smoke Coverage count updated separately.
- Follow-ups: Drift Audit Checklist should be run again after next sprint completion.

## Output Log Template
- Date:
- Auditor:
- Scope:
- Drift findings:
- Fixes applied:
- Follow-ups:

