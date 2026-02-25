# V2 Documentation Index

Use this file as the entry point for all implementation work in `v2/`.

## Core Sources of Truth

1. Roadmap and delivery phases:
   - `docs/roadmap/V2 Rebuild Plan.md`
2. Current feature status by capability:
   - `docs/architecture/V2 Capability Matrix.md`
   - `docs/status/V2 Status Snapshot.md`
3. Contract and compatibility policy:
   - `docs/contracts/V2 Compatibility Policy.md`
   - `docs/contracts/SCHEMA_GUIDELINES.md`
   - `docs/contracts/SCHEMA_VERSIONING.md`
   - `docs/contracts/SEMANTIC_VALIDATION_RULES.md`
   - `docs/contracts/CANONICAL_SERIALIZATION.md`
   - `docs/contracts/PARITY_FIXTURE_MATRIX.md`
4. Documentation sync policy:
   - `docs/governance/Documentation Drift Policy.md`
   - `docs/governance/AI Authoring Hygiene Policy.md`

## Architecture and Runtime Rules

- Determinism and simulation guarantees:
  - `docs/architecture/V2 Determinism Spec.md`
- Canonical architecture boundary and rendering model:
  - `docs/architecture/V2 System Architecture.md`
- Scripting safety model:
  - `docs/security/V2 Scripting Sandbox Policy.md`
- Asset ingestion and metadata contracts:
  - `docs/assets/V2 Asset Pipeline Contract.md`

## Product and UX Behavior

- Product UX source-of-truth:
  - `docs/design/V2 Product UX Spec.md`
- Dashboard launch and project-entry UX:
  - `docs/design/V2 Dashboard UX Spec.md`
- Onboarding behavior and preferences:
  - `docs/design/V2 Onboarding Spec.md`
- Professional quality bar by workspace:
  - `docs/design/V2 Professional UX Bar.md`
- Visual language and shell constraints:
  - `docs/design/V2 Visual System.md`
- Mode and panel layout blueprint:
  - `docs/design/V2 UI Blueprint.md`
- 2D-in-3D authoring/render workflow policy:
  - `docs/design/V2 2D-in-3D Workflow Spec.md`
- Smart tooling capability policy:
  - `docs/design/V2 Smart Tooling Spec.md`
- Diagnostics/tasks canonical contract:
  - `docs/design/V2 Diagnostics and Tasks Contract.md`
- Error handling and recovery UX:
  - `docs/design/V2 Error Recovery UX.md`
- Manual set:
  - `docs/manual/Quickstart.md`
  - `docs/manual/How-To Guides.md`
  - `docs/manual/Behavior Specs.md` (BUILD-*, PLAY-*, STORY-*, UI-SELECT-*, UI-TRANSFORM-*, UI-UNDO-*, UI-TASKS-*, UI-ONBOARD-*, UI-DASH-*, UI-VISUAL-*, ANIM-CLIP-*, ANIM-ANCHOR-*, BEHAV-*, SPRITE-*, FX-*, EXPORT-*)
  - `docs/manual/Reference.md`

## Performance and Release

- Performance budgets and measurement:
  - `docs/performance/V2 Performance Budget.md`
- Execution sequencing and scope control:
  - `docs/production/V2 Production Plan.md`
- Release channel and promotion policy:
  - `docs/release/V2 Release Channel Strategy.md`

## Audits, Runbooks, and ADRs

- Legacy audit report/checklist:
  - `docs/runbooks/Legacy Audit Report.md`
  - `docs/runbooks/Legacy Audit Checklist.md`
  - `docs/runbooks/Legacy Salvage High-ROI Plan.md`
- Parity gates:
  - `docs/runbooks/Parity Gate Criteria.md`
- Solo GitHub operating workflow:
  - `docs/runbooks/GitHub Workflow (Solo).md`
- PR governance checklist:
  - `docs/runbooks/PR Governance Checklist.md`
- Manual QA checklist for UI-impact PRs:
  - `docs/runbooks/Manual QA Checklist.md`
- ADR decisions:
  - `docs/adrs/`

## Required Usage Rule

Every task must:
1. Cite governing docs in the task template.
2. Implement code to match those docs.
3. Update docs in the same change when behavior/architecture/contracts change.
