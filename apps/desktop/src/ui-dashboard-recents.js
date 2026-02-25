import { MAX_RECENT_PROJECTS } from "./ui-dashboard-config.js";

/**
 * @param {unknown} entries
 * @param {number} [maxRecentProjects]
 */
export function normalizeRecentProjects(entries, maxRecentProjects = MAX_RECENT_PROJECTS) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => ({
      projectDir: String(entry?.projectDir || "").trim(),
      projectName: String(entry?.projectName || "").trim(),
      updatedAt: Number(entry?.updatedAt || 0),
    }))
    .filter((entry) => entry.projectDir.length > 0)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, maxRecentProjects);
}

/**
 * @param {string | null | undefined} raw
 * @param {number} [maxRecentProjects]
 */
export function parseRecentProjects(raw, maxRecentProjects = MAX_RECENT_PROJECTS) {
  if (!raw) {
    return [];
  }
  try {
    return normalizeRecentProjects(JSON.parse(raw), maxRecentProjects);
  } catch {
    return [];
  }
}

