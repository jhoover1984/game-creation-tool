export function createDrawAssistControlsController({
  elements,
  drawSeedController,
  triggerAssistedGeneration,
  render,
}) {
  let eventsBound = false;
  const listeners = [];

  function requestRender() {
    if (typeof render === "function") {
      render();
    }
  }

  function addListener(target, event, handler) {
    if (!target) {
      return;
    }
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    addListener(elements.assistedGenerateBtn, "click", async () => {
      const kind = elements.assistedPrimitiveSelect?.value || "tree";
      const profile = elements.assistedProfileSelect?.value || "game_boy";
      await triggerAssistedGeneration(kind, profile, "quick_start");
      requestRender();
    });

    addListener(elements.drawAssistedGenerateBtn, "click", async () => {
      const kind = elements.drawAssistedPrimitiveSelect?.value || "tree";
      const profile = elements.drawAssistedProfileSelect?.value || "game_boy";
      const points = drawSeedController.drawDraftAbsolutePoints();
      const fallbackBaseX = Math.max(
        0,
        Number.parseInt(elements.drawAssistedOffsetXInput?.value || "1", 10) || 0
      );
      const fallbackBaseY = Math.max(
        0,
        Number.parseInt(elements.drawAssistedOffsetYInput?.value || "1", 10) || 0
      );
      const minX = points.reduce((min, point) => Math.min(min, point.x), fallbackBaseX);
      const minY = points.reduce((min, point) => Math.min(min, point.y), fallbackBaseY);
      if (elements.assistedProfileSelect) {
        elements.assistedProfileSelect.value = profile;
      }
      if (elements.assistedPrimitiveSelect) {
        elements.assistedPrimitiveSelect.value = kind;
      }
      await triggerAssistedGeneration(kind, profile, "draw_studio", {
        baseX: minX,
        baseY: minY,
        points,
      });
      requestRender();
    });

    addListener(elements.drawAssistedPrimitiveSelect, "change", () =>
      drawSeedController.renderDraftPreview(true)
    );
    addListener(elements.drawAssistedProfileSelect, "change", () =>
      drawSeedController.renderDraftPreview()
    );
    addListener(elements.drawAssistedOffsetXInput, "input", () =>
      drawSeedController.renderDraftPreview()
    );
    addListener(elements.drawAssistedOffsetYInput, "input", () =>
      drawSeedController.renderDraftPreview()
    );
    addListener(elements.drawAssistedMirrorXInput, "change", () =>
      drawSeedController.renderDraftPreview(true)
    );

    addListener(elements.drawSeedPresetClusterBtn, "click", () =>
      drawSeedController.applyPreset("cluster")
    );
    addListener(elements.drawSeedPresetLineBtn, "click", () =>
      drawSeedController.applyPreset("line")
    );
    addListener(elements.drawSeedPresetRingBtn, "click", () =>
      drawSeedController.applyPreset("ring")
    );
    addListener(elements.drawSeedPresetTreeBtn, "click", () =>
      drawSeedController.applyPreset("tree")
    );
    addListener(elements.drawSeedPresetBushBtn, "click", () =>
      drawSeedController.applyPreset("bush")
    );
    addListener(elements.drawSeedPresetRockBtn, "click", () =>
      drawSeedController.applyPreset("rock")
    );
    addListener(elements.drawSeedPresetApplyBtn, "click", () =>
      drawSeedController.applyPreset(elements.drawSeedPresetSelect?.value || "tree")
    );
    addListener(elements.drawSeedPresetSaveBtn, "click", () => {
      drawSeedController.saveCurrentPreset();
      requestRender();
    });
    addListener(elements.drawSeedPresetCopyBtn, "click", () => {
      drawSeedController.copySelectedPreset();
      requestRender();
    });
    addListener(elements.drawSeedPresetDeleteBtn, "click", () => {
      drawSeedController.deleteSelectedPreset();
      requestRender();
    });
    addListener(elements.drawSeedPresetExportBtn, "click", () =>
      drawSeedController.exportSelectedPresetToJson()
    );
    addListener(elements.drawSeedPresetImportBtn, "click", () => {
      drawSeedController.importPresetFromJson();
      requestRender();
    });
    addListener(elements.drawSeedPresetSelect, "change", () =>
      drawSeedController.syncPresetButtons()
    );
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  return {
    bindEvents,
    dispose,
  };
}
