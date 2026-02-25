# ADR-V2-001: Rust Core with WASM for Web

## Status
Accepted (2026-02-20)

## Context
GCS v2 needs a simulation/domain core that runs both in the browser (web-first
development) and natively on desktop (Tauri). Options considered:

1. **TypeScript core** -- fast iteration, but no native desktop perf path
2. **Rust core -> WASM** -- single codebase for both targets, proven in v1
3. **Hybrid** -- TS for some, Rust for perf-critical

## Decision
Keep simulation/domain logic in **Rust**. Compile to **WASM** for the web
runtime. Use **native Rust** (via Tauri commands) for the desktop runtime.

## Consequences
- One source of truth for simulation logic
- WASM compile step required for web development
- TypeScript adapters handle platform-specific concerns (canvas, file I/O)
- Core crates must avoid platform-specific APIs (no `std::fs`, no DOM)
- `wasm-bindgen` used for WASM boundary; Tauri commands for desktop boundary

