# Tool Capability Matrix (Running Doc)

Last updated: 2026-02-16
Purpose: track current and planned capabilities per tool, with quality/usability/future-proofing bars.

## How To Use This
- Add new feature ideas as rows under the relevant tool.
- Keep `v1` focused: mark non-essential items as `v1+`.
- Every row should eventually map to a sprint task and acceptance criteria.

## Status Legend
- `Shipped`: implemented and tested.
- `In Progress`: partially implemented in active sprint.
- `Planned`: accepted but not implemented.
- `Backlog`: optional or deferred.

## Cross-Tool Workflow Accelerators
| Capability | Why It Matters | Target | Status |
|---|---|---|---|
| Command Palette (intent-first) | Reduces menu hunting for all users | v1 | Planned |
| Issues Drawer with one-click fixes | Converts errors into guided recovery | v1 | In Progress |
| Global Find + Find References | Scale usability on real projects | v1 | Planned |
| Profile modes (Beginner/Builder/Pro) | Progressive disclosure without splitting engine | v1 | Planned |
| Unified controls contract | Muscle memory across Map/Draw/Animation | v1 | In Progress |
| Pre-export doctor/lint | Catch failures before export | v1 | Planned |

## Help & Docs
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Built-in Help panel | Searchable, context-aware, local-first | Help entries keyed by stable tool/action IDs | Planned |
| Quick Start checklist | Guides North Star flow in-app | Checklist items should map to telemetry-safe completion events | Planned |
| Context help links from Issues Drawer | Fixes discoverability for beginners | Tie links to error taxonomy IDs | Planned |
| Learn-by-building walkthrough projects | Users learn by shipping a small playable result | Step definitions should be data-driven and completion-checked | Planned |
| Clone-style guided tutorials (Zelda-like, Chrono-style, platformer room) | Teaches practical workflows, not abstract docs | Keep content legally safe: mechanics/style patterns, no copyrighted assets | Planned |
| Command/help search (single box) | One entry point for actions + docs | Reuse command palette index pipeline | Backlog |

## Performance & Hardware Settings
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Auto performance mode | Works without manual tuning | Use adaptive defaults; store per-machine | Planned |
| Render scale + FPS caps | Predictable perf controls | Keep settings out of project portability layer | Planned |
| Low-end mode preset | One-click stability profile | Bundle conservative defaults for integrated GPUs | Planned |
| Perf HUD (frame/update/drop) | Quick diagnosis during playtest | Optional overlay, disabled by default | Planned |

## Dashboard / Project Hub
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Recent projects + New/Open/Import | Starts in under 2 clicks | Add pinned projects + workspace templates | In Progress |
| Project title binding (topbar reflects actual project name) | Title bar shows real project name, not hardcoded placeholder | Bind to project manifest `projectName` field | Shipped |
| Project health summary | Clear severity + direct action | Keep error taxonomy stable for migrations | In Progress |
| Recovery/backup entry points | Safe restore with confirmation | Extend to timeline restore in v1+ | In Progress |
| First-run guided flow | 10-minute North Star path | Keep tutorial content data-driven | In Progress |
| Starter game templates | User sees playable loop in first 5 minutes | Include RPG/platformer/puzzle + blank templates | In Progress |
| Guided "Make It Playable" checklist | New users finish core loop without docs hunting | Should connect to tool hints and issue fixes | In Progress |

