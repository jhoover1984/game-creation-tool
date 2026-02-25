# AI Agent Execution Guide - GCS v2

> Rules for AI agents (Claude, Codex, etc.) working on this codebase.

## Cross-Agent Coordination

`AGENT_STATE.md` (repo root of `v2/`) is the shared scratch pad for cross-agent handoffs.
It is NOT authoritative -- formal decisions must always land in governed docs.

Rules:
1. Read it at session start. If "Active Task" block is populated, treat it as a resume point.
2. Write your intent block (spec IDs, scope, non-goals, acceptance) BEFORE touching any file.
3. On finish: collapse to one-line "Last Completed" entry and clear Active Task block.
4. If interrupted: leave Active Task block intact with a "Stopped at:" note.

## Mandatory Workflow

1. Read the relevant docs before coding.
2. Cite those docs in the task.
3. Keep changes modular and reference-safe.
4. If strategy changes, update docs in the same task.

No task is complete until code, tests, and docs are aligned.

## Source-of-Truth Docs

Start from `docs/DOCUMENTATION_INDEX.md`.

At minimum, every task must consider:
- `docs/roadmap/V2 Rebuild Plan.md`
- `docs/architecture/V2 Capability Matrix.md`
- `docs/contracts/V2 Compatibility Policy.md` (if boundary shapes may change)
- `docs/governance/Documentation Drift Policy.md`
- `docs/governance/AI Authoring Hygiene Policy.md`

Then add domain-specific docs (performance, security, assets, design) as needed.

## Core Rules

1. Every task must define:
   - Scope files (which files you will touch)
   - Non-goals (what you will NOT do)
   - Acceptance tests (how to verify success)
   - Doc references (which source docs govern this task)

2. Stop-after-two-failed-attempts rule:
   - If a task fails twice, stop and produce a triage report
   - Report must include: what failed, what was tried, what's blocking
   - Do NOT keep retrying the same approach

3. No wandering refactor:
   - Do not "improve" code outside your task scope
   - Do not rename/move files unless required by the task
   - Do not add comments/docstrings/types to untouched areas

4. Mandatory completion report:
   - List all changed files
   - Provide test evidence (command + output)
   - List doc updates made
   - List reference-impact checks performed

## Encoding and Efficiency Rules

1. Default to ASCII text in code/docs unless non-ASCII is intentionally required.
2. Never commit smart punctuation or mojibake artifacts (for example: smart quotes, en/em dashes, arrow glyphs, or broken mojibake sequences).
3. Before PR update, run an encoding scan on touched files:
   - `cd v2`
   - `npm run check:ascii -- <touched-file-1> <touched-file-2> ...`
4. Keep task prompts/plans token-efficient:
   - reference docs by path, do not paste long doc bodies
   - keep scope file list tight
   - keep non-goals explicit
   - avoid duplicate status blocks already present in docs

## Architecture Rules

### Dependency Direction
```
packages/core/ (Rust)
    ->
packages/contracts/ (TypeScript - types only)
    ->
packages/runtime-web/ (TypeScript - browser adapter)
packages/runtime-desktop/ (Tauri - deferred)
    ->
packages/ui-editor/ (TypeScript - UI only)
```

- NEVER import from a higher layer into a lower one
- NEVER put UI logic in core or runtime
- NEVER put simulation logic in UI

### Contract Boundary
- All data crossing the Rust<->TS boundary uses types from `@gcs/contracts`
- If you need a new cross-boundary type, add it to contracts FIRST
- Changing a contract requires: contract update + docs update + tests update

### Rust Crates
- `gcs-math`: primitives only (Vec2, AABB, Transform2D)
- `gcs-collision`: depends on math, provides query API
- `gcs-physics`: depends on math + collision
- `gcs-simulation`: depends on core crates, provides movement + playtest
- `gcs-animation`: standalone, clip/transition logic

### TypeScript Packages
- `@gcs/contracts`: type definitions, zero runtime code
- `@gcs/runtime-web`: command bus, WASM bridge, canvas adapter
- `@gcs/ui-editor`: panels, workflows, user interaction

## Modularity and File-Weight Rules

- Prefer small focused modules over monolithic files.
- Split by domain (commands, state, serialization, UI panel logic, validation).
- Soft limits (exceed only with explicit reason in task notes):
  - TypeScript source file target: <= 400 lines
  - Rust source file target: <= 350 lines
- If a file grows beyond soft limit, schedule/perform extraction in-scope.

## Reference Safety Rules

Before renames/moves/splits:
1. Identify all references (`rg` search, imports, docs links, tests, configs).
2. Update references in the same task.
3. Run typecheck/tests after refactor.

Never:
- delete files unless replaced and all references are migrated,
- leave broken imports/paths for "follow-up",
- change public names without contract/migration notes.

## Change-of-Plan Rule

If implementation proves a better path than current docs:
1. Update the relevant source-of-truth docs in the same task.
2. Add short rationale in task completion report.
3. If architectural/contractural, create/update an ADR.

## Testing Rules

- Rust: `cargo test --workspace` from `v2/`
- TypeScript: `npm test` from `v2/`
- CI bundle: `npm run ci` from `v2/`
- Every new function gets at least one test
- Every bug fix gets a regression test
- Tests must be deterministic (no timing-only assertions)

## Local Editor Launch Contract

Use one standard launch path to avoid browser module-resolution drift:

1. `cd v2`
2. `npm run build`
3. `npm run serve:editor`
4. Open `http://localhost:4173/ui-editor/src/app.html`

Notes:
- Do not serve from `packages/ui-editor/src` directly.
- `app.html` depends on import-map paths that resolve from `v2/packages` root.
- Any change to `app.html`, import maps, or module entry paths must be manually smoke-tested in browser before completion.

## PR Requirements

Every PR must include:
1. Doc references used for implementation
2. Contract update (if cross-boundary types changed)
3. Test evidence
4. Roadmap/capability matrix status update (if applicable)
5. Reference-impact confirmation for renames/moves/splits
6. Encoding check evidence on touched files (`npm run check:ascii -- <touched files>`) or explicit non-ASCII justification

## PR Compliance Flow

Before opening or updating a PR:
1. Follow `docs/runbooks/PR Governance Checklist.md`.
2. Fill `.github/PULL_REQUEST_TEMPLATE.md` completely.
3. Ensure PR body includes:
   - `## Doc References`
   - `## Change-of-Plan Log`
4. Run validation:
   - `cd v2`
   - `npm run ci`

## CI Failure Rules

CI must fail if:
- Contract changed without schema/docs/tests
- Any test fails
- TypeScript strict mode errors
- Clippy warnings (Rust)

## What NOT to Do

- Do not design for speculative requirements without roadmap alignment
- Do not port legacy code without new v2 tests
- Do not modify legacy code (reference-only)
- Do not add Rhai integration until engine contracts are stable



