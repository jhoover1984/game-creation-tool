import { readFile, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

function parseArgs(argv) {
  const args = {
    input: "test-results/playwright-report.json",
    out: "test-results/playwright-metrics.md",
    append: "",
    date: new Date().toISOString().slice(0, 10),
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--input" && i + 1 < argv.length) {
      args.input = argv[++i];
      continue;
    }
    if (token === "--out" && i + 1 < argv.length) {
      args.out = argv[++i];
      continue;
    }
    if (token === "--append" && i + 1 < argv.length) {
      args.append = argv[++i];
      continue;
    }
    if (token === "--date" && i + 1 < argv.length) {
      args.date = argv[++i];
    }
  }
  return args;
}

function buildSummary(report, date) {
  const stats = report?.stats || {};
  const total =
    Number(stats.expected || 0) + Number(stats.unexpected || 0) + Number(stats.flaky || 0);
  const failures = Number(stats.unexpected || 0);
  const rerunOnlyPasses = Number(stats.flaky || 0);
  const durationMs = Number(stats.duration || 0);
  const durationSec = (durationMs / 1000).toFixed(2);
  const notes =
    failures > 0
      ? `${failures} unexpected failure(s).`
      : rerunOnlyPasses > 0
        ? `${rerunOnlyPasses} flaky pass(es).`
        : "No failures.";
  return {
    date,
    ciRuns: 1,
    e2eFailures: failures,
    rerunOnlyPasses,
    notes: `${notes} total_tests=${total}; duration=${durationSec}s`,
  };
}

function toMarkdown(summary) {
  return `| ${summary.date} | ${summary.ciRuns} | ${summary.e2eFailures} | ${summary.rerunOnlyPasses} | ${summary.notes} |`;
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function decodeAttachmentBody(body) {
  if (!body) {
    return null;
  }
  if (typeof body !== "string") {
    return null;
  }
  const direct = parseJsonSafe(body);
  if (direct) {
    return direct;
  }
  const decoded = Buffer.from(body, "base64").toString("utf8");
  return parseJsonSafe(decoded);
}

async function collectNamedAttachmentPayloads(report, attachmentNames) {
  const wanted = new Set(attachmentNames);
  const payloads = {};
  const suites = Array.isArray(report?.suites) ? [...report.suites] : [];
  while (suites.length > 0) {
    const suite = suites.shift();
    if (!suite || typeof suite !== "object") {
      continue;
    }
    if (Array.isArray(suite.suites)) {
      suites.push(...suite.suites);
    }
    const specs = Array.isArray(suite.specs) ? suite.specs : [];
    for (const spec of specs) {
      const tests = Array.isArray(spec?.tests) ? spec.tests : [];
      for (const testCase of tests) {
        const results = Array.isArray(testCase?.results) ? testCase.results : [];
        for (const result of results) {
          const attachments = Array.isArray(result?.attachments) ? result.attachments : [];
          for (const attachment of attachments) {
            const name = attachment?.name;
            if (!wanted.has(name)) {
              continue;
            }
            const fromBody = decodeAttachmentBody(attachment.body);
            if (fromBody) {
              payloads[name] = fromBody;
              wanted.delete(name);
              if (wanted.size === 0) {
                return payloads;
              }
              continue;
            }
            if (typeof attachment.path === "string" && attachment.path.length > 0) {
              try {
                const raw = await readFile(attachment.path, "utf8");
                const fromPath = parseJsonSafe(raw);
                if (fromPath) {
                  payloads[name] = fromPath;
                  wanted.delete(name);
                  if (wanted.size === 0) {
                    return payloads;
                  }
                }
              } catch {
                // ignore and keep searching
              }
            }
          }
        }
      }
    }
  }
  return payloads;
}

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function extractTableRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const rows = [];
  const rowPattern = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*(.*)\|$/;
  for (const line of lines) {
    const match = line.match(rowPattern);
    if (!match) {
      continue;
    }
    rows.push({
      date: match[1].trim(),
      ciRuns: match[2].trim(),
      e2eFailures: match[3].trim(),
      rerunOnlyPasses: match[4].trim(),
      notes: match[5].trim(),
    });
  }
  return rows;
}

