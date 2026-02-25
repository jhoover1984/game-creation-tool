# PR Governance Checklist

Use this checklist before opening or updating a PR.

## Required PR Sections
- `## Doc References`
- `## Change-of-Plan Log`

If missing, CI will fail.

## Required Validation
1. Contracts changed:
   - Update contracts package.
   - Update compatibility docs.
   - Update tests.
2. Behavior/architecture changed:
   - Update relevant docs in the same PR.
3. Rename/move/split:
   - Update imports/paths/docs/tests.
   - Run search to verify no stale references remain.
4. Encoding and hygiene:
   - Run non-ASCII scan on touched files.
   - If non-ASCII is intentional, justify in PR.
   - Keep PR/task context path-referenced and scope-bounded.

## Suggested Commands
```bash
cd v2
npm run ci
npm run check:ascii -- <touched-file-1> <touched-file-2> ...
```

