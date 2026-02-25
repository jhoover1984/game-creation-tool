# Claude Review Action Plan (Second Pass)

Last updated: 2026-02-16
Status: Archived reference (consolidated into `docs/reviews/Project Review Ledger (Running).md`)
Source input: external full-repo review summary shared in sprint thread.

## Purpose
- Convert external review findings into explicit engineering actions.
- Keep decisions visible: `Accept`, `Accept with scope tweak`, or `Track for later`.

## Priority Decisions
| Finding | Decision | Owner | Target Sprint |
| --- | --- | --- | --- |
| `script-core` missing cycle detection | Accept (P0) | Engine | Sprint 2 hardening |
| `event-bus` listener isolation missing | Accept (P0) | Frontend | Sprint 2 hardening |
| `app-state` async error handling gaps | Accept (P0) | Frontend | Sprint 2 hardening |
| `project-api` parse hardening | Accept (P0) | Frontend | Sprint 2 hardening |
| `editor_runtime` trace buffer `Vec::remove(0)` | Accept (P1) | Engine | Sprint 2 hardening |
| `editor_runtime.rs` lacks direct tests | Accept (P0) | Engine | Sprint 2 hardening |
| Dev static server traversal hygiene | Accept (P1, dev-only) | Tooling | Sprint 2 hardening |
| `ui-shell.js` monolith scaling risk | Accept with staged refactor | Frontend | Sprint 3+ |
| Frontend global error boundary absent | Accept (P0 UX trust) | Frontend | Sprint 2 hardening |
| First-5-minutes onboarding leverage | Accept (product priority) | Product + UX | Sprint 3/5 |

## Hardening Wave 1 (Execution Checklist)
1. Script correctness:
- Add cycle detection in `script-core` graph validation.
- Add empty-node-id and duplicate-edge validation.

2. Frontend resilience:
- Add guarded async action wrapper in `app-state.js`.
- Isolate event listener failures in `event-bus.js`.
- Add safe parse wrappers in `project-api.js`.
- Add top-level error capture/reporting strategy for UI shell.

3. Runtime robustness:
- Convert trace ring behavior to `VecDeque`.
- Add direct tests for `editor_runtime.rs` state machine behavior.

4. Testing and CI:
- Add frontend error-path tests (IPC failures, malformed payloads, handler throw isolation).
- Add runtime tests for breakpoints/tick/trace budgets.

## Product / UX Actions (Game-Creation Focus)
1. First 5 minutes:
- Add starter project templates (`Top-Down RPG`, `Platformer`, `Puzzle`, `Blank`).
- Add guided "Make it playable" checklist flow.

2. Beginner scripting:
- Keep template-first Event Graph workflow.
- Expand one-click behavior drops (NPC talk, chest open, trigger quest).

3. Diagnostics UX:
- Keep Issues Drawer as primary recovery surface.
- Promote actionable one-click fixes over passive warnings.

## Scope Notes
- We are intentionally not introducing multi-language scripting runtime in v1.
- We are intentionally not taking on full frontend framework migration in Sprint 2.
- 2D-first scope remains locked for v1; 3D evolution remains planned in roadmap docs.
