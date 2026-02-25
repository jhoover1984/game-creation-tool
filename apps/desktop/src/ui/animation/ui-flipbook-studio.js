/**
 * @typedef {import("./types.js").EditorSnapshot} EditorSnapshot
 */

/**
 * @typedef {{
 *   flipbookSummary: HTMLElement | null,
 *   flipbookClipSelect: HTMLSelectElement | null,
 *   flipbookFrameDurationInput: HTMLInputElement | null,
 *   flipbookLoopModeSelect: HTMLSelectElement | null,
 *   flipbookClipAddBtn: HTMLElement | null,
 *   flipbookClipRenameBtn: HTMLElement | null,
 *   flipbookClipDeleteBtn: HTMLElement | null,
 *   flipbookFrameStrip: HTMLElement | null,
 *   flipbookScrubInput: HTMLInputElement | null,
 *   flipbookScrubLabel: HTMLElement | null,
 *   flipbookFrameAddBtn: HTMLElement | null,
 *   flipbookFrameRemoveBtn: HTMLElement | null,
 *   flipbookFrameDuplicateBtn: HTMLElement | null,
 *   flipbookFrameLeftBtn: HTMLElement | null,
 *   flipbookFrameRightBtn: HTMLElement | null,
 *   flipbookPreviewSpeedSelect: HTMLSelectElement | null,
 *   flipbookPreviewToggleBtn: HTMLElement | null,
 *   flipbookStatus: HTMLElement | null
 * }} FlipbookStudioElements
 */

/**
 * @param {{
 *   elements: FlipbookStudioElements,
 *   state: {
 *     snapshot: () => EditorSnapshot,
 *     addSelectedEntityAnimationClip?: (clipName: string, clip: { frames: number[], frame_duration_ticks: number, loop_mode?: string }) => Promise<unknown>,
 *     setSelectedEntityAnimationState?: (stateName: string) => Promise<unknown>,
 *     setSelectedEntityComponents?: (components: Record<string, unknown>) => Promise<unknown>,
 *     events?: { on: (event: string, handler: (snapshot: EditorSnapshot) => void) => () => void }
 *   },
 *   render?: () => void,
 *   log?: (message: string) => void
 * }} deps
 */
