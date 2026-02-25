# Documentation Standards

Last updated: 2026-02-20

## Purpose
- Keep docs easy to follow for both new users and contributors.
- Keep planning, implementation, and testing docs synchronized with shipped behavior.
- Prevent implementation-vs-doc drift over time.

## Required Header Fields
Every actively maintained doc should include:
1. Title (`# ...`)
2. `Last updated: YYYY-MM-DD`
3. A clear purpose (`## Purpose` section or a concise `Purpose:` line near the top)

## Structure Rules
1. Put summary/context first, details later.
2. Use explicit section names (`Purpose`, `Current Status`, `Next Steps`, `References`).
3. Prefer short bullets over long paragraphs for operational docs.
4. Keep one source-of-truth per topic:
- Sprint execution status: `docs/sprints/Sprint Plan.md`
- Test strategy and coverage intent: `docs/testing/Test Strategy.md`
- Known active risks: `docs/KNOWN_ISSUES.md`
- Change history: `docs/CHANGELOG.md`
5. If a non-canonical doc includes status notes, add a one-line "Status source of truth" link block pointing to the relevant canonical docs.

## Quality Rules
1. Do not leave stale "not implemented" statements after features ship.
2. Update docs in the same change where behavior/contracts change.
3. Avoid duplicate instructions across multiple docs; link to the source doc.
4. Keep terminology consistent with `docs/GLOSSARY.md`.
5. Prefer readable line lengths (target < 160 chars); split overloaded table rows into short rows plus notes when needed.
6. If a document exceeds ~300 lines, add a quick navigation/read-order section near the top.
7. Roadmap/sprint-facing docs should label major items with delivery status (`Shipped`, `In Progress`, `Planned`) to reduce expectation drift.
8. Avoid contradictory status wording across docs (for example "in progress" in one doc and "complete" in another); update both docs in the same change.

## Update Checklist (Per Feature Or Fix)
1. Update `docs/CHANGELOG.md`.
2. Update `docs/sprints/Sprint Plan.md` progress/tasks.
3. Update `docs/KNOWN_ISSUES.md` when adding/fixing notable risks.
4. Update test docs if coverage or required commands changed.
5. Update `Last updated` on any modified doc.

## No-Drift Governance (Required)
1. Treat docs as contracts: behavior/API/shape changes are incomplete until docs and tests are updated.
2. Use canonical owners:
- Contract and payload shapes: `docs/contracts/payload-contracts.md`
- Command surface and dispatch names: `docs/commands/Command Surface.md`
- Feature status and sequence: `docs/sprints/Sprint Plan.md`
3. Avoid duplicate canonical definitions. Link to canonical docs instead of re-describing schemas in multiple places.
4. Use additive evolution for payloads/schemas whenever possible (`schema_version`, migration notes, deprecation windows).
5. Add ADRs for major architectural choices to preserve intent over time (runtime boundaries, simulation model, wasm parity policy).
6. Keep implementation modular:
- Engine/runtime logic in core crates
- Transport/invoke contract at API boundary
- UI behavior in controllers
- Docs mirror these boundaries
7. Feature-flag incomplete features to avoid partial behavior leaking into stable workflows.

## PR Quality Gate (Required)
For any behavior/contract change, PR must include:
1. Implementation updates.
2. Test updates (unit/integration/e2e as applicable).
3. Documentation updates in canonical files.
4. A changelog entry.
5. If contracts changed: explicit note in PR description describing backward compatibility/migration.

## Automation Expectations
CI should fail when:
1. Canonical docs are missing required headers (`# Title`, `Last updated`, `## Purpose`).
2. Contract docs are changed without corresponding tests.
3. Command surface and invoke command list diverge.
4. Documentation index contains broken/missing canonical links.

## Linking Conventions
1. Prefer workspace-relative paths (for example `docs/testing/Test Strategy.md`).
2. Use exact file names for docs with spaces/parentheses.
3. Group links by category rather than one long flat list.
