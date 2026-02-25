/**
 * @param {string} message
 * @param {string} timestamp
 * @returns {string}
 */
export function formatShellLogLine(message, timestamp) {
  return `[${timestamp}] ${message}`;
}


