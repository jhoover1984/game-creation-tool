/** @typedef {import("./types.js").EditorSnapshot} EditorSnapshot */

/**
 * @typedef {{
 *   issue: string
 * }} AssistedGuardrail
 */

/**
 * @typedef {{
 *   healthText: string,
 *   issues: string[]
 * }} HealthIssuesModel
 */

/**
 * Build health summary text and issue list from snapshot + assisted guardrails.
 *
 * @param {EditorSnapshot} snapshot
 * @param {AssistedGuardrail} assistedGuardrail
 * @returns {HealthIssuesModel}
 */
export function buildHealthIssuesModel(snapshot, assistedGuardrail) {
  if (!snapshot.health) {
    return {
      healthText: "Awaiting open_project response.",
      issues: [],
    };
  }

  const warnings = Array.isArray(snapshot.health.warnings) ? snapshot.health.warnings : [];
  const nearLimits = Array.isArray(snapshot.health.near_limits) ? snapshot.health.near_limits : [];
  const issues = [];
  if (snapshot.lastError?.action && snapshot.lastError?.message) {
    issues.push(`Runtime error (${snapshot.lastError.action}): ${snapshot.lastError.message}`);
  }
  warnings.forEach((warning) => issues.push(warning));
  nearLimits.forEach((item) => issues.push(`Near limit: ${item}`));
  if (assistedGuardrail?.issue) {
    issues.push(assistedGuardrail.issue);
  }
  return {
    healthText:
      warnings.length === 0 ? "Healthy project state." : `${warnings.length} warning(s) detected.`,
    issues,
  };
}
