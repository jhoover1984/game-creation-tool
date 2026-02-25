# Frontend Smoke Coverage Matrix

Last updated: 2026-02-19

Purpose: Track frontend smoke and E2E coverage scope, status, and remaining gaps.

## Suites
- `apps/desktop/tests/app-state.test.mjs`
- `apps/desktop/tests/project-api.test.mjs`
- `apps/desktop/tests/ui-debug-helpers.test.mjs`
- `apps/desktop/tests/ui-entity-list.test.mjs`
- `apps/desktop/tests/ui-health-issues.test.mjs`
- `apps/desktop/tests/ui-perf-metrics.test.mjs`
- `apps/desktop/tests/ui-breakpoints.test.mjs`
- `apps/desktop/tests/ui-assisted-guardrail.test.mjs`
- `apps/desktop/tests/ui-shell-entry.test.mjs`
- `apps/desktop/tests/ui-shell-events.test.mjs`
- `apps/desktop/tests/ui-shell-lifecycle.test.mjs`
- `apps/desktop/tests/ui-shell-log.test.mjs`
- `apps/desktop/tests/ui-shell-bootstrap-elements.test.mjs`
- `apps/desktop/tests/ui-shell-elements.test.mjs`
- `apps/desktop/tests/ui-shell-module-bundle.test.mjs`
- `apps/desktop/tests/ui-shell-render.test.mjs`
- `apps/desktop/tests/ui-shell-runtime.test.mjs`
- `apps/desktop/tests/ui-shell-status.test.mjs`
- `apps/desktop/tests/ui-workspace-bindings.test.mjs`
- `apps/desktop/tests/ui-workspace-bootstrap.test.mjs`
- `apps/desktop/tests/viewport-parity.test.mjs`
- `apps/desktop/tests/export-artifact-parity.test.mjs`
- `apps/desktop/tests/ui-dashboard-recents.test.mjs`
- `apps/desktop/tests/ui-issues-recovery.test.mjs`
- `apps/desktop/tests/ui-event-graph.test.mjs` (15 tests: ENTITY_TEMPLATES data, renderGraph, template apply, addRule, dispose - S4-EG1)
- `apps/desktop/tests/ui-toast.test.mjs` *(planned - ui-toast.js added in S4-UX1, test suite not yet written)*
- `apps/desktop/tests-e2e/smoke.spec.mjs` (browser-level, Playwright)
- `apps/desktop/tests-e2e/desktop-runtime.spec.mjs` (browser-level desktop invoke variant, Playwright)
- `apps/desktop/tests-e2e/export-parity.spec.mjs` (browser-level export artifact pixel parity, Playwright)
- `apps/desktop/tests-e2e/authored-export.spec.mjs` (browser-level authored export asset-load assertions, Playwright)
- `apps/desktop/tests-e2e/authored-export-profiles.spec.mjs` (browser-level authored export profile-lane asset/viewport assertions, Playwright)
- `apps/desktop/tests-e2e/visual-shell.spec.mjs` (browser-level visual baseline snapshots, Playwright)

