# Flaky Test Log

Last updated: 2026-02-15
Status: No flaky tests recorded yet.

## Purpose
- Track unstable tests once browser/E2E automation expands.
- Prevent repeated triage of known intermittent failures.

## Entry Template
| Date | Test | Failure Pattern | Suspected Cause | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | `path/to/test` | e.g. timeout on CI only | e.g. async race | retry removed + await fixed | name | Open/Resolved |

## Stability Window Daily Summary Template
| Date | CI Runs | E2E Failures | Rerun-Only Passes | Notes |
| --- | --- | --- | --- | --- |
| 2026-02-15 | 1 | 0 | 0 | No failures. total_tests=40; duration=31.21s; perf dashboard=2.8ms (<=300); editor_init=26.4ms (<=700); workspace_enter=117.5ms (<=1200); playtest_first_frame=14.3ms (<=700); playtest_update=159.9ms (<=900); preload=idle_preload |
| 2026-02-13 | 1 | 0 | 0 | No failures. total_tests=12; duration=11.18s |
| YYYY-MM-DD | 0 | 0 | 0 | |

## Notes
- Keep this empty unless a test is truly flaky.
- If a flake appears twice, add an entry and a follow-up task in sprint plan.
- Use CI artifact `apps/desktop/test-results/playwright-report.json` for daily metrics.







