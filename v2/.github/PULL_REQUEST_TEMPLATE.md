# Summary
- What changed:
- Why:

## Scope
- In-scope files:
- Non-goals:

## Doc References
- Governing docs used for this change:
  - `docs/roadmap/V2 Rebuild Plan.md`
  - `docs/architecture/V2 Capability Matrix.md`
  - `docs/governance/Documentation Drift Policy.md`
  - `docs/contracts/V2 Compatibility Policy.md` (if boundary/serialization touched)
  - Additional docs:

## Change-of-Plan Log
- If implementation differed from source docs, describe:
  - Decision:
  - Why:
  - Updated docs/ADR links:
- If no deviation, write: `No change of plan.`

## Contracts Impact
- [ ] No cross-boundary/contract changes
- [ ] Contract changed and updated in `packages/contracts`
- [ ] Rust serde/aliases updated for compatibility
- [ ] Compatibility notes added in docs

## Testing Evidence
- Commands run:
  - `cargo test --workspace`
  - `npm test`
  - `npm run ci`
- Result summary:

## Reference Safety Checklist
- [ ] Imports/exports updated
- [ ] Paths/links/config references updated
- [ ] Tests updated for moved/renamed code
- [ ] Search run for stale references (e.g. `rg`)

## Risks / Follow-ups
- Known risks:
- Follow-up tasks/issues:
