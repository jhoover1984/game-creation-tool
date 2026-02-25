# Scripting UX and Translation Assistant

Last updated: 2026-02-15
Purpose: Specify beginner-first scripting UX and translation-assistant guardrails.

Scope: v1 and v1+ logic authoring UX design.

## Goals
1. Beginner can ship gameplay logic without writing code.
2. Advanced users can extend logic safely with script snippets.
3. Generated logic remains deterministic and debuggable.

## Authoring Modes
1. Event Graph mode (default):
- Conditions, actions, triggers, and branches via visual blocks.
- Template-driven starts (`NPC Talk`, `Quest Step`, `Chest`, `Door`, `Enemy Patrol`).

2. Script Node mode (advanced):
- Rhai snippet attached to graph node for custom logic.
- Uses restricted engine API only.

## Event Graph Execution Model (Required)
1. Graph execution is deterministic for the same input sequence.
2. Events enqueue node execution; execution order is stable and documented.
3. Node outputs are typed (`bool`, `number`, `string`, `entity_ref`, `item_ref`, `quest_ref`).
4. Validation blocks invalid links (type mismatch, missing refs, invalid cycles).
5. Runtime failures are mapped back to node IDs and surfaced in Issues Drawer.

## Event Graph Function Library (v1 baseline)
1. Event nodes:
- `On Start`, `On Interact`, `On Trigger Enter`, `On Trigger Exit`, `On Item Pickup`, `On Quest State Change`, `On Dialog Choice`.

2. Condition nodes:
- `Has Item`, `Quest Stage Is`, `Flag Is`, `Compare Variable`, `Entity In Area`, `Random Chance`.

3. Action nodes:
- `Set Flag`, `Set Variable`, `Give Item`, `Remove Item`, `Start Dialog`, `Set Quest Stage`, `Teleport Entity`, `Move Entity`, `Play Animation`, `Play SFX`, `Load Map`, `Spawn Entity`, `Despawn Entity`.

4. Flow nodes:
- `Sequence`, `Branch`, `Switch`, `Delay`, `Cooldown Gate`, `Repeat N`, `Stop`.

## Nuance Strategy (so graphs scale to real games)
1. Subgraphs/functions:
- Reusable graph blocks with named inputs/outputs (example: `Common Chest Open Flow`).

2. State machines:
- Optional graph mode for AI/quest phases (`idle`, `patrol`, `alert`, `combat`).

3. Context scopes:
- Variable scopes: `global`, `map`, `entity`, `quest`.
- Prevents accidental cross-system state collisions.

4. Hybrid escape hatch:
- Any node can call vetted Rhai helpers for advanced math/logic.
- Visual graph remains the orchestrator so debugging stays approachable.

5. Bounded runtime:
- Script watchdog and per-frame budget enforcement are required.
- Timeout or runaway behavior must pause safely and emit actionable diagnostics.

## Translation Assistant (v1+)
- Purpose: convert user intent into draft logic.
- Inputs:
  - plain-English description
  - optional external syntax examples (Python-like pseudocode)
- Outputs:
  - preferred: Event Graph draft
  - optional: Rhai snippet draft

## Safety Model
1. Translation outputs are drafts, never auto-executed without validation.
2. Validator runs immediately and reports issues by node ID/line.
3. User must review/apply diff before accepting generated changes.
4. Scripts run under frame budgets and restricted host APIs.

## UX Requirements
1. "Explain this logic" view for any generated graph/script.
2. "Why this failed" diagnostics linked to Issues Drawer fixes.
3. One-click conversion from template to editable graph.
4. One-click fallback from script node to graph equivalent where supported.
5. Node search and category filters (`Event`, `Condition`, `Action`, `Flow`) for large projects.
6. Template browser for common patterns (dialog NPC, chest/door lock, quest handoff, patrol enemy).

## Template-first Logic Authoring (v1 requirement)
1. Smart-drop templates must attach working starter logic immediately.
2. Template parameter forms replace low-level graph editing for common cases.
3. All templates are versioned; upgrades never silently change project behavior.
4. Users can "Open as Graph" at any time to inspect and customize.

## Acceptance Bar (Initial)
1. User can build a quest start/completion flow without touching script text.
2. User can add one custom condition via Rhai and debug it in playtest trace.
3. Translation assistant can generate a valid draft for at least 5 starter templates.
4. Chest/door/NPC interactions can be built from templates in under 3 minutes with no raw code.
