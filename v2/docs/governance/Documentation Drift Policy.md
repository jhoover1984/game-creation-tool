# Documentation Drift Policy

## Purpose
Ensure code and docs remain synchronized.

## PR Governance (Required)
All PRs must include:
1. `## Doc References`
2. `## Change-of-Plan Log`

Template path:
- `.github/PULL_REQUEST_TEMPLATE.md`

CI enforcement:
- `.github/workflows/ci.yml` validates both sections on pull requests.

## Required Updates
A PR must update documentation when it changes:
1. Contracts
2. User-visible behavior
3. Architecture boundaries
4. Build, test, or release process
5. UI layout/mode behavior or visual system rules

## Enforcement
1. Task templates must include doc references.
2. Completion reports must list docs touched.
3. CI contract check enforces docs/tests for contract changes.
4. PR body must include doc-governance sections.
5. Behavior/contract/validation changes must update status docs:
   - `docs/architecture/V2 Capability Matrix.md` and/or
   - `docs/status/V2 Status Snapshot.md`
6. Architecture/UI/production changes must update the canonical docs:
   - `docs/architecture/V2 System Architecture.md`
   - `docs/design/V2 Product UX Spec.md`
   - `docs/design/V2 Visual System.md`
   - `docs/design/V2 UI Blueprint.md`
   - `docs/production/V2 Production Plan.md`
7. Encoding and authoring hygiene must follow:
   - `docs/governance/AI Authoring Hygiene Policy.md`

## Minimum Hygiene Checks Per PR
1. Encoding scan completed on touched files:
   - `cd v2`
   - `npm run check:ascii -- <touched-file-1> <touched-file-2> ...`
2. Any intentional non-ASCII usage is justified in PR notes.
3. AI task context is path-referenced and scope-bounded (no large pasted doc blocks).

## Exceptions
Exception requires explicit note in PR with follow-up issue ID.