function parsePerfFromNotes(notes) {
  if (typeof notes !== "string" || notes.length === 0) {
    return null;
  }
  const dashboardMatch = notes.match(/dashboard=([0-9.]+)ms/);
  const editorInitMatch = notes.match(/editor_init=([0-9.]+)ms/);
  const workspaceEnterMatch = notes.match(/workspace_enter=([0-9.]+)ms/);
  const playtestFirstFrameMatch = notes.match(/playtest_first_frame=([0-9.]+)ms/);
  const playtestUpdateMatch = notes.match(/playtest_update=([0-9.]+)ms/);
  if (!dashboardMatch || !editorInitMatch || !workspaceEnterMatch) {
    return null;
  }
  const preloadMatch = notes.match(/preload=([A-Za-z0-9_:-]+)/);
  return {
    dashboardFirstPaintDeltaMs: Number(dashboardMatch[1]),
    editorInitDurationMs: Number(editorInitMatch[1]),
    workspaceEnteredDeltaMs: Number(workspaceEnterMatch[1]),
    playtestFirstFrameDeltaMs: playtestFirstFrameMatch ? Number(playtestFirstFrameMatch[1]) : null,
    playtestLastMetricUpdateDeltaMs: playtestUpdateMatch ? Number(playtestUpdateMatch[1]) : null,
    preloadSource: preloadMatch?.[1] || "unknown",
  };
}

function formatSignedDelta(value) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) {
    return `+${rounded}ms`;
  }
  if (rounded < 0) {
    return `${rounded}ms`;
  }
  return "0ms";
}

function findPreviousPerfRow(markdown, currentDate) {
  const rows = extractTableRows(markdown)
    .filter((row) => row.date !== currentDate)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  for (const row of rows) {
    const perf = parsePerfFromNotes(row.notes);
    if (perf) {
      return {
        date: row.date,
        perf,
      };
    }
  }
  return null;
}

function buildPerfTrendSummary(perfResolved, previousPerfRow) {
  if (!perfResolved || !previousPerfRow) {
    return null;
  }
  const previous = previousPerfRow.perf;
  const delta = {
    dashboardFirstPaintDeltaMs:
      perfResolved.dashboardFirstPaintDeltaMs - previous.dashboardFirstPaintDeltaMs,
    editorInitDurationMs: perfResolved.editorInitDurationMs - previous.editorInitDurationMs,
    workspaceEnteredDeltaMs:
      perfResolved.workspaceEnteredDeltaMs - previous.workspaceEnteredDeltaMs,
    playtestFirstFrameDeltaMs:
      perfResolved.playtestFirstFrameDeltaMs === null || previous.playtestFirstFrameDeltaMs === null
        ? null
        : perfResolved.playtestFirstFrameDeltaMs - previous.playtestFirstFrameDeltaMs,
    playtestLastMetricUpdateDeltaMs:
      perfResolved.playtestLastMetricUpdateDeltaMs === null ||
      previous.playtestLastMetricUpdateDeltaMs === null
        ? null
        : perfResolved.playtestLastMetricUpdateDeltaMs - previous.playtestLastMetricUpdateDeltaMs,
  };

  const deltaWarnBudgets = {
    dashboardFirstPaintDeltaMs: numberFromEnv("GCS_PERF_DELTA_WARN_DASHBOARD_MS", 200),
    editorInitDurationMs: numberFromEnv("GCS_PERF_DELTA_WARN_EDITOR_INIT_MS", 250),
    workspaceEnteredDeltaMs: numberFromEnv("GCS_PERF_DELTA_WARN_WORKSPACE_ENTER_MS", 300),
    playtestFirstFrameDeltaMs: numberFromEnv("GCS_PERF_DELTA_WARN_PLAYTEST_FIRST_FRAME_MS", 200),
    playtestLastMetricUpdateDeltaMs: numberFromEnv("GCS_PERF_DELTA_WARN_PLAYTEST_UPDATE_MS", 250),
  };

  const warnings = [];
  for (const key of Object.keys(deltaWarnBudgets)) {
    if (delta[key] !== null && delta[key] > deltaWarnBudgets[key]) {
      warnings.push(
        `${key} regressed ${formatSignedDelta(delta[key])} (warn > +${deltaWarnBudgets[key]}ms)`
      );
    }
  }

  const summary = `trend vs ${previousPerfRow.date}: dashboard=${formatSignedDelta(delta.dashboardFirstPaintDeltaMs)}; editor_init=${formatSignedDelta(delta.editorInitDurationMs)}; workspace_enter=${formatSignedDelta(delta.workspaceEnteredDeltaMs)}; playtest_first_frame=${delta.playtestFirstFrameDeltaMs === null ? "n/a" : formatSignedDelta(delta.playtestFirstFrameDeltaMs)}; playtest_update=${delta.playtestLastMetricUpdateDeltaMs === null ? "n/a" : formatSignedDelta(delta.playtestLastMetricUpdateDeltaMs)}; preload=${previous.preloadSource}->${perfResolved.preloadSource}`;
  return {
    previousDate: previousPerfRow.date,
    delta,
    deltaWarnBudgets,
    warnings,
    summary,
  };
}

