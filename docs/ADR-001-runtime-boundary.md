# ADR-001: Runtime Boundary

Status: Accepted
Last updated: 2026-02-17
Purpose: Record runtime responsibility boundaries between UI, backend, and simulation layers.

## Responsibility Ownership

- **Frontend (JavaScript + JSDoc type-checking)** owns UI state and interactions.
- **Rust backend** owns disk I/O, migrations, export, ECS simulation, and authoritative editor state.
- **Desktop path (Tauri)**: Rust runs natively; frontend communicates via Tauri invoke commands (JSON payloads).
- **Browser path (WASM, future)**: same Rust crates compiled to WASM; frontend calls WASM exports directly.

## Data Transport

- v1 desktop: JSON invoke responses for all editor/inspector data (performant at target scale).
- Future browser: hot inspector/entity data can flow as binary snapshots from WASM linear memory (pull model).
- JSON remains the fallback/diagnostic path for non-hot operations in both targets.

## Key Rules

- Same Rust crates serve both desktop and browser targets — no target-specific business logic.
- Frontend abstraction layer (`project-api.js`) isolates transport mechanism so UI code is target-agnostic.
- All mutations flow through the command bus regardless of target.

## Historical Note

Original design specified "WASM runtime owns simulation/render hot-path state" and "TS reads binary snapshots from WASM memory." v1 implementation uses native Rust via Tauri with JSON transport, which meets performance targets for retro profile resolutions. The WASM + binary bridge path is preserved as the browser distribution strategy and future optimization for high-entity-count projects.
