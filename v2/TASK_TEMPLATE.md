# Task: [TITLE]

## Scope
- Files to create/modify:
  - `path/to/file1`
  - `path/to/file2`

- Non-goals (do NOT touch):
  - `path/to/unrelated/code`
  - Any unrelated UI/styling changes (unless this IS a UI task)

## Doc References (Required)
- Canonical docs used for this task:
  - `docs/roadmap/V2 Rebuild Plan.md`
  - `docs/architecture/V2 Capability Matrix.md`
  - `docs/governance/Documentation Drift Policy.md`
  - `docs/governance/AI Authoring Hygiene Policy.md`
  - `docs/contracts/V2 Compatibility Policy.md` (if boundary/serialization involved)
  - Additional domain docs:
    - `docs/[domain]/...`

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Existing tests pass (`cargo test --workspace` / `npm test`)
- [ ] New tests written and passing
- [ ] Documentation updated for any behavior/contract/architecture change
- [ ] Encoding scan clean (`npm run check:ascii -- <touched files>`) or non-ASCII justified
- [ ] Plan/context is token-efficient (scope-bounded, no pasted long doc bodies)

## Architecture and Modularity Constraints
- [ ] Change respects layer direction (`core -> contracts -> runtime -> ui`)
- [ ] No cross-layer leakage
- [ ] Files remain modular; split if file becomes too heavy
- [ ] No speculative abstractions

## Reference Impact Checklist (Required for rename/move/split)
- [ ] All imports/exports updated
- [ ] Tests updated
- [ ] Config/build paths updated
- [ ] Docs links/paths updated
- [ ] `rg`/search run to verify no stale references remain

## Context
<!-- Brief description of why this task exists and what it achieves -->

## Dependencies
<!-- What must be done before this task? What does this task unblock? -->
- Depends on: [task/PR link]
- Unblocks: [task/PR link]

## Implementation Notes
<!-- Constraints, gotchas, or legacy references -->

## Change-of-Plan Log
<!-- If you deviate from source docs, explain and link doc updates -->
- Decision:
- Why:
- Updated docs:

---

## Completion Report
<!-- Filled in by the agent after completing the task -->

### Changed Files
- `path/to/file` - what changed and why

### Test Evidence
```bash
cargo test --workspace
npm test
```

### Doc Updates
- Updated `docs/...` with ...
- Updated capability matrix / roadmap status (if applicable)

### Reference Safety Evidence
- Searches run:
- Ref updates made:
- Remaining risk: none / describe

### Issues Encountered
- None / describe blockers and decisions

