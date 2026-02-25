const DRAW_SEED_PRESET_STORAGE_KEY = "gcs.draw_seed_presets.v1";
const DRAW_SEED_PRESET_SCHEMA_ID = "gcs.draw_seed_preset";
const DRAW_SEED_PRESET_SCHEMA_VERSION = 1;

/** @typedef {{ x: number, y: number }} DrawSeedPoint */
/** @typedef {{ title: string, points: Array<DrawSeedPoint | string> }} DrawSeedPresetEntry */

/**
 * @typedef {{
 *   code: string,
 *   severity: "info" | "warning" | "error",
 *   message: string
 * }} DrawPresetWarning
 */

/**
 * @typedef {{
 *   drawAssistedPrimitiveSelect: HTMLSelectElement | null,
 *   drawAssistedProfileSelect: HTMLSelectElement | null,
 *   drawAssistedOffsetXInput: HTMLInputElement | null,
 *   drawAssistedOffsetYInput: HTMLInputElement | null,
 *   drawAssistedMirrorXInput: HTMLInputElement | null,
 *   drawSeedCanvas: HTMLElement | null,
 *   drawSeedPreview: HTMLElement | null,
 *   drawSeedSummary: HTMLElement | null,
 *   drawSeedPresetSelect: HTMLSelectElement | null,
 *   drawSeedPresetDeleteBtn: HTMLButtonElement | null,
 *   drawSeedPresetNameInput: HTMLInputElement | null,
 *   drawSeedPresetJson: HTMLTextAreaElement | null
 * }} DrawSeedControllerElements
 */

const DRAW_SEED_RECIPES = {
  tree: [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
  ],
  bush: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  rock: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ],
  crate: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  chest: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
  ],
};

const DRAW_SEED_PRESETS = {
  tree: DRAW_SEED_RECIPES.tree,
  bush: DRAW_SEED_RECIPES.bush,
  rock: DRAW_SEED_RECIPES.rock,
  crate: DRAW_SEED_RECIPES.crate,
  chest: DRAW_SEED_RECIPES.chest,
  cluster: [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
  ],
  line: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  ring: [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 1, y: 2 },
    { x: 3, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
  ],
};

function parseDrawSeedPointsWithDiagnostics(rawPoints) {
  const warnings = [];
  if (!Array.isArray(rawPoints)) {
    warnings.push("Preset import warning: points must be an array.");
    return { points: [], warnings };
  }
  const mapped = rawPoints
    .map((point, index) => {
      if (typeof point === "string") {
        const [xStr, yStr] = point.split(",");
        const rawX = Number.parseInt(xStr, 10);
        const rawY = Number.parseInt(yStr, 10);
        if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
          warnings.push(`Preset import warning: points[${index}] has invalid coordinates.`);
          return null;
        }
        const clampedX = Math.max(0, Math.min(7, rawX));
        const clampedY = Math.max(0, Math.min(7, rawY));
        if (clampedX !== rawX || clampedY !== rawY) {
          warnings.push(`Preset import warning: points[${index}] was clamped to canvas bounds.`);
        }
        return {
          x: clampedX,
          y: clampedY,
        };
      }
      if (!point || typeof point !== "object") {
        warnings.push(`Preset import warning: points[${index}] must be an object or "x,y" string.`);
        return null;
      }
      const unknownPointKeys = Object.keys(point).filter((key) => key !== "x" && key !== "y");
      if (unknownPointKeys.length > 0) {
        warnings.push(
          `Preset import warning: points[${index}] has unknown key(s): ${unknownPointKeys.join(", ")}.`
        );
      }
      const rawX = Number.parseInt(point?.x, 10);
      const rawY = Number.parseInt(point?.y, 10);
      if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
        warnings.push(`Preset import warning: points[${index}] has invalid coordinates.`);
        return null;
      }
      const clampedX = Math.max(0, Math.min(7, rawX));
      const clampedY = Math.max(0, Math.min(7, rawY));
      if (clampedX !== rawX || clampedY !== rawY) {
        warnings.push(`Preset import warning: points[${index}] was clamped to canvas bounds.`);
      }
      return {
        x: clampedX,
        y: clampedY,
      };
    })
    .filter((point) => !!point)
    .map((point) => `${point.x},${point.y}`)
    .filter((entry, index, list) => list.indexOf(entry) === index);
  const uniqueCount = mapped.length;
  const rawCount = rawPoints.length;
  if (uniqueCount < rawCount) {
    warnings.push("Preset import warning: duplicate points were removed.");
  }
  return { points: mapped, warnings };
}