## Map Editor
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Select/move/delete entities | Consistent undo/redo and clear selection states | Command-bus-only mutations | Shipped |
| Tile paint/erase | Grid-accurate, fast, undoable | Keep tile ops batchable for fill/brush tools | Shipped |
| Marquee multi-select | Natural box-select behavior | Reuse for Draw/Animation canvases | Shipped |
| Drag paint/erase strokes | No gaps at fast pointer speed | Use interpolation and chunked command entries | Shipped |
| Smart-drop templates | Place + auto-attach defaults | Template schema should be versioned | Planned |
| Rule-based auto-tiling (terrain/wang-style) | Faster map authoring with fewer manual fixes | Keep rules data-driven + profile-aware | Planned |
| Data layers (collision/quest/spawn) | Separates gameplay data from visuals | Needed for robust quest/debug tooling | Planned |
| Tile property registry (solid flag) | Collision/movement need to distinguish solid vs walkable tiles | Default-solid convention; registry keyed by TileId | Shipped |
| Tile palette picker UI | Visual tile selection for map painting (not ID-based) | Profile-aware palette with preview | Shipped |
| Export UI panel | Users need a frontend surface to trigger and configure export | Wire to existing `export_preview_html5` backend | Shipped |
| Playtest enter/exit loop | One-click test from map context | Maintain Preview=Export parity hooks | Shipped |

## Gameplay Systems (Engine-Core)
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Movement system (3 modes: GridSnap, FreeMove, TurnBased) | Frame-exact determinism across modes | Semantic movement API; mode-agnostic collision integration | Shipped |
| Input action mapping (8 actions) | Profile-default keybindings with remapping | Physical keys → semantic actions; decoupled from movement/scripting | Shipped |
| Velocity / physics step (gravity, friction) | Top-down (gravity=0) and platformer presets | Collision response zeros velocity on solid contact | Shipped |
| Camera following system (Fixed, Follow, Lerp) | Deadzone + bounds clamping | Camera is playtest-only; export uses full-scene render | Planned |
| Persistent state across scenes (global vs scene-local) | Backward-compatible scope separation | Existing flags/vars default to global scope | Shipped |
| Entity prefab / template system | Reusable templates with per-instance overrides | Editor-only state initially; project schema deferred | Planned |
| Screen transitions (fade, wipe) | Tick-driven progress with frontend overlay | Script node ChangeScene gains optional transition field | Planned |
| Runtime entity spawning (projectiles, collectibles) | Script-graph-driven spawn/despawn | PlaytestEntityPool for cleanup on exit | Planned |
| Animation state machine (frame-based) | All loop modes (Loop, Once, PingPong) | State transitions fire script events | Planned |
| Game UI layer / HUD (health bars, score, dialog) | Variable-bound overlays rendered as separate pass | Shared render function for Preview=Export parity | Planned |
| Structured game database (items, enemies, skills) | Editable data tables for RPG-style content (cf. RPG Maker) | Data-driven schema; migration-safe | Planned |
| Built-in SFX generator | Retro sound synthesis (cf. PICO-8/TIC-80) | Profile-aware audio budgets | Backlog |

## Draw Studio (Pixel Art)
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Core drawing tools | Precise pixel behavior and predictable hotkeys | Share canvas-control contract | Planned |
| Palette/profile limits | Warnings before blockers | Keep profile policy centralized | Planned |
| Timeline + onion skin | Clear frame workflow | Reuse timeline primitives with Animation Lab | Planned |
| Quick ops (replace/flip/nudge) | One-step operations, one undo entry | Use batch commands for large edits | Backlog |
| GIF import -> frame extraction | Fast ingestion with preview/trim/fps | Deterministic sheet output + metadata schema | Planned |
| Procedural primitive generator (tree/bush/rock/crate/chest) | Gives non-artists usable starter assets fast | Local deterministic generator in Quick Start + Draw Studio Seed with profile variants, presets, and import/export-safe preset payloads | In Progress |
| Starter asset packs per profile (Game Boy/NES/SNES) | Users can start with recognizable production-style assets, not placeholders | Keep packs license-safe, versioned, and swappable by style packs in v1+ | Planned |
| Seed style pass (recognizable silhouettes + shading rules) | Generated chest/tree/bush/rock should read clearly at 1x and 4x | Profile-aware pixel templates with deterministic output; no random noise blocks | Planned |
| Character/NPC sprite generator | Gives non-artists usable character sprites fast (complement to environment Seed) | Profile-aware pixel templates with direction variants | Planned |
| Prompt-assisted starter asset generation (opt-in) | Plain-language path for beginners who cannot draw | Deterministic template mapper first; optional external model later | Backlog |

