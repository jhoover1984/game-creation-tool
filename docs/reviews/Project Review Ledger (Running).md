# Project Review Ledger (Running)

Last updated: 2026-02-19

## Purpose
- Keep one canonical place for external/internal review outcomes and follow-up status.
- Reduce duplication across one-off review files.

## Status Source Of Truth
- Active execution and ownership: `docs/sprints/Sprint Plan.md`
- Open user-impacting risks: `docs/KNOWN_ISSUES.md`
- Shipped/closed work: `docs/CHANGELOG.md`

## How To Use
1. Add each new review as a dated entry in `Review Entries`.
2. Add actionable items to `Active Follow-Ups` with owner + target sprint.
3. Close items here only after they are reflected in sprint/changelog/known-issues docs.

## Active Follow-Ups
| ID | Topic | Status | Owner | Target |
| --- | --- | --- | --- | --- |
| RF-2026-02-16-01 | Script Lab visual audio-routing controls (move from textarea-first metadata to guided UI) | Shipped (Audio Routing section in Script tab with event picker, clip input, binding list, manual+inferred merge at export) | Frontend + Scripting | Sprint 2/3 bridge |
| RF-2026-02-16-02 | Theme/density rollout completion and visual-regression breadth | Completed (baseline + responsive coverage shipped) | Frontend + QA | Sprint 3 |
| RF-2026-02-16-03 | Native desktop-shell E2E breadth in CI | Planned | Tooling + QA | Sprint 3+ |
| RF-2026-02-16-04 | Authored export lane parity: export user-authored map/entity data (not canonical-only scenes) | Shipped (save_project persists editor-state.json; open_project restores entities/tiles; export uses current authored state by default) | Export + Runtime | Sprint 3 |
| RF-2026-02-16-05 | Script runtime execution bridge after validation scaffold (Event Graph/Rhai runtime path) | Shipped | Scripting + Runtime | Sprint 2 extension |
| RF-2026-02-16-06 | Launch dashboard scale hardening: recent-project list UX + virtualization fallback policy | In Progress (recent-list baseline shipped; virtualization policy pending) | Frontend + UX | Sprint 3 |
| RF-2026-02-16-07 | Visual consistency lock: one icon family + accent/semantic contrast validation pass | Planned | Frontend + UX | Sprint 3 |
| RF-2026-02-16-08 | Changelog readability split: concise external release summary + detailed internal log | Planned | Docs + Product | Sprint 3 |
| RF-2026-02-16-09 | Visual-direction reconciliation: align original design-doc theme model with active visual system source of truth | Planned | UX + Docs + Frontend | Sprint 3 |
| RF-2026-02-16-10 | Scene/level system: scene-switching UI, per-scene entity/tile editing, scene-aware export pipeline | Shipped (core scope + scene-switching UI with add/remove/switch in left panel) | Runtime + Frontend | Sprint 3 |
| RF-2026-02-16-11 | Collision + components: collision diagnostics overlay, component editing UI | Shipped (core scope + playtest wiring + component inspector in right panel showing collision/sprite/movement/velocity) | Runtime + Frontend | Sprint 3 |
| RF-2026-02-16-12 | Gameplay systems integration: Phase 1 (tile properties, movement, input, physics) complete. Phase 2 (camera, persistent state, prefabs, transitions) next | Phase 1 Complete | Runtime + Engine | Sprint 3 |

## Priority Queue (External Review Consolidation)
### P0
- Authored export lane parity (RF-2026-02-16-04):
  - Current export parity is strong for canonical profile scenes, but external reviews correctly call out the product gap for real authored projects.
  - Requirement: authored map/entity/script state must be the default "what you build is what ships" export lane.

### P1
- Script runtime bridge beyond validation scaffold (RF-2026-02-16-05).
- Dashboard scaling and recent-project experience (RF-2026-02-16-06).
- Visual system consistency lock (RF-2026-02-16-07).
- Visual-direction reconciliation across docs and implementation (RF-2026-02-16-09).
- Existing open asset pipeline completion from `docs/KNOWN_ISSUES.md` remains in P1.

### P2
- Changelog readability/public-facing release-note layer (RF-2026-02-16-08).
- Dashboard marketing polish (hero demo loop) after core interaction and performance gates stay stable.

## Review Entries
### 2026-02-19 - Contract/Doc Surface Reconciliation
- Synced prefab command contract docs with implemented invoke/frontend payload shape:
  - `prefab_stamp` documented as `{ "prefabId": string, "x": number, "y": number }` in:
    - `docs/contracts/payload-contracts.md`
    - `docs/commands/Command Surface.md`
- Updated documentation navigation and status metadata:
  - `docs/DOCUMENTATION_INDEX.md` refreshed date and contracts link.
  - `docs/testing/Frontend Smoke Coverage.md` refreshed date.
  - `docs/reviews/Drift Audit Checklist (Running).md` refreshed date.