function buildPerfBudgetSummary(payload) {
  const budgets = {
    dashboardFirstPaintDeltaMs: numberFromEnv("GCS_PERF_BUDGET_DASHBOARD_MS", 1000),
    editorInitDurationMs: numberFromEnv("GCS_PERF_BUDGET_EDITOR_INIT_MS", 1500),
    workspaceEnteredDeltaMs: numberFromEnv("GCS_PERF_BUDGET_WORKSPACE_ENTER_MS", 2200),
    playtestFirstFrameDeltaMs: numberFromEnv("GCS_PERF_BUDGET_PLAYTEST_FIRST_FRAME_MS", 700),
    playtestLastMetricUpdateDeltaMs: numberFromEnv("GCS_PERF_BUDGET_PLAYTEST_UPDATE_DELAY_MS", 900),
  };

  const launch = payload?.launch || {};
  const workspace = payload?.workspace || {};
  const playtest = payload?.playtest || {};
  const resolved = {
    dashboardFirstPaintDeltaMs:
      workspace.dashboardFirstPaintDeltaMs ?? launch.dashboardFirstPaintDeltaMs ?? null,
    editorInitDurationMs: workspace.editorInitDurationMs ?? null,
    workspaceEnteredDeltaMs: workspace.workspaceEnteredDeltaMs ?? null,
    playtestFirstFrameDeltaMs: playtest.playtestFirstFrameDeltaMs ?? null,
    playtestLastMetricUpdateDeltaMs: playtest.playtestLastMetricUpdateDeltaMs ?? null,
    preloadSource: workspace.preloadSource || launch.preloadSource || "unknown",
  };

  const warnings = [];
  for (const key of [
    "dashboardFirstPaintDeltaMs",
    "editorInitDurationMs",
    "workspaceEnteredDeltaMs",
    "playtestFirstFrameDeltaMs",
    "playtestLastMetricUpdateDeltaMs",
  ]) {
    const value = resolved[key];
    const budget = budgets[key];
    if (value === null || value === undefined) {
      warnings.push(`${key} missing`);
      continue;
    }
    if (typeof value !== "number" || Number.isNaN(value)) {
      warnings.push(`${key} invalid`);
      continue;
    }
    if (value > budget) {
      warnings.push(`${key} ${value}ms > budget ${budget}ms`);
    }
  }

  const summary = `perf dashboard=${resolved.dashboardFirstPaintDeltaMs ?? "n/a"}ms (<=${budgets.dashboardFirstPaintDeltaMs}); editor_init=${resolved.editorInitDurationMs ?? "n/a"}ms (<=${budgets.editorInitDurationMs}); workspace_enter=${resolved.workspaceEnteredDeltaMs ?? "n/a"}ms (<=${budgets.workspaceEnteredDeltaMs}); playtest_first_frame=${resolved.playtestFirstFrameDeltaMs ?? "n/a"}ms (<=${budgets.playtestFirstFrameDeltaMs}); playtest_update=${resolved.playtestLastMetricUpdateDeltaMs ?? "n/a"}ms (<=${budgets.playtestLastMetricUpdateDeltaMs}); preload=${resolved.preloadSource}`;

  return {
    budgets,
    resolved,
    warnings,
    summary,
  };
}

function upsertDailyRow(markdown, row, date) {
  const lines = markdown.split(/\r?\n/);
  const rowPattern = new RegExp(`^\\|\\s*${date}\\s*\\|`);
  for (let i = 0; i < lines.length; i += 1) {
    if (rowPattern.test(lines[i])) {
      lines[i] = row;
      return `${lines.join("\n")}\n`;
    }
  }

  const tableHeaderIndex = lines.findIndex((line) =>
    line.includes("| Date | CI Runs | E2E Failures |")
  );
  if (tableHeaderIndex >= 0) {
    const insertIndex = tableHeaderIndex + 2;
    lines.splice(insertIndex, 0, row);
    return `${lines.join("\n")}\n`;
  }
  return `${markdown.trimEnd()}\n${row}\n`;
}