## Coverage Map
| Area | Scenario | Status | Test |
| --- | --- | --- | --- |
| Map | Open project and initialize state | Covered | `app-state map workflow remains stable` |
| Map | Add entity + selection | Covered | `app-state map workflow remains stable` |
| Map | Move entity + undo/redo | Covered | `app-state map workflow remains stable` |
| Map | New starter template resets map and seeds starter entities/tiles | Covered | `app-state new project template resets map and seeds starter content` |
| Map | Entity list row formatting is deterministic for empty and selected states | Covered | `ui-entity-list.test.mjs` |
| App Resilience | Health summary + issue aggregation is deterministic for missing and warning states | Covered | `ui-health-issues.test.mjs` |
| App Resilience | Entry-mode transitions and one-shot idle preload scheduling remain deterministic | Covered | `ui-shell-entry.test.mjs` |
| App Resilience | Workspace bootstrap orchestration composes controllers and binds init lifecycle deterministically | Covered | `ui-workspace-bootstrap.test.mjs` |
| App Resilience | Help-tour step sequence and bootstrap element-map contracts remain deterministic | Covered | `ui-shell-bootstrap-elements.test.mjs` |
| App Resilience | Shell DOM element query contracts and grouped control maps remain deterministic | Covered | `ui-shell-elements.test.mjs` |
| App Resilience | Editor module bundle loading is memoized and preload marks are emitted once per session | Covered | `ui-shell-module-bundle.test.mjs` |
| App Resilience | Editor-workspace render orchestration updates shell fields and delegates render fan-out deterministically | Covered | `ui-shell-render.test.mjs` |
| App Resilience | Shell runtime wiring toggles playtest correctly, delegates breakpoints, and disposes controller lists safely | Covered | `ui-shell-runtime.test.mjs` |
| App Resilience | Breakpoint-kind toggling remains deterministic and rerenders after successful apply | Covered | `ui-breakpoints.test.mjs` |
| App Resilience | Assisted guardrail fallback/delegation remains deterministic when recovery controller is unavailable | Covered | `ui-assisted-guardrail.test.mjs` |
| App Resilience | Shell log line formatting remains deterministic for status/error output | Covered | `ui-shell-log.test.mjs` |
| App Resilience | Workspace selection/name-input derivation remains deterministic for click and change handlers | Covered | `ui-workspace-bindings.test.mjs` |
| Tiles | Paint + erase tile | Covered | `app-state tile workflow supports paint and erase` |
| Tiles | Brush sweep undoes as one action | Covered | `app-state tile stroke is undoable in a single step` |
| Playtest | Enter/exit lifecycle | Covered | `app-state playtest workflow includes breakpoints and watch buckets` |
| Playtest | Trace toggle + tick | Covered | `app-state playtest workflow includes breakpoints and watch buckets` |
| Breakpoints | Configure breakpoints and pause on hit | Covered | `app-state playtest workflow includes breakpoints and watch buckets` |
| Breakpoints | Disable breakpoints keeps running | Covered | `project-api fallback keeps playtest running when breakpoints are disabled` |
| Watch Data | Flags/variables/inventory payload shape | Covered | `project-api fallback returns stable editor state contract` |
| Watch Data | Selected-entity watch bucket payload shape | Covered | `app-state map workflow remains stable` |
| Contract | Breakpoint metadata shape | Covered | `project-api fallback breakpoint path pauses playtest and emits hit` |
| Contract | Desktop runtime invoke bridge path (`invoke_command`) | Covered | `project-api uses tauri invoke_command bridge when desktop runtime is available` |
| Contract | Desktop runtime backend errors are surfaced (no silent fallback) | Covered | `project-api surfaces backend errors when tauri runtime is available` |
| Contract | Script graph validation fallback + desktop bridge path | Covered | `project-api script validation fallback reports missing nodes`, `project-api routes script validation through tauri invoke bridge` |
| Contract | `map_reset` clears fallback editor authored state | Covered | `project-api fallback map_reset clears authored entities and tiles` |
| Contract | Malformed desktop JSON responses fail with explicit parse errors | Covered | `project-api rejects malformed JSON response for editor_state`, `project-api rejects malformed JSON response for script_validate` |
| Contract | Export invoke payload forwards optional `projectDir` for authored asset discovery | Covered | `project-api export payload forwards optional projectDir to invoke bridge` |
| App Resilience | Async command failure is captured without throw in app-state | Covered | `app-state captures async command errors without throwing` |
| App Resilience | Non-guarded runtime failures can be surfaced through centralized `app:error` channel | Covered | `app-state reportError emits app:error for non-guarded runtime failures` |
| App Resilience | Event bus isolates failing listeners | Covered | `event-bus isolates failing handlers and continues sibling delivery` |
| App Resilience | Shell event wiring routes playtest/project/error side-effects without duplicate status logs | Covered | `ui-shell-events.test.mjs` |
| App Resilience | Shell lifecycle boundary forwards global error/unhandled-rejection and supports unload teardown | Covered | `ui-shell-lifecycle.test.mjs` |
| App Resilience | Shell status model maps play/edit snapshot state to deterministic control/HUD labels | Covered | `ui-shell-status.test.mjs` |
| Perf Instrumentation | Perf metrics controller publishes initial dashboard/workspace metric surface | Covered | `ui-perf-metrics.test.mjs` |
| Perf Instrumentation | Perf marks update deltas and preserve first preload source semantics | Covered | `ui-perf-metrics.test.mjs` |
| Browser E2E | Global `window:error` path surfaces runtime error in Issues Drawer/log | Covered | `smoke.spec.mjs` (`global window error is surfaced in issues drawer`) |
| Browser E2E | Global `window:unhandledrejection` path surfaces runtime error in Issues Drawer/log | Covered | `smoke.spec.mjs` (`unhandled rejection is surfaced in issues drawer`) |
| Browser E2E | Runtime errors surface recovery-action controls in Issues Drawer | Covered | `smoke.spec.mjs` (`global window error is surfaced in issues drawer`) |
| Parity | Preview/export golden-scene signature parity | Covered | `viewport-parity.test.mjs` |
| Parity | Preview vs exported signature artifact drift check (file-based) | Covered | `export-artifact-parity.test.mjs` |
| Trace Dock UI | Filter chip and event-kind filter logic | Partial | `ui-debug-helpers.test.mjs` (logic-level, non-DOM) |
| Browser E2E | Shell load + add entity flow | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Runtime mode badge shows fallback `Web Mode` in browser context | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Fresh launch defaults to launch dashboard route | Covered | `tests-e2e/smoke.spec.mjs` (`shell loads and map entity create flow works`) |
| Browser E2E | Dashboard New/Open/Recent/Recover actions route correctly | Covered | `tests-e2e/smoke.spec.mjs` (`dashboard continue and recover actions enter workspace`; dashboard `Open`/`New` paths covered by shell/template tests) |
| Browser E2E | Dashboard template card selection applies expected project bootstrap path | Covered | `tests-e2e/smoke.spec.mjs` (`dashboard template cards and beginner default drive first project setup`) |
| Browser E2E | Launch/workspace perf metrics probe contract (`window.__gcsPerfMetrics`) | Covered | `tests-e2e/smoke.spec.mjs` (`launch and workspace expose performance metrics probes`) |
| Browser E2E | Starter template chooser seeds expected first-run map content | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Quick Start checklist progresses to completion through starter workflow | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Quick Start checklist exposes actionable buttons for pending steps | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Quick Start hint text updates to reflect next pending step | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Assisted primitive generator creates profile-aware starter prop + tile footprint | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Draw Studio seed draft controls (offset/mirror/preview) generate transformed profile-aware primitives to map | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Draw Studio draft presets (`Cluster`/`Line`/`Ring`) update preview before apply | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Draw Studio preset manager saves custom preset, reapplies it, and exports JSON payload | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Draw Studio preset manager copy action supports clipboard/fallback share behavior | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Draw Studio exported preset JSON includes portability schema metadata (`schema_id`, `schema_version`) | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Draw Studio preset import conflict resolution creates non-overwriting suffixed custom preset | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Draw Studio preset import warnings surface in Issues Drawer with severity tags and can be dismissed | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Draw Studio mini-canvas per-tile toggles update draft preview and applied tile footprint | Partial | Manual QA (running doc) + explicit draft-point unit coverage |
| Browser E2E | Assisted primitive near-limit guardrail appears in Issues Drawer/onboarding hint | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Assisted guardrail actions switch profile and clean generated props | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | UI profile toggle hides/reveals advanced controls for beginner vs builder mode | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Guided walkthrough starts and advances through quick-start steps | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Guided walkthrough completion shows next-action controls (`Playtest` / `Export Preview` / `Start Over`) | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Guided walkthrough completion action controls execute expected flows (`Playtest`, `Export Preview`, `Start Over`) | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | In-app Help overlay switches between Map and Playtest guidance | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Help guided tour advances step-by-step and highlights target controls | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Help guided tour `Do It` action advances to next step and updates focus target | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Help guided tour completion summary exposes quick actions | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Playtest breakpoint pause flow | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Move selected command updates coordinates | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Entity drag pipeline commits coordinate changes (deterministic pointer events) | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Entity drag pipeline commits move via deterministic pointer-event dispatch | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Tool/playtest hotkeys (`B/E/V`, `F5`, `Esc`) | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Viewport multi-point scene signature assertion | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Multi-tab state isolation (same browser context) | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Playtest viewport zoom preset scaling | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Script Lab validation surfaces graph errors in summary + Issues Drawer | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Script Lab template apply/save flow | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Script issue auto-fix CTA visibility (`missing_target_node`) | Covered | `tests-e2e/smoke.spec.mjs` |
| Browser E2E | Desktop runtime invoke path (`window.__TAURI__` -> `invoke_command`) | Covered | `tests-e2e/desktop-runtime.spec.mjs` |
| Browser E2E | Packaged HTML export artifact pixel-exact parity for golden scenes | Covered | `tests-e2e/export-parity.spec.mjs` |
| Browser E2E | Export artifact metadata contract (`profile`, `mode`, `scene_count`) | Covered | `tests-e2e/export-parity.spec.mjs` |
| Browser E2E | Export bundle manifest contract (`bundle.json` entrypoint/runtime/scenes/metadata) | Covered | `tests-e2e/export-parity.spec.mjs` |
| Browser E2E | Export assets manifest contract (`assets/manifest.json` schema/profile/asset_count) | Covered | `tests-e2e/export-parity.spec.mjs` |
| Browser E2E | Export profile viewport contract (`game_boy`/`nes`/`snes` -> width/height) | Covered | `tests-e2e/export-parity.spec.mjs` |
| Browser E2E | Authored export sample artifact emits non-zero asset manifest, includes starter-pack source/path entries, and runtime loads packaged assets | Covered | `tests-e2e/authored-export.spec.mjs` |
| Browser E2E | Authored export supports all profile lanes (`game_boy`/`nes`/`snes`) with profile-correct viewport + non-zero packaged assets + runtime load path | Covered | `tests-e2e/authored-export-profiles.spec.mjs` |
| Browser E2E Visual | Topbar + canvas shell screenshot baseline | Covered | `tests-e2e/visual-shell.spec.mjs` |
| Browser E2E Visual | Issues Drawer severity-row screenshot baseline | Covered | `tests-e2e/visual-shell.spec.mjs` |

## Current Gaps
- Full real-shell Tauri E2E (native desktop runtime execution in CI) is not yet automated.
- Native export-core parity currently validates profile-aware preview fixture bundles; production gameplay export breadth is still pending.

## Runtime CI Gate
- Native runtime feature verification is now automated in CI:
  - `cargo check -p gcs-desktop --features tauri-runtime`
  - tauri-runtime invoke smoke (`invoke editor_state`)

## Next Additions
1. Expand native export-core parity coverage from preview fixtures to production profile bundles.
2. Add native Tauri shell E2E execution path in CI to complement browser desktop-runtime bridge coverage.
3. Add browser assertions for debug/release export mode metadata and profile-specific constraints.




