# AI Authoring Hygiene Policy

## Purpose
Prevent encoding defects and keep AI-assisted implementation efficient, focused, and reproducible.

## Scope
Applies to code, schemas, tests, docs, PR bodies, and task templates under `v2/`.

## Encoding Rules
1. Default to ASCII in all authored text.
2. Do not use smart punctuation in committed files:
   - disallowed: smart quotes, en/em dashes, arrow glyphs, and mojibake sequences
   - use: `"`, `'`, `--`, `->`, `<-`
3. UTF-8 file encoding is allowed, but content should remain ASCII unless non-ASCII is explicitly required by the feature.
4. If non-ASCII is intentionally required, note it in the completion report.

## Required Encoding Check
Run before PR update on touched files:

```bash
cd v2
npm run check:ascii -- <touched-file-1> <touched-file-2> ...
```

If output is non-empty, either normalize to ASCII or document why non-ASCII is required.

## Token and Context Efficiency Rules
1. Reuse canonical docs by path; do not paste large doc blocks into task context.
2. Keep plans and completion reports concise and file-scoped.
3. Prefer incremental patches over broad rewrites.
4. Use targeted search (`rg`) and targeted tests for touched scope first, then full CI.
5. Avoid duplicate representations of the same contract or status data.

## Prompt/Workflow Optimization Guidance
1. Keep stable instructions in canonical docs and templates; reference them instead of repeating them.
2. Structure requests as:
   - objective
   - scope files
   - non-goals
   - acceptance tests
   - doc references
3. Use deterministic, explicit commands and avoid ambiguous open-ended directives.

## Enforcement
1. `AGENT_GUIDE.md`, `TASK_TEMPLATE.md`, and PR checklist must reference this policy.
2. Drift-policy compliance includes encoding and efficiency checks.
3. Violations must be fixed in the same PR, or tracked with an explicit follow-up issue.