### Draw Studio Seed Implementation Notes
- Supports Game Boy, NES, and SNES profile variants with near-limit guardrails.
- Includes quick presets (Cluster, Line, Ring) plus custom preset save/apply/delete/copy/import/export flows.
- Provides editable draft controls (offset, mirror, preview) and deterministic import conflict handling.
- Preset payloads are schema-versioned for safe migration across releases.
- Starter baseline contents/quality expectations are defined in `docs/tooling/Starter Asset Pack Spec.md`.

## Animation Lab
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Sprite sheet import/extract | Predictable frame slicing | Import config should be serializable | Planned |
| Timeline + playback loop | Real-time preview with stable FPS | Shared timeline engine across tools | Planned |
| Direction mirroring helpers | Fast 2D directional setup | Keep deterministic transform ops | Planned |
| Duplicate-frame removal | Cleaner animation timelines | Deterministic heuristics + undoable operation | Backlog |
| Profile-aware palette remap | Keeps outputs valid for active profile | Reuse central profile constraint engine | Backlog |

## Narrative & Quest (Story Maker Scope)
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Dialog graph + screenplay view | Easy branch authoring for beginners | Store as stable IR + migration support | Planned |
| Quest state model | Explicit lifecycle (`not_started/active/completed/failed`) | Extensible enum + migration-safe defaults | Planned |
| Conditions/triggers/actions blocks | Clear cause/effect and debugging | Plugin hooks for custom actions in v1+ | Planned |
| Preview-from-here simulation | Fast validation of branches | Deterministic replay inputs for tests | Planned |
| Dead-end/unreachable checks | Prevent broken quest paths | Lint rule pack should be data-driven | Planned |

## Audio
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Import + category mix + preview | Low-friction basic audio workflow | Preserve metadata schema for later DAW features | Planned |
| Loop + volume controls | Immediate auditory feedback | Keep mixer model compatible with expansion | Planned |
| Gameplay audio bindings (event -> clip) | Deterministic SFX/music triggers from authored logic paths | Runtime supports metadata-driven bindings; Script Lab visual audio routing UI shipped | Shipped |
| Music states and transitions | Beginner-friendly adaptive music authoring | Keep state graph compatible with quest/combat triggers | Planned |
| Retro profile audio budgets | Warn before export blockers | Constraint checks should run during authoring, not only export | Planned |
| Advanced sequencing/tracker | Deferred to v1+ | Likely separate module to avoid v1 bloat | Backlog |

## Scripting & Logic
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Event Graph (no-code first) | Deterministic, beginner-readable flow | Versioned IR with migration support | Shipped |
| Event node library taxonomy | Clear `Event/Condition/Action/Flow` groups with typed ports and search | Prevents monolithic node sprawl as feature count grows | In Progress |
| Rhai expression/action escape hatch | Adds pro power without breaking beginner UX | Restrict host API to safe command/action registry | Planned |
| Behavior-on-drop templates | Core interactions work immediately after placement | Prewire NPC/chest/trigger patterns with editable params | Shipped |
| Subgraphs/state-machine mode | Handles nuanced gameplay without giant unreadable graphs | Reusable graph functions + scoped variables (`global/map/entity/quest`) | Planned |
| Script validator + lint | Actionable messages mapped to node IDs | Issue taxonomy aligned with Issues Drawer fixes | Shipped |
| Deterministic script replay tests | Same result in playtest and export | Golden logic fixtures in CI | Planned |
| Script performance budget guards | Prevent frame hitches/loops | Per-frame instruction/time budgets + watchdog halt | Planned |