async function main() {
  const args = parseArgs(process.argv);
  const raw = await readFile(args.input, "utf8");
  const report = JSON.parse(raw);
  const summary = buildSummary(report, args.date);
  const perfAttachmentPayloads = await collectNamedAttachmentPayloads(report, [
    "perf-launch-workspace",
    "perf-playtest-feedback",
  ]);
  const launchWorkspacePayload = perfAttachmentPayloads["perf-launch-workspace"] || null;
  const playtestPayload = perfAttachmentPayloads["perf-playtest-feedback"] || null;
  const perfPayload = launchWorkspacePayload
    ? {
        launch: launchWorkspacePayload.launch || null,
        workspace: launchWorkspacePayload.workspace || null,
        playtest: playtestPayload?.playtest || null,
      }
    : null;
  const perf = perfPayload ? buildPerfBudgetSummary(perfPayload) : null;
  let trend = null;
  let appendBody = "";

  if (args.append) {
    appendBody = await readFile(args.append, "utf8");
    if (perf) {
      const previousPerfRow = findPreviousPerfRow(appendBody, summary.date);
      trend = buildPerfTrendSummary(perf.resolved, previousPerfRow);
    }
  }

  if (perf) {
    summary.notes = `${summary.notes}; ${perf.summary}`;
  } else {
    summary.notes = `${summary.notes}; perf metrics missing`;
  }
  const row = toMarkdown(summary);

  const outBody = [
    "# Playwright Daily Metrics",
    "",
    `- Date: ${summary.date}`,
    `- CI Runs: ${summary.ciRuns}`,
    `- E2E Failures: ${summary.e2eFailures}`,
    `- Rerun-Only Passes: ${summary.rerunOnlyPasses}`,
    `- Notes: ${summary.notes}`,
    ...(perf
      ? [
          "",
          "## Perf Budget Check",
          "",
          `- Dashboard First Paint: ${perf.resolved.dashboardFirstPaintDeltaMs ?? "n/a"}ms (budget <= ${perf.budgets.dashboardFirstPaintDeltaMs}ms)`,
          `- Editor Init: ${perf.resolved.editorInitDurationMs ?? "n/a"}ms (budget <= ${perf.budgets.editorInitDurationMs}ms)`,
          `- Workspace Enter: ${perf.resolved.workspaceEnteredDeltaMs ?? "n/a"}ms (budget <= ${perf.budgets.workspaceEnteredDeltaMs}ms)`,
          `- Playtest First Frame: ${perf.resolved.playtestFirstFrameDeltaMs ?? "n/a"}ms (budget <= ${perf.budgets.playtestFirstFrameDeltaMs}ms)`,
          `- Playtest Update Delay: ${perf.resolved.playtestLastMetricUpdateDeltaMs ?? "n/a"}ms (budget <= ${perf.budgets.playtestLastMetricUpdateDeltaMs}ms)`,
          `- Preload Source: ${perf.resolved.preloadSource}`,
          `- Warnings: ${perf.warnings.length === 0 ? "none" : perf.warnings.join("; ")}`,
        ]
      : []),
    ...(trend
      ? [
          "",
          `## Perf Trend Delta (vs ${trend.previousDate})`,
          "",
          `- Dashboard First Paint Delta: ${formatSignedDelta(trend.delta.dashboardFirstPaintDeltaMs)} (warn > +${trend.deltaWarnBudgets.dashboardFirstPaintDeltaMs}ms)`,
          `- Editor Init Delta: ${formatSignedDelta(trend.delta.editorInitDurationMs)} (warn > +${trend.deltaWarnBudgets.editorInitDurationMs}ms)`,
          `- Workspace Enter Delta: ${formatSignedDelta(trend.delta.workspaceEnteredDeltaMs)} (warn > +${trend.deltaWarnBudgets.workspaceEnteredDeltaMs}ms)`,
          `- Playtest First Frame Delta: ${trend.delta.playtestFirstFrameDeltaMs === null ? "n/a" : formatSignedDelta(trend.delta.playtestFirstFrameDeltaMs)} (warn > +${trend.deltaWarnBudgets.playtestFirstFrameDeltaMs}ms)`,
          `- Playtest Update Delta: ${trend.delta.playtestLastMetricUpdateDeltaMs === null ? "n/a" : formatSignedDelta(trend.delta.playtestLastMetricUpdateDeltaMs)} (warn > +${trend.deltaWarnBudgets.playtestLastMetricUpdateDeltaMs}ms)`,
          `- Warnings: ${trend.warnings.length === 0 ? "none" : trend.warnings.join("; ")}`,
        ]
      : []),
    "",
    "Row:",
    row,
    "",
  ].join("\n");
  await writeFile(args.out, outBody, "utf8");

  if (args.append) {
    const next = upsertDailyRow(appendBody, row, summary.date);
    await writeFile(args.append, next, "utf8");
  }

  if (perf && perf.warnings.length > 0) {
    process.stderr.write(`[perf-budget-warning] ${perf.warnings.join(" | ")}\n`);
  }
  if (trend && trend.warnings.length > 0) {
    process.stderr.write(`[perf-trend-warning] ${trend.warnings.join(" | ")}\n`);
  }

  const strict = process.env.GCS_PERF_BUDGET_STRICT === "1";
  if (strict && perf && perf.warnings.length > 0) {
    process.stderr.write(
      "[perf-budget-error] strict mode enabled; failing due to perf budget violations.\n"
    );
    process.exitCode = 1;
  }

  process.stdout.write(`${row}\n`);
}

await main();
