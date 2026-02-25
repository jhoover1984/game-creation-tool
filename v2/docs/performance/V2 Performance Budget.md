# V2 Performance Budget

## Purpose
Keep performance regressions visible and enforceable.

## Initial Budgets
1. Simulation step (baseline scene): <= 4 ms avg at 60 Hz.
2. Render step (baseline scene): <= 8 ms avg.
3. Playtest enter latency: <= 2 s for baseline project.
4. Project load (baseline): <= 1.5 s.

## Benchmark Scenes
1. Small map + 20 entities.
2. Medium map + 200 entities.
3. Animation heavy scene + transitions.

## Measurement
1. Capture median, p95, and max over fixed-duration runs.
2. Save benchmark output as CI artifact.

## Guardrails
1. Any budget breach requires a regression issue.
2. Feature PRs that exceed budget need explicit approval and follow-up plan.
