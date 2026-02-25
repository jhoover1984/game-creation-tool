# Launch Dashboard and Entry Flow (v1-core)

Last updated: 2026-02-16
Purpose: Define first-launch and project-entry UX flow with implementation constraints.

Owner: Frontend + UX + Product
Scope: browser/desktop shell entry experience before editor workspace

Status source of truth:
- execution details: `docs/sprints/Sprint Plan.md`
- historical shipped record: `docs/CHANGELOG.md`

## Why this exists
- Current shell opens directly into a dense editor layout.
- Beginner-first goal requires a clearer first-use path and lower cognitive load.
- We need one unified launch surface that works for both new users and returning users.

## Product outcomes (must hit)
1. New user can start a playable project in under 5 minutes.
2. Returning user can reopen a recent project in under 2 clicks.
3. Beginner users are not forced to parse advanced runtime/scripting controls on first launch.

## Competitive baseline (what strong tools do)
1. Unreal Engine: project + template-first flow and custom templates.
2. Unity Hub: template categories and per-template package visibility.
3. Godot: Project Manager opens first, with create/import/play/settings.
4. GameMaker: Start Page with New/Open/Import, recent projects, setup wizard.
5. RPG Maker MZ: simple new-project path (name/location/title) and sample game generation.
6. GDevelop: examples/templates discoverable directly in product.

## GCS approach (better for our target)
### Entry states
1. `launch_dashboard` (default)
2. `editor_workspace`
3. `playtest_overlay`

### Dashboard primary actions (top section)
1. `New Project`
2. `Open Project`
3. `Continue Recent`
4. `Recover Backup`

### Dashboard secondary actions (guided section)
1. `Quick Start (10-min path)`
2. `Template Gallery` (RPG / Platformer / Puzzle / Blank)
3. `Learn by Building` walkthrough cards

### Project creation form defaults
1. Template
2. Profile (`game_boy` default)
3. UI profile (`beginner` default)
4. Project name + location
5. Optional starter content toggle (on by default)

## UX rules (non-negotiable)
1. One primary CTA above fold: `Create Project`.
2. Advanced options collapsed by default in beginner mode.
3. Every template card shows:
   - estimated time
   - difficulty
   - what is prewired (player, map, dialog, logic)
4. Dashboard always shows recoverable backups when present.
5. If no projects exist, empty state explains exactly what to do next.

## Implementation architecture (optimized)
### State boundary
- Keep a small shell route state:
  - `entryMode: "launch_dashboard" | "editor_workspace"`
- Do not mount heavy editor-only controllers while in `launch_dashboard`.

### Loading strategy
1. Use dynamic `import()` to lazy-load editor modules only when entering workspace.
2. Keep dashboard initial JS minimal.
3. Preload editor modules after first dashboard paint (idle-time only).

### Main-thread responsiveness
1. Keep launch interactions under long-task thresholds by chunking expensive work.
2. Use `requestIdleCallback` for low-priority post-render work (with timeout fallback).
3. Do not block dashboard interactions with synchronous heavy scans.

### Data and list rendering
1. Virtualize long recent-project/template lists.
2. Keep DOM size bounded (windowed rendering strategy for list-heavy surfaces).
3. Use stable keyed list rows so updates are incremental.

### Accessibility and keyboard
1. Dashboard sections must be keyboard navigable end-to-end.
2. Tab components must follow ARIA tabs pattern:
   - arrow key navigation
   - home/end behavior
   - active tab + tabpanel mapping
3. Maintain visible focus indicators and readable contrast in all themes.

### Storage robustness
1. localStorage writes are best-effort only and non-fatal.
2. Handle `QuotaExceededError` for persisted dashboard preferences/recent-state caches.

## Performance budgets (launch surface)
1. First interactive dashboard paint: <= 1000ms on reference machine.
2. New project action-to-editor-ready: <= 1500ms (starter templates), <= 2200ms (larger templates).
3. Dashboard interactions remain responsive under 50ms task windows.

## Testing requirements
### Unit/smoke
1. Route transitions (`launch_dashboard` <-> `editor_workspace`).
2. Preference persistence fallback when storage writes fail.
3. Template card metadata contract validation.

### Browser E2E
1. Fresh launch opens dashboard by default.
2. New project from dashboard reaches playable starter loop.
3. Recent project reopen in <= 2 clicks.
4. Recovery card opens restore flow.
5. Beginner mode hides advanced controls on first editor entry.

### Visual regression
1. Dashboard hero and template grid snapshot.
2. Empty state + first-run checklist snapshot.
3. Small-width layout snapshot.

## Rollout plan
### Phase A (safe scaffolding, Shipped)
1. Introduce `entryMode` route state.
2. Add static dashboard shell with no editor behavior changes.
3. Keep existing topbar/editor code path intact.

### Phase B (functional dashboard, Shipped)
1. Wire New/Open/Recent/Recover actions.
2. Wire template metadata and starter pipeline.
3. Add beginner default and guided quick start panel.
4. Shared template catalog now drives both dropdown options and template-card gallery rendering (no duplicated static card metadata).

### Phase C (optimization + polish, In Progress)
1. Dynamic import for editor module boundary.
2. Idle-time preloading and list scalability hardening (virtualization/windowing policy).
3. Final accessibility and keyboard pass.
4. Deferred init + dynamic import/code-split boundary are shipped.
5. Recent-project baseline is shipped (persist/open/sort/cap); remaining scale work is virtualization/windowing policy for larger lists.

## References
1. Unreal Engine projects/templates:
   - https://dev.epicgames.com/documentation/en-us/unreal-engine/working-with-projects-and-templates-in-unreal-engine
2. Unity Hub templates:
   - https://docs.unity3d.com/hub/manual/Templates.html
3. Godot Project Manager:
   - https://docs.godotengine.org/en/latest/tutorials/editor/project_manager.html
4. GameMaker Start Page:
   - https://manual.gamemaker.io/monthly/en/Introduction/The_Start_Page.htm
5. RPG Maker MZ project creation:
   - https://rpgmakerofficial.com/product/MZ_help-en/01_02.html
6. GDevelop examples:
   - https://github.com/GDevelopApp/GDevelop-examples
7. ARIA tabs pattern:
   - https://www.w3.org/TR/wai-aria-practices-1.2/#tabpanel
8. Long task optimization:
   - https://web.dev/articles/optimize-long-tasks
9. Code splitting and dynamic import guidance:
   - https://web.dev/learn/performance/code-split-javascript
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import
10. requestIdleCallback guidance:
   - https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
11. localStorage setItem exceptions:
   - https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem
12. List virtualization concept:
   - https://web.dev/articles/virtualize-long-lists-react-window

