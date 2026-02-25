/**
 * @typedef {{ key: string, value: boolean }} BreakpointEntry
 */

/**
 * @param {BreakpointEntry[]} entries
 * @returns {string[]}
 */
export function enabledBreakpointKinds(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  return safeEntries.filter((entry) => entry.value).map((entry) => entry.key);
}

/**
 * @param {BreakpointEntry[]} entries
 * @param {string} kind
 * @returns {string[]}
 */
export function nextBreakpointKinds(entries, kind) {
  const active = new Set(enabledBreakpointKinds(entries));
  if (active.has(kind)) {
    active.delete(kind);
  } else {
    active.add(kind);
  }
  return Array.from(active);
}

/**
 * @param {{
 *   state: { snapshot: () => { playtestBreakpoints?: BreakpointEntry[] }, setBreakpoints: (kinds: string[]) => Promise<unknown> },
 *   render: () => void,
 *   log: (message: string) => void
 * }} deps
 * @param {string} kind
 */
export function applyBreakpointToggle({ state, render, log }, kind) {
  const entries = state.snapshot().playtestBreakpoints || [];
  const next = nextBreakpointKinds(entries, kind);
  state
    .setBreakpoints(next)
    .then(() => render())
    .catch((error) => log(`Breakpoint toggle failed: ${error?.message || String(error)}`));
}
