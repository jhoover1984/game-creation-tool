# Game Creator Studio

Workspace scaffold initialized from `Design Doc Final v1.1.txt`.

## What We Are Building
- A beginner-first 2D game creation tool with retro profile constraints (starting with Game Boy profile targets).
- North Star outcome: a user can create and export a playable HTML5 game in under 10 minutes from a blank project.
- Core guardrails from `Design Doc Final v1.1.txt`:
  - Preview behavior must match exported behavior.
  - Every edit must be undoable.
  - Project save/load must be crash-safe and migration-safe.
- First-run UX baseline now includes starter-template bootstrapping (`RPG`, `Platformer`, `Puzzle`, `Blank`) from the topbar `New` flow.

## Start Here
- Full docs map: `docs/DOCUMENTATION_INDEX.md`
- Documentation standards: `docs/DOCUMENTATION_STANDARDS.md`
- Active sprint and execution status: `docs/sprints/Sprint Plan.md`
- System map: `docs/ARCHITECTURE_OVERVIEW.md`
- Core test expectations: `docs/testing/Test Strategy.md`
- Current risks: `docs/KNOWN_ISSUES.md`
- Change history: `docs/CHANGELOG.md`

## Workspace Layout
- `apps/desktop`: Tauri + frontend shell
  - includes desktop service layer and editor runtime/session scaffolds
  - includes invoke-style command gateway for frontend-compatible command names
- `crates/command-core`: command bus primitives (command stack, undo/redo, batching)
- `crates/project-core`: project format, save/migrate/validate
- `crates/engine-core`: simulation/render runtime core
  - includes initial map editor state + command-driven entity operations
- `crates/export-core`: export packaging and checks
- `crates/script-core`: scripting graph IR and validation foundation (scaffold)
- `tests/golden-projects`: compatibility/parity fixtures
- `tools/scripts`: automation scripts

## Test Commands
- Run frontend shell locally (current static server path): `cd apps/desktop && node scripts/static-server.mjs` then open `http://127.0.0.1:4173`
- Note: `npm run dev` currently points to a placeholder scaffold script.
- Rust workspace: `cargo test`
- Desktop frontend smoke tests: `cd apps/desktop && npm test`
- Desktop frontend lint: `cd apps/desktop && npm run lint`
- Desktop frontend format check: `cd apps/desktop && npm run format:check`
- Desktop browser E2E: `cd apps/desktop && npm run test:e2e`
- Native preview export artifact build: `cd apps/desktop && npm run build:export:preview:native`
- Native NES preview export artifact build: `cd apps/desktop && npm run build:export:preview:nes`

CI bootstrap PR
