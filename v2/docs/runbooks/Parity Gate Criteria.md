# Parity Gate Criteria -- v1 Archival

> v1 code is archived (read-only `legacy-reference`) only when ALL gates below pass.

## Immediate (Now)
- [x] Tag current state as `legacy-reference` (freeze, read-only)
- [x] Create v2/ alongside existing code

## Gate 1: Authoring MVP PASS (2026-02-20)
- [x] v2 can create/save/load projects
- [x] v2 has tile paint/erase on at least one layer
- [x] v2 has entity create/select/move/delete
- [x] v2 has undo/redo for all authoring operations
- [x] Full authoring loop smoke test passes (13 TS tests + 12 Rust tests)

## Gate 2: Playtest MVP PASS (2026-02-20)
- [x] v2 playtest enters/exits/pauses correctly
- [x] Movement works (grid + free mode)
- [x] Collision v1 (AABB solid tile + entity checks)
- [x] Physics-lite (gravity + friction + velocity)
- [x] Simulation smoke tests pass (36 Rust + 26 TS)

## Gate 3: Animation MVP PASS (2026-02-20)
- [x] Clip playback (loop/once/pingpong)
- [x] Transitions fire on conditions (onComplete/onTrigger/onThreshold)
- [x] Minimal animation studio UI (animation-studio.html)
- [x] Animation state tests pass (44 Rust + 36 TS)

## Gate 4: Stability (in progress -- 2026-02-20)
- [x] CI pipeline stable (Rust check/test/clippy + TS typecheck/test, all green)
- [x] No P0 bugs open (0 known issues)
- [ ] v2 smoke test suite green for 1+ week (timer starts 2026-02-20)

## Gate 5: Documentation PASS (2026-02-20)
- [x] Migration README exists for team (`docs/MIGRATION.md`)
- [x] v1 features mapped: ported / deferred / dropped (in MIGRATION.md)
- [x] All v2 ADRs up to date (ADR-V2-001, -002, -003 reviewed)

## Archival Process
When all gates pass:
1. Final `legacy-reference` tag on v1 code
2. Move v1 code to `archive/v1/` directory
3. Promote `v2/` contents to repo root
4. Update CI to drop v1 paths
5. Update project MEMORY.md and CLAUDE.md
