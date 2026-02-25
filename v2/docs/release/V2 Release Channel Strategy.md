# V2 Release Channel Strategy

## Purpose
Control risk while increasing release cadence.

## Channels
1. Dev: active integration branch; unstable.
2. Alpha: feature-complete slices with known gaps.
3. Beta: stabilization; migration and performance focus.
4. Stable: production-ready baseline.

## Promotion Gates
- Dev -> Alpha: core feature tests + smoke pass.
- Alpha -> Beta: no critical regressions for one sprint.
- Beta -> Stable: parity and migration checks green.

## Rollback
1. Keep rollback-ready previous build artifacts.
2. Any failed stable release requires incident note and corrective action.
