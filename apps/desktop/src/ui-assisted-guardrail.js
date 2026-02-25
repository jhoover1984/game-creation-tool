/**
 * @typedef {{
 *   issue: string,
 *   tip: string,
 *   level: string,
 *   profile: string,
 *   count: number,
 *   cap: number
 * }} AssistedGuardrail
 */

/** @type {AssistedGuardrail} */
export const EMPTY_ASSISTED_GUARDRAIL = {
  issue: "",
  tip: "",
  level: "none",
  profile: "game_boy",
  count: 0,
  cap: 0,
};

/**
 * @param {{
 *   issuesRecoveryController: { buildAssistedGuardrail?: (snapshot: unknown) => AssistedGuardrail } | null,
 *   snapshot: unknown
 * }} deps
 * @returns {AssistedGuardrail}
 */
export function resolveAssistedGuardrail({ issuesRecoveryController, snapshot }) {
  if (issuesRecoveryController?.buildAssistedGuardrail) {
    return issuesRecoveryController.buildAssistedGuardrail(snapshot);
  }
  return { ...EMPTY_ASSISTED_GUARDRAIL };
}