function parseDrawSeedPoints(rawPoints) {
  return parseDrawSeedPointsWithDiagnostics(rawPoints).points;
}

function classifyDrawPresetWarning(message) {
  if (message.includes("schema_version missing") || message.includes("schema_id")) {
    return "info";
  }
  if (message.includes("newer than supported")) {
    return "warning";
  }
  if (message.includes("invalid")) {
    return "error";
  }
  return "warning";
}

function normalizeDrawPresetWarnings(warnings) {
  if (!Array.isArray(warnings)) {
    return [];
  }
  return warnings
    .map((warning, index) => {
      const message = String(warning || "").trim();
      if (!message) {
        return null;
      }
      return {
        code: `draw_preset_warning_${index + 1}`,
        severity: /** @type {DrawPresetWarning["severity"]} */ (classifyDrawPresetWarning(message)),
        message,
      };
    })
    .filter((warning) => !!warning);
}

function formatBuiltInPresetTitle(key, capitalize) {
  return key
    .split("_")
    .filter((part) => !!part)
    .map((part) => capitalize(part))
    .join(" ");
}

/**
 * @param {unknown} parsed
 * @returns {string[]}
 */
function drawSeedPresetImportWarnings(parsed) {
  const warnings = [];
  if (!parsed || typeof parsed !== "object") {
    return warnings;
  }
  const parsedRecord = /** @type {{ schema_version?: unknown, schema_id?: unknown }} */ (parsed);
  if (!Object.hasOwn(parsed, "schema_version")) {
    warnings.push("Preset import warning: schema_version missing, using compatibility mode.");
  }
  const schemaVersion = Number.parseInt(String(parsedRecord.schema_version ?? ""), 10);
  if (Number.isFinite(schemaVersion) && schemaVersion > DRAW_SEED_PRESET_SCHEMA_VERSION) {
    warnings.push(
      `Preset import warning: schema_version ${schemaVersion} is newer than supported ${DRAW_SEED_PRESET_SCHEMA_VERSION}.`
    );
  }
  const schemaId = typeof parsedRecord.schema_id === "string" ? parsedRecord.schema_id : "";
  if (schemaId && schemaId !== DRAW_SEED_PRESET_SCHEMA_ID) {
    warnings.push(
      `Preset import warning: schema_id '${schemaId}' differs from '${DRAW_SEED_PRESET_SCHEMA_ID}'.`
    );
  }
  return warnings;
}

/**
 * @param {{
 *   elements: DrawSeedControllerElements,
 *   capitalize: (value: string) => string,
 *   log: (message: string) => void
 * }} deps
 */