export function createFlipbookStudioController({ elements, state, render, log }) {
  /** @type {Array<() => void>} */
  const disposers = [];
  let previewPlaying = false;
  let selectedFrameSlot = -1;
  let scrubFrameIndex = -1;
  let previewTimerId = null;
  let previewDirection = 1;
  /** @type {Map<string, { width: number, height: number, pending: boolean }>} */
  const spriteMetaByAsset = new Map();

  function setStatus(message) {
    if (elements.flipbookStatus) {
      elements.flipbookStatus.textContent = message;
    }
    if (message && typeof log === "function") {
      log(`[flipbook] ${message}`);
    }
  }

  function clearPreviewTimer() {
    if (previewTimerId !== null) {
      clearInterval(previewTimerId);
      previewTimerId = null;
    }
  }

  /**
   * @param {EditorSnapshot} snapshot
   * @returns {{ assetId: string, src: string }}
   */
  function selectedSpriteSource(snapshot) {
    const entity = selectedEntity(snapshot);
    const assetId =
      String(entity?.components?.sprite?.asset_id || snapshot.selectedComponents?.sprite?.asset_id || "");
    const src = assetId ? String(snapshot.spriteRegistry?.[assetId] || "") : "";
    return { assetId, src };
  }

  /**
   * @param {string} assetId
   * @param {string} src
   * @returns {{ width: number, height: number, pending: boolean } | null}
   */
  function ensureSpriteMeta(assetId, src) {
    if (!assetId || !src) {
      return null;
    }
    const cached = spriteMetaByAsset.get(assetId);
    if (cached) {
      return cached.pending ? null : cached;
    }
    const seed = { width: 0, height: 0, pending: true };
    spriteMetaByAsset.set(assetId, seed);
    if (typeof Image === "undefined") {
      return null;
    }
    const img = new Image();
    img.onload = () => {
      const next = {
        width: Math.max(1, img.naturalWidth || img.width || 1),
        height: Math.max(1, img.naturalHeight || img.height || 1),
        pending: false,
      };
      spriteMetaByAsset.set(assetId, next);
      if (typeof render === "function") {
        render();
      }
    };
    img.onerror = () => {
      spriteMetaByAsset.delete(assetId);
    };
    img.src = src;
    return null;
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function selectedEntity(snapshot) {
    const selectedId = snapshot.selection?.length === 1 ? snapshot.selection[0] : null;
    if (!selectedId) {
      return null;
    }
    return snapshot.entities?.find((entity) => entity.id === selectedId) ?? null;
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function selectedAnimation(snapshot) {
    return selectedEntity(snapshot)?.animation ?? null;
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function selectedClipName(snapshot) {
    return selectedAnimation(snapshot)?.state?.current_clip_name ?? "";
  }

  /**
   * @param {EditorSnapshot} snapshot
   * @returns {Array<{ name: string, clip: { frames: number[], frame_duration_ticks: number, loop_mode?: string } }>}
   */
  function clipEntries(snapshot) {
    const clips = selectedAnimation(snapshot)?.clips;
    if (!clips || typeof clips !== "object") {
      return [];
    }
    return Object.entries(clips)
      .map(([name, clip]) => [name, clip])
      .filter((entry) => entry[0] && entry[1] && Array.isArray(entry[1].frames))
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([name, clip]) => ({
        name: String(name),
        clip: {
          frames: clip.frames.map((frame) => Number(frame) | 0),
          frame_duration_ticks: Math.max(1, Number(clip.frame_duration_ticks) || 1),
          loop_mode: String(clip.loop_mode || "loop"),
        },
      }));
  }

  /**
   * @param {EditorSnapshot} snapshot
   * @param {string} clipName
   */
  function findClip(snapshot, clipName) {
    return clipEntries(snapshot).find((entry) => entry.name === clipName) ?? null;
  }

  function renderPreviewToggle() {
    if (!elements.flipbookPreviewToggleBtn) {
      return;
    }
    elements.flipbookPreviewToggleBtn.textContent = previewPlaying ? "Stop Preview" : "Preview";
    elements.flipbookPreviewToggleBtn.setAttribute("aria-pressed", String(previewPlaying));
  }

  function previewSpeedMultiplier() {
    const raw = Number.parseFloat(String(elements.flipbookPreviewSpeedSelect?.value || "1"));
    if (!Number.isFinite(raw) || raw <= 0) {
      return 1;
    }
    return raw;
  }

  /**
   * @param {number} speed
   */
  function formatPreviewSpeed(speed) {
    return `${speed}x`;
  }

  /**
   * @param {string} message
   */
  function stopPreview(message) {
    if (!previewPlaying) {
      return;
    }
    previewPlaying = false;
    clearPreviewTimer();
    renderPreviewToggle();
    setStatus(message);
    if (typeof render === "function") {
      render();
    }
  }

  /**
   * @param {{ clip: { frames: number[], frame_duration_ticks: number, loop_mode?: string } } | null} entry
   * @returns {boolean}
   */
  function startPreviewTimer(entry) {
    const frames = entry?.clip?.frames || [];
    if (frames.length === 0) {
      return false;
    }
    const speed = previewSpeedMultiplier();
    const intervalMs = Math.max(
      40,
      Math.round(((Number(entry?.clip?.frame_duration_ticks) || 1) * 70) / speed)
    );
    previewTimerId = setInterval(() => {
      const snap = state.snapshot();
      const ctx = selectedClipContext();
      const max = (ctx.entry?.clip?.frames?.length || 1) - 1;
      if (max < 0) {
        return;
      }
      if (scrubFrameIndex < 0 || scrubFrameIndex > max) {
        scrubFrameIndex = 0;
      } else {
        const loopMode = String(ctx.entry?.clip?.loop_mode || "loop");
        if (loopMode === "once") {
          const next = Math.min(max, scrubFrameIndex + 1);
          scrubFrameIndex = next;
          if (next >= max) {
            stopPreview("Preview completed.");
          }
        } else if (loopMode === "ping_pong") {
          if (max <= 0) {
            scrubFrameIndex = 0;
          } else {
            const next = scrubFrameIndex + previewDirection;
            if (next >= max) {
              scrubFrameIndex = max;
              previewDirection = -1;
            } else if (next <= 0) {
              scrubFrameIndex = 0;
              previewDirection = 1;
            } else {
              scrubFrameIndex = next;
            }
          }
        } else {
          scrubFrameIndex = scrubFrameIndex >= max ? 0 : scrubFrameIndex + 1;
        }
      }
      syncFromSnapshot(snap);
    }, intervalMs);
    return true;
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderClipMeta(snapshot) {
    const durationInput = elements.flipbookFrameDurationInput;
    const loopSelect = elements.flipbookLoopModeSelect;
    if (!durationInput || !loopSelect) {
      return;
    }
    const clipName = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    const entry = findClip(snapshot, clipName);
    if (!entry) {
      durationInput.value = "8";
      loopSelect.value = "loop";
      return;
    }
    durationInput.value = String(Math.max(1, Number(entry.clip.frame_duration_ticks) || 1));
    const nextLoopMode = String(entry.clip.loop_mode || "loop");
    loopSelect.value = ["loop", "once", "ping_pong"].includes(nextLoopMode) ? nextLoopMode : "loop";
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderClipSelect(snapshot) {
    const select = elements.flipbookClipSelect;
    if (!select) {
      return;
    }
    const entries = clipEntries(snapshot);
    const current = selectedClipName(snapshot);
    const nextValue = entries.some((entry) => entry.name === current)
      ? current
      : entries[0]?.name || "";
    select.replaceChildren();
    if (entries.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No clip selected";
      select.append(option);
      select.value = "";
      return;
    }
    for (const entry of entries) {
      const option = document.createElement("option");
      option.value = entry.name;
      option.textContent = entry.name;
      select.append(option);
    }
    select.value = nextValue;
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderFrameStrip(snapshot) {
    const strip = elements.flipbookFrameStrip;
    if (!strip) {
      return;
    }
    const clipName = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    const entry = findClip(snapshot, clipName);
    if (!entry) {
      const empty = document.createElement("p");
      empty.className = "flipbook-empty";
      empty.textContent = "No frames yet. Add frames from selected sprite sheet.";
      strip.replaceChildren(empty);
      return;
    }
    const row = document.createElement("div");
    row.className = "flipbook-frame-strip-row";
    const currentFrameIndex = Number(selectedAnimation(snapshot)?.state?.current_frame_index ?? -1);
    const displayedIndex =
      scrubFrameIndex >= 0 && scrubFrameIndex < entry.clip.frames.length
        ? scrubFrameIndex
        : currentFrameIndex;
    if (selectedFrameSlot < 0 || selectedFrameSlot >= entry.clip.frames.length) {
      selectedFrameSlot = currentFrameIndex >= 0 ? currentFrameIndex : 0;
    }
    const sprite = selectedSpriteSource(snapshot);
    const spriteMeta = ensureSpriteMeta(sprite.assetId, sprite.src);
    const atlasCols =
      spriteMeta && Number.isFinite(spriteMeta.width)
        ? Math.max(1, Math.floor(spriteMeta.width / 16))
        : 1;

    for (let i = 0; i < entry.clip.frames.length; i += 1) {
      const chip = document.createElement("button");
      chip.type = "button";
      const isSelected = i === selectedFrameSlot;
      const isActive = i === displayedIndex;
      chip.className = `flipbook-frame-chip${isActive ? " active" : ""}${isSelected ? " selected" : ""}`;
      chip.title = `Frame slot ${i} (click to select, double-click to edit)`;
      const value = entry.clip.frames[i];
      if (spriteMeta && sprite.src) {
        const thumb = document.createElement("span");
        thumb.className = "flipbook-frame-thumb";
        const col = Math.max(0, value % atlasCols);
        const rowIndex = Math.max(0, Math.floor(value / atlasCols));
        thumb.style.backgroundImage = `url("${sprite.src}")`;
        thumb.style.backgroundSize = `${spriteMeta.width}px ${spriteMeta.height}px`;
        thumb.style.backgroundPosition = `${-col * 16}px ${-rowIndex * 16}px`;
        chip.append(thumb);
      }
      const label = document.createElement("span");
      label.className = "flipbook-frame-label";
      label.textContent = `#${i} = ${value}`;
      chip.append(label);
      chip.addEventListener("click", () => {
        selectedFrameSlot = i;
        renderFrameStrip(state.snapshot());
      });
      chip.addEventListener("dblclick", () => {
        void onEditFrameAt(i);
      });
      row.append(chip);
    }
    strip.replaceChildren(row);
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderScrub(snapshot) {
    const scrubInput = elements.flipbookScrubInput;
    const scrubLabel = elements.flipbookScrubLabel;
    const clipName = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    const entry = findClip(snapshot, clipName);
    if (!scrubInput || !scrubLabel) {
      return;
    }
    if (!entry || entry.clip.frames.length === 0) {
      scrubInput.min = "0";
      scrubInput.max = "0";
      scrubInput.value = "0";
      scrubInput.disabled = true;
      scrubLabel.textContent = "Frame: -";
      return;
    }
    const max = entry.clip.frames.length - 1;
    const runtimeIndex = Number(selectedAnimation(snapshot)?.state?.current_frame_index ?? 0);
    const safeRuntime = runtimeIndex >= 0 && runtimeIndex <= max ? runtimeIndex : 0;
    if (scrubFrameIndex < 0 || scrubFrameIndex > max) {
      scrubFrameIndex = safeRuntime;
    }
    scrubInput.disabled = false;
    scrubInput.min = "0";
    scrubInput.max = String(max);
    scrubInput.value = String(scrubFrameIndex);
    const frameValue = entry.clip.frames[scrubFrameIndex] ?? 0;
    const previewSuffix = previewPlaying
      ? ` (Preview @ ${formatPreviewSpeed(previewSpeedMultiplier())})`
      : "";
    scrubLabel.textContent = `Frame: slot ${scrubFrameIndex} -> atlas ${frameValue}${previewSuffix}`;
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderSummary(snapshot) {
    if (!elements.flipbookSummary) {
      return;
    }
    const entity = selectedEntity(snapshot);
    if (!entity) {
      elements.flipbookSummary.textContent = "Select exactly one entity to edit flipbook clips.";
      return;
    }
    const clipCount = clipEntries(snapshot).length;
    elements.flipbookSummary.textContent = `${entity.name}: ${clipCount} clip${clipCount === 1 ? "" : "s"} available.`;
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function syncFromSnapshot(snapshot) {
    renderSummary(snapshot);
    renderClipSelect(snapshot);
    renderClipMeta(snapshot);
    renderFrameStrip(snapshot);
    renderScrub(snapshot);
    renderPreviewToggle();
  }

  function buildDefaultClip() {
    return {
      frames: [0],
      frame_duration_ticks: 8,
      loop_mode: "loop",
    };
  }

  function nextDefaultClipName(snapshot) {
    const used = new Set(clipEntries(snapshot).map((entry) => entry.name));
    let i = 1;
    while (used.has(`clip_${i}`)) {
      i += 1;
    }
    return `clip_${i}`;
  }

  async function onAddClip() {
    if (typeof state.addSelectedEntityAnimationClip !== "function") {
      setStatus("Animation clip action unavailable.");
      return;
    }
    try {
      const snapshot = state.snapshot();
      const clipName = nextDefaultClipName(snapshot);
      await state.addSelectedEntityAnimationClip(clipName, buildDefaultClip());
      if (typeof state.setSelectedEntityAnimationState === "function") {
        await state.setSelectedEntityAnimationState(clipName);
      }
      setStatus(`Created clip '${clipName}'.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Create clip failed: ${message}`);
    }
  }

  async function onRenameClip() {
    if (typeof state.addSelectedEntityAnimationClip !== "function") {
      setStatus("Animation clip action unavailable.");
      return;
    }
    const snapshot = state.snapshot();
    const oldName = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    if (!oldName) {
      setStatus("Choose a clip to rename.");
      return;
    }
    const entry = findClip(snapshot, oldName);
    if (!entry) {
      setStatus("Selected clip is missing.");
      return;
    }
    const nextName = window.prompt("Rename clip", oldName)?.trim() || "";
    if (!nextName || nextName === oldName) {
      return;
    }
    if (findClip(snapshot, nextName)) {
      setStatus(`Clip '${nextName}' already exists.`);
      return;
    }
    try {
      await state.addSelectedEntityAnimationClip(nextName, entry.clip);
      if (typeof state.setSelectedEntityAnimationState === "function") {
        await state.setSelectedEntityAnimationState(nextName);
      }
      // Remove old clip via generic components path if available.
      if (typeof state.setSelectedEntityComponents === "function") {
        const entity = selectedEntity(snapshot);
        const nextComponents = JSON.parse(JSON.stringify(entity?.components || {}));
        if (nextComponents.animation?.clips && typeof nextComponents.animation.clips === "object") {
          delete nextComponents.animation.clips[oldName];
          if (nextComponents.animation.state?.current_clip_name === oldName) {
            nextComponents.animation.state.current_clip_name = nextName;
          }
          await state.setSelectedEntityComponents(nextComponents);
        }
      }
      setStatus(`Renamed '${oldName}' to '${nextName}'.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Rename failed: ${message}`);
    }
  }

  async function onDeleteClip() {
    const snapshot = state.snapshot();
    const target = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    if (!target) {
      setStatus("Choose a clip to delete.");
      return;
    }
    const entries = clipEntries(snapshot);
    if (entries.length <= 1) {
      setStatus("At least one clip is required.");
      return;
    }
    if (typeof state.setSelectedEntityComponents !== "function") {
      setStatus("Delete clip requires component edit support.");
      return;
    }
    try {
      const entity = selectedEntity(snapshot);
      const nextComponents = JSON.parse(JSON.stringify(entity?.components || {}));
      if (!nextComponents.animation?.clips) {
        setStatus("Selected entity has no animation clip map.");
        return;
      }
      delete nextComponents.animation.clips[target];
      const remaining = Object.keys(nextComponents.animation.clips);
      if (nextComponents.animation.state?.current_clip_name === target) {
        nextComponents.animation.state.current_clip_name = remaining[0] || "default";
      }
      await state.setSelectedEntityComponents(nextComponents);
      setStatus(`Deleted clip '${target}'.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Delete failed: ${message}`);
    }
  }

  /**
   * @param {1 | -1} direction
   */
  async function mutateFrames(direction) {
    if (typeof state.addSelectedEntityAnimationClip !== "function") {
      setStatus("Animation clip action unavailable.");
      return;
    }
    const snapshot = state.snapshot();
    const clipName = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    const entry = findClip(snapshot, clipName);
    if (!entry) {
      setStatus("Choose a clip first.");
      return;
    }
    const next = {
      ...entry.clip,
      frames: [...entry.clip.frames],
    };
    if (direction > 0) {
      const frame = next.frames.length > 0 ? next.frames[next.frames.length - 1] : 0;
      next.frames.push(frame);
    } else {
      if (next.frames.length <= 1) {
        setStatus("Clip must keep at least one frame.");
        return;
      }
      next.frames.pop();
    }
    try {
      await state.addSelectedEntityAnimationClip(clipName, next);
      setStatus(direction > 0 ? "Frame added." : "Frame removed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Frame update failed: ${message}`);
    }
  }

  /**
   * @param {number} index
   */
  async function onEditFrameAt(index) {
    if (typeof state.addSelectedEntityAnimationClip !== "function") {
      setStatus("Animation clip action unavailable.");
      return;
    }
    const snapshot = state.snapshot();
    const clipName = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    const entry = findClip(snapshot, clipName);
    if (!entry) {
      setStatus("Choose a clip first.");
      return;
    }
    const existing = Number(entry.clip.frames[index] ?? 0) | 0;
    const raw = window.prompt(`Frame index for slot #${index}`, String(existing));
    if (raw == null) {
      return;
    }
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setStatus("Frame index must be a non-negative integer.");
      return;
    }
    const next = {
      ...entry.clip,
      frames: [...entry.clip.frames],
    };
    next.frames[index] = parsed;
    try {
      await state.addSelectedEntityAnimationClip(clipName, next);
      setStatus(`Updated slot #${index} to frame ${parsed}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Frame update failed: ${message}`);
    }
  }

  /**
   * @returns {{ clipName: string, entry: { name: string, clip: { frames: number[], frame_duration_ticks: number, loop_mode?: string } } | null, snapshot: EditorSnapshot }}
   */
  function selectedClipContext() {
    const snapshot = state.snapshot();
    const clipName = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    const entry = findClip(snapshot, clipName);
    return { clipName, entry, snapshot };
  }

  /**
   * @param {(frames: number[], index: number) => { frames: number[], nextIndex: number } | null} transform
   * @param {string} successMessage
   */
  async function mutateSelectedFrame(transform, successMessage) {
    if (typeof state.addSelectedEntityAnimationClip !== "function") {
      setStatus("Animation clip action unavailable.");
      return;
    }
    const { clipName, entry } = selectedClipContext();
    if (!entry) {
      setStatus("Choose a clip first.");
      return;
    }
    const baseFrames = [...entry.clip.frames];
    const baseIndex =
      selectedFrameSlot >= 0 && selectedFrameSlot < baseFrames.length ? selectedFrameSlot : 0;
    const result = transform(baseFrames, baseIndex);
    if (!result) {
      return;
    }
    const nextClip = {
      ...entry.clip,
      frames: result.frames,
    };
    try {
      await state.addSelectedEntityAnimationClip(clipName, nextClip);
      selectedFrameSlot = result.nextIndex;
      setStatus(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Frame operation failed: ${message}`);
    }
  }

  async function onDuplicateFrame() {
    await mutateSelectedFrame((frames, index) => {
      const value = frames[index] ?? 0;
      const next = [...frames];
      next.splice(index + 1, 0, value);
      return { frames: next, nextIndex: index + 1 };
    }, "Frame duplicated.");
  }

  async function onMoveFrameLeft() {
    await mutateSelectedFrame((frames, index) => {
      if (index <= 0) {
        setStatus("Frame is already at the start.");
        return null;
      }
      const next = [...frames];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return { frames: next, nextIndex: index - 1 };
    }, "Frame moved left.");
  }

  async function onMoveFrameRight() {
    await mutateSelectedFrame((frames, index) => {
      if (index >= frames.length - 1) {
        setStatus("Frame is already at the end.");
        return null;
      }
      const next = [...frames];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return { frames: next, nextIndex: index + 1 };
    }, "Frame moved right.");
  }

  async function onSelectClip() {
    const name = elements.flipbookClipSelect?.value || "";
    if (!name || typeof state.setSelectedEntityAnimationState !== "function") {
      return;
    }
    try {
      await state.setSelectedEntityAnimationState(name);
      scrubFrameIndex = -1;
      previewDirection = 1;
      setStatus(`Active clip: ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Set state failed: ${message}`);
    }
  }

  async function saveClipMeta() {
    if (typeof state.addSelectedEntityAnimationClip !== "function") {
      return;
    }
    const snapshot = state.snapshot();
    const clipName = elements.flipbookClipSelect?.value || selectedClipName(snapshot);
    const entry = findClip(snapshot, clipName);
    if (!entry) {
      return;
    }
    const next = {
      ...entry.clip,
      frame_duration_ticks: Math.max(
        1,
        Number.parseInt(String(elements.flipbookFrameDurationInput?.value || "1"), 10) || 1
      ),
      loop_mode: String(elements.flipbookLoopModeSelect?.value || "loop"),
    };
    try {
      await state.addSelectedEntityAnimationClip(clipName, next);
      setStatus("Clip timing updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Clip timing update failed: ${message}`);
    }
  }

  function onTogglePreview() {
    const nextPlaying = !previewPlaying;
    clearPreviewTimer();
    previewPlaying = nextPlaying;
    if (nextPlaying) {
      previewDirection = 1;
      const { entry } = selectedClipContext();
      startPreviewTimer(entry);
    }
    renderPreviewToggle();
    syncFromSnapshot(state.snapshot());
    const speed = previewSpeedMultiplier();
    setStatus(nextPlaying ? `Preview started (${formatPreviewSpeed(speed)}).` : "Preview stopped.");
    if (typeof render === "function") {
      render();
    }
  }

  function bindEvents() {
    if (elements.flipbookClipSelect) {
      const handler = () => void onSelectClip();
      elements.flipbookClipSelect.addEventListener("change", handler);
      disposers.push(() => elements.flipbookClipSelect?.removeEventListener("change", handler));
    }
    if (elements.flipbookScrubInput) {
      const handler = () => {
        const next = Number.parseInt(String(elements.flipbookScrubInput?.value || "0"), 10);
        scrubFrameIndex = Number.isFinite(next) ? next : 0;
        syncFromSnapshot(state.snapshot());
      };
      elements.flipbookScrubInput.addEventListener("input", handler);
      disposers.push(() => elements.flipbookScrubInput?.removeEventListener("input", handler));
    }
    if (elements.flipbookFrameDurationInput) {
      const handler = () => void saveClipMeta();
      elements.flipbookFrameDurationInput.addEventListener("change", handler);
      disposers.push(() =>
        elements.flipbookFrameDurationInput?.removeEventListener("change", handler)
      );
    }
    if (elements.flipbookLoopModeSelect) {
      const handler = () => void saveClipMeta();
      elements.flipbookLoopModeSelect.addEventListener("change", handler);
      disposers.push(() =>
        elements.flipbookLoopModeSelect?.removeEventListener("change", handler)
      );
    }
    if (elements.flipbookClipAddBtn) {
      const handler = () => void onAddClip();
      elements.flipbookClipAddBtn.addEventListener("click", handler);
      disposers.push(() => elements.flipbookClipAddBtn?.removeEventListener("click", handler));
    }
    if (elements.flipbookClipRenameBtn) {
      const handler = () => void onRenameClip();
      elements.flipbookClipRenameBtn.addEventListener("click", handler);
      disposers.push(() => elements.flipbookClipRenameBtn?.removeEventListener("click", handler));
    }
    if (elements.flipbookClipDeleteBtn) {
      const handler = () => void onDeleteClip();
      elements.flipbookClipDeleteBtn.addEventListener("click", handler);
      disposers.push(() => elements.flipbookClipDeleteBtn?.removeEventListener("click", handler));
    }
    if (elements.flipbookFrameAddBtn) {
      const handler = () => void mutateFrames(1);
      elements.flipbookFrameAddBtn.addEventListener("click", handler);
      disposers.push(() => elements.flipbookFrameAddBtn?.removeEventListener("click", handler));
    }
    if (elements.flipbookFrameRemoveBtn) {
      const handler = () => void mutateFrames(-1);
      elements.flipbookFrameRemoveBtn.addEventListener("click", handler);
      disposers.push(() => elements.flipbookFrameRemoveBtn?.removeEventListener("click", handler));
    }
    if (elements.flipbookFrameDuplicateBtn) {
      const handler = () => void onDuplicateFrame();
      elements.flipbookFrameDuplicateBtn.addEventListener("click", handler);
      disposers.push(() =>
        elements.flipbookFrameDuplicateBtn?.removeEventListener("click", handler)
      );
    }
    if (elements.flipbookFrameLeftBtn) {
      const handler = () => void onMoveFrameLeft();
      elements.flipbookFrameLeftBtn.addEventListener("click", handler);
      disposers.push(() => elements.flipbookFrameLeftBtn?.removeEventListener("click", handler));
    }
    if (elements.flipbookFrameRightBtn) {
      const handler = () => void onMoveFrameRight();
      elements.flipbookFrameRightBtn.addEventListener("click", handler);
      disposers.push(() => elements.flipbookFrameRightBtn?.removeEventListener("click", handler));
    }
    if (elements.flipbookPreviewToggleBtn) {
      elements.flipbookPreviewToggleBtn.addEventListener("click", onTogglePreview);
      disposers.push(() =>
        elements.flipbookPreviewToggleBtn?.removeEventListener("click", onTogglePreview)
      );
    }
    if (elements.flipbookPreviewSpeedSelect) {
      const handler = () => {
        if (!previewPlaying) {
          return;
        }
        const { entry } = selectedClipContext();
        clearPreviewTimer();
        startPreviewTimer(entry);
        const speed = previewSpeedMultiplier();
        setStatus(`Preview speed set to ${formatPreviewSpeed(speed)}.`);
        if (typeof render === "function") {
          render();
        }
      };
      elements.flipbookPreviewSpeedSelect.addEventListener("change", handler);
      disposers.push(() =>
        elements.flipbookPreviewSpeedSelect?.removeEventListener("change", handler)
      );
    }
    if (state.events) {
      disposers.push(state.events.on("editor:state-updated", (snapshot) => syncFromSnapshot(snapshot)));
      disposers.push(state.events.on("components:updated", () => syncFromSnapshot(state.snapshot())));
    }
    syncFromSnapshot(state.snapshot());
  }

  function dispose() {
    clearPreviewTimer();
    disposers.forEach((disposeFn) => disposeFn());
    disposers.length = 0;
  }

  return {
    bindEvents,
    dispose,
    syncFromSnapshot,
  };
}
