# ADR-V2-002: TypeScript for Frontend and Adapters

## Status
Accepted (2026-02-20)

## Context
v1 used vanilla JS with JSDoc type annotations to avoid a build step. As the
project scales, the limitations of JSDoc become apparent:

- No enforced contract boundaries between packages
- IDE support is weaker for cross-package refactoring
- No generated types from schemas

## Decision
Use **TypeScript (strict mode)** for all v2 frontend code: contracts, adapters,
and UI editor. Keep the build tooling lightweight (tsc incremental, no bundler
unless needed).

## Consequences
- Build step required (`tsc --build`)
- Stronger type safety at package boundaries
- `@gcs/contracts` package defines all cross-boundary types
- Contract changes are enforced by the type system
- Fast incremental compilation minimizes iteration overhead
