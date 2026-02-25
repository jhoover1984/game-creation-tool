# ADR-005: Scripting Engine Strategy

Status: Accepted
Last updated: 2026-02-17
Date: 2026-02-13
Related: `docs/ADR-001-runtime-boundary.md`, `docs/ADR-004-playtest-debugger.md`, `docs/tooling/Tool Capability Matrix.md`
Purpose: Record scripting architecture decision, constraints, and rollout plan.

## Context
- We need beginner-first logic authoring that still scales to advanced users.
- Product goal requires fast onboarding and deterministic playtest/export parity.
- Current runtime stack is Rust-first with Tauri + web fallback, so scripting must be embeddable and safe in Rust.
- We need profile-aware constraints (Game Boy/NES/SNES) and actionable script diagnostics in the Issues Drawer.

## Decision
- Adopt a **hybrid scripting model**:
  1. **Primary authoring**: visual Event Graph (conditions -> actions) with deterministic execution order.
  2. **Advanced escape hatch**: embedded Rust-hosted script expressions/functions using **Rhai**.
  3. **Engine boundary**: scripts can only call whitelisted engine actions exposed through a typed command/action registry.

- Keep game logic data-first:
  - Persist event graphs and script snippets as project data IR (versioned/migratable).
  - Compile IR to runtime instructions for simulation.
  - Disallow direct filesystem/network/process access from scripts in v1.

## Why Rhai Over Lua
- **Rust-native**: Rhai is pure Rust with zero FFI. Lua (mlua) requires C library bindings and unsafe FFI.
- **WASM-compatible**: Rhai compiles to WASM natively (pure Rust). Lua needs C-to-WASM toolchain (emscripten), adding build complexity.
- **Sandboxed by default**: Rhai has no filesystem/network access out of the box. Lua requires manual sandboxing.
- **Type sharing**: Rhai can use Rust types directly. Lua needs a serialization bridge.
- **Sufficient performance**: scripting is an escape hatch for expression-level logic, not the primary authoring tool. Rhai's performance is adequate. LuaJIT's speed advantage is irrelevant when 95% of users use the Event Graph.
- **Ecosystem tradeoff accepted**: Lua has a larger game ecosystem, but our scripting surface is intentionally narrow (whitelisted engine actions only), so ecosystem breadth doesn't benefit us.

## Why This Architecture
- Matches proven beginner workflows used by node/event systems in major tools.
- Keeps determinism and safety stronger than embedding a full general-purpose runtime with broad host access.
- Rhai fits Rust embedding needs and supports WASM targets, reducing architecture friction for dual desktop/browser distribution.

## Consequences
### Positive
- Beginner path remains no-code first.
- Pro users can add compact script logic where event blocks become verbose.
- Clear testability: event graph and script execution can be snapshot-tested with deterministic inputs.
- Easier to surface actionable runtime errors with source location mapping (event node ID or script line).

### Tradeoffs
- We must build and maintain a language service layer (validation, autocomplete metadata, diagnostics).
- Some users will request Lua/JS support; v1 intentionally avoids multi-language complexity. Lua was evaluated and rejected due to FFI overhead, WASM compilation friction, and manual sandboxing requirements. See "Why Rhai Over Lua" above.
- Engine action API discipline is required to avoid script/runtime coupling drift.

## Guardrails
1. Preview and export use the same scripting execution core.
2. Script execution budget per frame is capped and monitored.
3. Infinite-loop prevention: instruction/time slice budget with clean halt + issue report.
4. No hidden side channels: all state changes route through command/action registry for traceability.
5. Error taxonomy maps to Issues Drawer templates with suggested fixes.

## Implementation Shape
1. `script-core` crate (new):
   - IR model (`EventGraph`, `Node`, `Edge`, `Expression`).
   - validator and compiler to runtime instructions.
   - Rhai host integration with restricted API surface.
2. `engine-core` integration:
   - deterministic update hook to run script VM in fixed-step simulation.
   - event dispatch bus for gameplay events and debugger trace stream.
3. `apps/desktop` frontend:
   - Event Graph editor MVP (node list + connections + inspector).
   - inline script editor for Rhai expressions/functions.
   - error mapping and jump-to-node/line support.

## Rollout Plan
1. Sprint 3: script IR + validator + minimal runtime hook; command surface stubs.
2. Sprint 4: Event Graph MVP + Rhai escape hatch + Issues Drawer error mapping.
3. Sprint 5: UX polish, docs/help, debugger integration, profile constraint warnings.
4. v1+: translation assistant draft flow per `docs/scripting/Scripting UX and Translation Assistant.md` (validated apply-only path).

## References
- Unity Visual Scripting manual: https://docs.unity.cn/6000.2/Documentation/Manual/com.unity.visualscripting.html
- Unreal Blueprints overview: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-blueprints-visual-scripting-in-unreal-engine
- GDevelop docs: https://wiki.gdevelop.io/
- Godot scripting language guidance: https://docs.godotengine.org/en/4.4/getting_started/step_by_step/scripting_languages.html
- Rhai (embedded scripting for Rust): https://github.com/rhaiscript/rhai