export function createDrawSeedController({ elements, capitalize, log }) {
  /** @type {DrawPresetWarning[]} */
  let drawPresetImportWarningsState = [];
  /** @type {Set<string>} */
  let drawDraftRelativePoints = new Set();
  let drawDraftSignature = "";
  /** @type {Record<string, DrawSeedPresetEntry>} */
  let drawSeedCustomPresets = {};

  function drawDraftState() {
    const kind = elements.drawAssistedPrimitiveSelect?.value || "tree";
    const profile = elements.drawAssistedProfileSelect?.value || "game_boy";
    const baseX = Math.max(
      0,
      Number.parseInt(elements.drawAssistedOffsetXInput?.value || "1", 10) || 0
    );
    const baseY = Math.max(
      0,
      Number.parseInt(elements.drawAssistedOffsetYInput?.value || "1", 10) || 0
    );
    const mirrorX = !!elements.drawAssistedMirrorXInput?.checked;
    return { kind, profile, baseX, baseY, mirrorX };
  }

  function computeDrawDraftRelativePoints(kind, mirrorX) {
    const recipe = DRAW_SEED_RECIPES[kind] || DRAW_SEED_RECIPES.tree;
    const maxX = recipe.reduce((max, point) => Math.max(max, point.x), 0);
    return recipe.map((point) => ({
      x: mirrorX ? maxX - point.x : point.x,
      y: point.y,
    }));
  }

  function ensureDrawDraftPoints(forceReset = false) {
    const draft = drawDraftState();
    const signature = `${draft.kind}:${draft.mirrorX ? "1" : "0"}`;
    if (!forceReset && drawDraftRelativePoints.size > 0) {
      if (drawDraftSignature === signature || drawDraftSignature.startsWith("preset:")) {
        return;
      }
    }
    drawDraftSignature = signature;
    drawDraftRelativePoints = new Set(
      computeDrawDraftRelativePoints(draft.kind, draft.mirrorX).map(
        (point) => `${point.x},${point.y}`
      )
    );
  }

  function drawSeedPointsFromSet() {
    return Array.from(drawDraftRelativePoints)
      .map((key) => {
        const [xStr, yStr] = key.split(",");
        return {
          x: Math.max(0, Math.min(7, Number.parseInt(xStr, 10) || 0)),
          y: Math.max(0, Math.min(7, Number.parseInt(yStr, 10) || 0)),
        };
      })
      .sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function readCustomDrawSeedPresets() {
    if (typeof window === "undefined" || !window.localStorage) {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(DRAW_SEED_PRESET_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return {};
      }
      /** @type {Record<string, DrawSeedPresetEntry>} */
      const next = {};
      Object.entries(parsed).forEach(([key, entry]) => {
        const points = parseDrawSeedPoints(entry?.points);
        if (points.length === 0) {
          return;
        }
        next[key] = {
          title: typeof entry?.title === "string" && entry.title.trim() ? entry.title.trim() : key,
          points,
        };
      });
      return next;
    } catch {
      return {};
    }
  }

  function writeLocalStorageJsonSafe(storageKey, value) {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
      return true;
    } catch (error) {
      const quotaExceeded =
        error && typeof error === "object" && error.name === "QuotaExceededError";
      const message = quotaExceeded
        ? "Draw preset save skipped: browser storage quota exceeded."
        : "Draw preset save skipped: browser storage is unavailable.";
      log(message);
      return false;
    }
  }

  function writeCustomDrawSeedPresets(presets) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    writeLocalStorageJsonSafe(DRAW_SEED_PRESET_STORAGE_KEY, presets);
  }

  function allDrawSeedPresets() {
    return {
      ...Object.fromEntries(
        Object.entries(DRAW_SEED_PRESETS).map(([key, points]) => [
          key,
          { title: formatBuiltInPresetTitle(key, capitalize), points },
        ])
      ),
      ...drawSeedCustomPresets,
    };
  }

  function selectedDrawSeedPresetKey() {
    return elements.drawSeedPresetSelect?.value || "tree";
  }

  function syncDrawSeedPresetButtons() {
    const key = selectedDrawSeedPresetKey();
    const isCustom = key.startsWith("custom_");
    if (elements.drawSeedPresetDeleteBtn) {
      elements.drawSeedPresetDeleteBtn.disabled = !isCustom;
    }
  }

  function refreshDrawSeedPresetOptions() {
    if (!elements.drawSeedPresetSelect) {
      return;
    }
    drawSeedCustomPresets = readCustomDrawSeedPresets();
    const presets = allDrawSeedPresets();
    const existing = elements.drawSeedPresetSelect.value;
    const optionNodes = Object.entries(presets).map(([key, entry]) => {
      const customMark = key.startsWith("custom_") ? " (Custom)" : "";
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${entry.title || key}${customMark}`;
      return option;
    });
    elements.drawSeedPresetSelect.replaceChildren(...optionNodes);
    if (presets[existing]) {
      elements.drawSeedPresetSelect.value = existing;
    } else {
      elements.drawSeedPresetSelect.value = "tree";
    }
    syncDrawSeedPresetButtons();
  }

  function applyDrawSeedPreset(preset) {
    const presets = allDrawSeedPresets();
    const entry = presets[preset] || presets.tree;
    if (!entry) {
      return;
    }
    drawDraftRelativePoints = new Set(parseDrawSeedPoints(entry.points));
    drawDraftSignature = `preset:${preset}`;
    if (elements.drawSeedPresetSelect) {
      elements.drawSeedPresetSelect.value = preset;
    }
    syncDrawSeedPresetButtons();
    renderDrawSeedDraftPreview();
  }

  function sanitizeDrawSeedPresetName(name) {
    return (name || "")
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9_]+/g, "_")
      .replaceAll(/^_+|_+$/g, "");
  }

  function resolveImportedDrawSeedPresetIdentity(baseSafeName, baseTitle) {
    const safeBase = sanitizeDrawSeedPresetName(baseSafeName) || "imported_preset";
    const titleBase = (baseTitle || "Imported Preset").trim() || "Imported Preset";
    let suffix = 0;
    while (suffix < 1000) {
      const key = `custom_${safeBase}${suffix === 0 ? "" : `_${suffix + 1}`}`;
      if (!drawSeedCustomPresets[key]) {
        const title = `${titleBase}${suffix === 0 ? "" : ` (${suffix + 1})`}`;
        return { key, title };
      }
      suffix += 1;
    }
    const fallbackTs = Date.now();
    return {
      key: `custom_${safeBase}_${fallbackTs}`,
      title: `${titleBase} (${fallbackTs})`,
    };
  }

  function saveCurrentDrawSeedPreset() {
    if (!elements.drawSeedPresetNameInput) {
      return;
    }
    const rawName = elements.drawSeedPresetNameInput.value.trim();
    const safeName = sanitizeDrawSeedPresetName(rawName);
    const points = drawSeedPointsFromSet();
    if (!safeName) {
      log("Preset save failed: name is required.");
      return;
    }
    if (points.length === 0) {
      log("Preset save failed: at least one tile is required.");
      return;
    }
    const key = `custom_${safeName}`;
    const next = {
      ...drawSeedCustomPresets,
      [key]: { title: rawName, points },
    };
    drawSeedCustomPresets = next;
    writeCustomDrawSeedPresets(next);
    refreshDrawSeedPresetOptions();
    if (elements.drawSeedPresetSelect) {
      elements.drawSeedPresetSelect.value = key;
    }
    syncDrawSeedPresetButtons();
    log(`Draw preset saved: ${rawName}`);
  }

  function deleteSelectedDrawSeedPreset() {
    const key = selectedDrawSeedPresetKey();
    if (!key.startsWith("custom_")) {
      return;
    }
    if (!drawSeedCustomPresets[key]) {
      return;
    }
    const next = { ...drawSeedCustomPresets };
    const title = next[key]?.title || key;
    delete next[key];
    drawSeedCustomPresets = next;
    writeCustomDrawSeedPresets(next);
    refreshDrawSeedPresetOptions();
    log(`Draw preset deleted: ${title}`);
  }

  function buildDrawSeedPresetPayloadText() {
    const key = selectedDrawSeedPresetKey();
    const presets = allDrawSeedPresets();
    const entry = presets[key];
    if (!entry) {
      return "";
    }
    const payload = {
      schema_id: DRAW_SEED_PRESET_SCHEMA_ID,
      schema_version: DRAW_SEED_PRESET_SCHEMA_VERSION,
      name: entry.title || key,
      points: parseDrawSeedPoints(entry.points).map((point) => {
        const [xStr, yStr] = point.split(",");
        return { x: Number.parseInt(xStr, 10), y: Number.parseInt(yStr, 10) };
      }),
    };
    return JSON.stringify(payload, null, 2);
  }

  async function copySelectedDrawSeedPreset() {
    const payloadText = buildDrawSeedPresetPayloadText();
    if (!payloadText) {
      return;
    }
    if (elements.drawSeedPresetJson) {
      elements.drawSeedPresetJson.value = payloadText;
    }

    let copied = false;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(payloadText);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (copied) {
      log("Draw preset copied to clipboard.");
    } else {
      log("Clipboard unavailable. Preset JSON is ready in the export box.");
    }
  }

  function exportSelectedDrawSeedPresetToJson() {
    const key = selectedDrawSeedPresetKey();
    const presets = allDrawSeedPresets();
    const entry = presets[key];
    if (!entry) {
      return;
    }
    const payloadText = buildDrawSeedPresetPayloadText();
    if (!payloadText) {
      return;
    }
    if (elements.drawSeedPresetJson) {
      elements.drawSeedPresetJson.value = payloadText;
    }
    log(`Draw preset exported: ${entry.title || key}`);
  }

  function importDrawSeedPresetFromJson() {
    if (!elements.drawSeedPresetJson) {
      return;
    }
    drawPresetImportWarningsState = [];
    let parsed;
    try {
      parsed = JSON.parse(elements.drawSeedPresetJson.value || "{}");
    } catch {
      log("Preset import failed: invalid JSON.");
      return;
    }
    const warnings = drawSeedPresetImportWarnings(parsed);
    const unknownKeys = Object.keys(parsed || {}).filter(
      (key) => !["schema_id", "schema_version", "name", "points"].includes(key)
    );
    if (unknownKeys.length > 0) {
      warnings.push(`Preset import warning: unknown top-level key(s): ${unknownKeys.join(", ")}.`);
    }
    const title = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    const pointParse = parseDrawSeedPointsWithDiagnostics(parsed?.points);
    warnings.push(...pointParse.warnings);
    const points = pointParse.points;
    if (points.length === 0) {
      log("Preset import failed: JSON must include at least one point.");
      drawPresetImportWarningsState = normalizeDrawPresetWarnings(warnings);
      return;
    }
    const identity = resolveImportedDrawSeedPresetIdentity(
      title || "imported_preset",
      title || "Imported Preset"
    );
    const importedPoints = points.map((point) => {
      const [xStr, yStr] = point.split(",");
      return { x: Number.parseInt(xStr, 10), y: Number.parseInt(yStr, 10) };
    });
    const next = {
      ...drawSeedCustomPresets,
      [identity.key]: {
        title: identity.title,
        points: importedPoints,
      },
    };
    drawSeedCustomPresets = next;
    writeCustomDrawSeedPresets(next);
    refreshDrawSeedPresetOptions();
    if (elements.drawSeedPresetSelect) {
      elements.drawSeedPresetSelect.value = identity.key;
    }
    applyDrawSeedPreset(identity.key);
    drawPresetImportWarningsState = normalizeDrawPresetWarnings(warnings);
    const warningSuffix = warnings.length > 0 ? ` (with ${warnings.length} warning(s))` : "";
    log(`Draw preset imported: ${next[identity.key].title}${warningSuffix}`);
  }

  function drawDraftAbsolutePoints() {
    ensureDrawDraftPoints();
    const draft = drawDraftState();
    return Array.from(drawDraftRelativePoints)
      .map((key) => {
        const [xStr, yStr] = key.split(",");
        return {
          x: draft.baseX + (Number.parseInt(xStr, 10) || 0),
          y: draft.baseY + (Number.parseInt(yStr, 10) || 0),
        };
      })
      .sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function renderDrawSeedDraftPreview(forceReset = false) {
    if (!elements.drawSeedPreview || !elements.drawSeedSummary || !elements.drawSeedCanvas) {
      return;
    }
    ensureDrawDraftPoints(forceReset);
    const draft = drawDraftState();
    const points = drawDraftAbsolutePoints();

    elements.drawSeedSummary.textContent = `Draft: ${draft.kind} (${draft.profile})${draft.mirrorX ? " mirrored" : ""}`;
    const previewRows = document.createDocumentFragment();
    if (points.length === 0) {
      const row = document.createElement("li");
      row.textContent = "No draft tiles selected.";
      previewRows.append(row);
    } else {
      points.forEach((point) => {
        const row = document.createElement("li");
        row.textContent = `Tile @ (${point.x}, ${point.y})`;
        previewRows.append(row);
      });
    }
    elements.drawSeedPreview.replaceChildren(previewRows);

    const activeSet = new Set(drawDraftRelativePoints);
    const cells = Array.from({ length: 8 * 8 }, (_, index) => {
      const x = index % 8;
      const y = Math.floor(index / 8);
      const key = `${x},${y}`;
      const active = activeSet.has(key);
      const button = document.createElement("button");
      button.className = `draw-seed-cell${active ? " active" : ""}`;
      button.setAttribute("data-draw-seed-cell", key);
      button.title = `Tile ${key}`;
      button.setAttribute("aria-label", `draw-seed-cell-${key}`);
      button.addEventListener("click", () => {
        if (!key) {
          return;
        }
        if (drawDraftRelativePoints.has(key)) {
          drawDraftRelativePoints.delete(key);
        } else {
          drawDraftRelativePoints.add(key);
        }
        renderDrawSeedDraftPreview();
      });
      return button;
    });
    elements.drawSeedCanvas.replaceChildren(...cells);
  }

  function getImportWarnings() {
    return drawPresetImportWarningsState;
  }

  function clearImportWarnings() {
    drawPresetImportWarningsState = [];
  }

  return {
    refreshPresetOptions: refreshDrawSeedPresetOptions,
    syncPresetButtons: syncDrawSeedPresetButtons,
    applyPreset: applyDrawSeedPreset,
    saveCurrentPreset: saveCurrentDrawSeedPreset,
    deleteSelectedPreset: deleteSelectedDrawSeedPreset,
    copySelectedPreset: copySelectedDrawSeedPreset,
    exportSelectedPresetToJson: exportSelectedDrawSeedPresetToJson,
    importPresetFromJson: importDrawSeedPresetFromJson,
    drawDraftAbsolutePoints,
    renderDraftPreview: renderDrawSeedDraftPreview,
    getImportWarnings,
    clearImportWarnings,
  };
}