- Added changelog trace entry for this docs reconciliation in `docs/CHANGELOG.md`.

### 2026-02-16 - Dashboard Recents Hardening Follow-through
- Landed baseline implementation and tests for returning-user dashboard recents:
  - persisted + rendered recent projects in launch dashboard.
  - recency ordering (`updatedAt`) with bounded cap (8 entries).
  - stable selector strategy for primary Open action (`#dashboard-action-open`) to avoid role-name ambiguity.
  - smoke regression includes reopen and cap/sort behavior.
- Remaining work for `RF-2026-02-16-06`:
  - explicit virtualization/windowing policy for significantly larger recent lists and stress/perf validation.

### 2026-02-16 - Full Visual Design Audit (Best COA)
Source: `docs/reviews/Visual Design Audit 2026-02-16.md`
- Completed end-to-end visual audit across:
  - original design spec,
  - active visual/launch docs,
  - current shell/CSS implementation,
  - visual/UX E2E coverage,
  - external mockup intake.
- Recommended COA: incremental, performance-first visual convergence in the current modular shell (no frontend replatform).
- Key accepted actions:
  - complete Phase C theme/density runtime controls and visual-regression coverage.
  - finalize one icon-family strategy and semantic/accent contrast checks.
  - align visual source-of-truth language across docs (`RF-2026-02-16-09`).

### 2026-02-16 - External Gemini Risk Registry Intake
Source: user-shared Gemini review summary (2026-02-16 discussion)
- Confirmed valid risk themes:
  - JSON-first snapshot pressure under high-frequency inspector/debug flows.
  - launch-performance and dashboard-list scaling risk.
  - script execution/runtime bridge still missing from "playable game" promise.
  - export maturity gap between canonical parity scenes and full authored gameplay export.
- Net-new tracked follow-ups created:
  - authored export lane parity (`RF-2026-02-16-04`)
  - script runtime execution bridge (`RF-2026-02-16-05`)
  - dashboard scaling/recent projects hardening (`RF-2026-02-16-06`)
- Not adopted as urgent/P0 from Gemini intake:
  - immediate binary-inspector-bridge rewrite. Current command-bus + typed/checkJs hardening remains sufficient for active sprint scope; binary lane stays planned, benchmark-gated.

### 2026-02-16 - External Grok Documentation/UX Intake
Source: user-shared Grok review summary (2026-02-16 discussion)
- Strong alignment with current architecture direction:
  - invariants quality, beginner-first North Star, and scope discipline.
- Actionable additions accepted:
  - lock single icon family and validate profile-accent contrast boundaries (`RF-2026-02-16-07`).
  - improve changelog scanability via concise release-summary layer (`RF-2026-02-16-08`).
  - keep scripting profile-transition UX explicit (Beginner -> Builder -> Pro) inside existing scripting UX docs.

### 2026-02-16 - Mockup Intake (Gemini React + Grok HTML/CSS)
Source: user-shared visual mockup snippets (2026-02-16 discussion)
- Reusable positives for GCS:
  - dashboard-first entry with strong template cards and clear primary CTA.
  - compact left-rail + focused viewport + right-inspector triad is directionally correct.
  - persistent save/playtest affordances and beginner/advanced mode toggle are useful patterns.
- Risks/anti-patterns to avoid copying:
  - generic "engine UI clone" styling that dilutes profile-constrained identity.
  - oversized fixed sidebars without collapse rules (hurts laptop-width editing).
  - static placeholder media and decorative noise that does not improve task completion.
  - framework mismatch: React/Tailwind mockup is fine for ideation, but direct port would conflict with current vanilla modular shell unless migration is explicitly planned.
- Implementation stance:
  - adopt layout and workflow ideas into existing Visual Design + Launch Dashboard plans.
  - do not replatform frontend solely to match mockup tech.

### 2026-02-16 - Documentation Consolidation Pass
- Consolidated review tracking to this running ledger.
- Kept legacy review docs as archived references with pointer to this file.
- Aligned index/standards docs to prefer canonical status sources and avoid duplicate status narratives.

### 2026-02-15 - Documentation Readability Audit
Source: `docs/reviews/Documentation Readability Audit 2026-02-15.md`
- Improved metadata consistency and readability in key docs.
- Reinforced single-source status model and update hygiene.

### 2026-02-14 - External Claude Review Action Plan
Source: `docs/reviews/Claude Review Action Plan.md`
- Converted major external findings into explicit engineering actions.
- Most P0/P1 hardening items from this wave are now shipped and reflected in sprint/changelog history.

## Archived Reference Docs
- `docs/reviews/Claude Review Action Plan.md`
- `docs/reviews/Documentation Readability Audit 2026-02-15.md`
- `docs/reviews/Drift Audit Checklist (Running).md` (kept active as an operational checklist)