## Export & Diagnostics
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| HTML5 export presets | Debug/release outputs are reproducible | Config schema versioned with migrations | Planned |
| Preview=Export parity checks | Automated drift detection in CI | Keep deterministic golden scenes | Planned |
| Deterministic local diagnostics | Offline, explainable, actionable | Required baseline for trust/safety | In Progress |
| Optional cloud fix advisor (opt-in) | Ranked suggestions with citations | Never block editing; sanitize payloads | Planned |

## Playtest Debugger
| Capability | Quality Bar | Future-Proofing Notes | Status |
|---|---|---|---|
| Event breakpoints | Pause at meaningful events without runtime desync | Source locations should be stable IDs | In Progress |
| Step controls (continue/pause/step) | Deterministic stepping with predictable state | Tie to fixed-step sim adapter | In Progress |
| Runtime watch panel | Clear key state (flags/vars/inventory/quests) | Snapshot schema versioned like inspector bridge | In Progress |
| Selected-entity watch buckets | Show selected entity runtime state separate from global state | Keep selected payload optional and stable when selection is empty | In Progress |
| State diff view | Explain exactly what changed between steps | Keep diff format structured + machine-readable | Planned |
| Trace/output stream | Filterable by entity/system/severity | Reusable logging schema for export/test logs | In Progress |
| Assertions/watchpoints | Detect invalid states early in playtest | Emit actionable issues + jump-to source | Backlog |
| Timeline snapshots/rewind | Deep debugging for complex logic | Tier 2 (requires deterministic capture) | Backlog |

## Extensions / Plugin Strategy (Thoughts Captured)
| Capability | Why Include | Target | Status |
|---|---|---|---|
| Custom extension API | Community/custom workflows like larger engines | v1+ | Planned |
| Signed extension manifests | Safety and compatibility gating | v1+ | Planned |
| Scriptable custom actions/blocks | User-defined automation in Story/Quest tools | v1+ | Planned |
| Marketplace/distribution | Not v1 scope | v2+ | Backlog |

## Engine Evolution (2D -> 3D)
| Capability | Why Include | Target | Status |
|---|---|---|---|
| Profile capability flags (`2d`, `hybrid`, `3d`) | Keeps project/runtime contracts explicit as scope grows | v1+ | Planned |
| Renderer backend boundary contract | Allows adding 3D renderer without rewriting simulation stack | v1+ | Planned |
| Dimension-agnostic scripting action API | Keeps gameplay logic reusable across 2D and future 3D | v1 | Planned |
| Migration path for opt-in 3D projects | Prevents breaking existing 2D projects | v2 | Backlog |

## Lightweight Implementation Notes
- Prefer local/offline defaults first; network/cloud paths are optional enhancements.
- Keep heavy processing (video decode/AI cleanup) user-invoked and cancellable.
- Use feature flags for advanced ingest pipelines to preserve a lean v1 footprint.
- Store machine performance settings locally; keep project files portable and deterministic.

## First-Run UX Recommendation
- App should open to a **Dashboard / Project Hub** first.
- Primary actions above the fold: `New Project`, `Open Project`, `Continue Recent`.
- Secondary: `Make It Playable` guided flow, `Project Health`, and `Recent Templates`.
- Rationale: reduces blank-canvas anxiety for beginners while still giving fast project access for pros.

## Parking Lot (New Ideas)
- Add ideas here before prioritization; move accepted ones into the tables above.
- Example: "Quest reward balancing assistant"
- Example: "One-click NPC bundle (sprite + dialog + patrol + quest hook)"
- Example: "State probe pins for selected entities during playtest"
- Example: "Quest debugger view showing active conditions evaluated in real time"
- Example: "Intent paint: draw 'path/water/forest' and auto-resolve final tiles with rule packs"
- Example: "One-click music mood map linked to scene states (explore/combat/dialog)"
- Example: "Explain-this-bug panel: translate trace + state diff into plain-English probable causes"


