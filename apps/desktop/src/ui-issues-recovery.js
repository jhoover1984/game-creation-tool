const ASSISTED_PROFILE_LIMITS = {
  game_boy: 6,
  nes: 10,
  snes: 14,
};

const ASSISTED_PROFILE_SUFFIX = {
  game_boy: "GB",
  nes: "NES",
  snes: "SNES",
};

const EMPTY_GUARDRAIL = {
  issue: "",
  tip: "",
  level: "none",
  profile: "game_boy",
  count: 0,
  cap: 0,
};

const RETRYABLE_RUNTIME_ACTIONS = {
  refreshHealth: {
    label: "Retry Health Check",
    message: "Health check failed.",
  },
  refreshEditorState: {
    label: "Retry Reload",
    message: "State reload failed.",
  },
  addEntity: {
    label: "Retry Add Entity",
    message: "Add entity failed.",
  },
  deleteSelected: {
    label: "Retry Delete",
    message: "Delete selected failed.",
  },
  undo: {
    label: "Retry Undo",
    message: "Undo failed.",
  },
  redo: {
    label: "Retry Redo",
    message: "Redo failed.",
  },
  reselectPrevious: {
    label: "Retry Reselect",
    message: "Reselect previous failed.",
  },
  togglePlayPause: {
    label: "Retry Pause/Resume",
    message: "Pause/Resume failed.",
  },
  stepPlaytestFrame: {
    label: "Retry Step Frame",
    message: "Step frame failed.",
  },
  setTraceEnabled: {
    label: "Retry Trace Toggle",
    message: "Trace toggle failed.",
  },
  setBreakpoints: {
    label: "Retry Breakpoint Update",
    message: "Breakpoint update failed.",
  },
  validateScriptGraphInput: {
    label: "Retry Script Validation",
    message: "Script validation failed.",
  },
  exportPreview: {
    label: "Retry Export Preview",
    message: "Export preview failed.",
  },
};

export function createIssuesRecoveryController({
  elements,
  state,
  drawSeedController,
  debugPanelsController,
  render,
}) {
  function requestRender() {
    if (typeof render === "function") {
      render();
    }
  }

  function selectedAssistedProfile() {
    const profile = elements.assistedProfileSelect?.value || "game_boy";
    return ASSISTED_PROFILE_LIMITS[profile] ? profile : "game_boy";
  }

  function assistedCountForProfile(snapshot, profile) {
    const suffix = ASSISTED_PROFILE_SUFFIX[profile];
    if (!suffix) {
      return 0;
    }
    const entities = Array.isArray(snapshot.entities) ? snapshot.entities : [];
    return entities.filter(
      (entity) => typeof entity.name === "string" && entity.name.endsWith(`(${suffix})`)
    ).length;
  }

  function buildAssistedGuardrail(snapshot) {
    const profile = selectedAssistedProfile();
    const cap = ASSISTED_PROFILE_LIMITS[profile];
    const count = assistedCountForProfile(snapshot, profile);
    if (!cap || count <= 0) {
      return { ...EMPTY_GUARDRAIL, profile, count, cap: cap || 0 };
    }

    const label = profile === "game_boy" ? "Game Boy" : profile.toUpperCase();
    if (count >= cap) {
      return {
        issue: `Assisted content limit reached (${label}): ${count}/${cap} primitive props. Switch profile or clean up existing props.`,
        tip: `Assisted ${label} profile is at capacity (${count}/${cap}). Consider NES/SNES profile for more generated props.`,
        level: "full",
        profile,
        count,
        cap,
      };
    }

    const nearThreshold = Math.ceil(cap * 0.8);
    if (count >= nearThreshold) {
      return {
        issue: `Assisted content near ${label} profile cap: ${count}/${cap} primitive props.`,
        tip: `Assisted ${label} profile is near limit (${count}/${cap}). Plan space before generating more primitives.`,
        level: "near",
        profile,
        count,
        cap,
      };
    }

    return { ...EMPTY_GUARDRAIL, profile, count, cap };
  }

  function buildAssistedGuardrailActions(snapshot) {
    const guardrail = buildAssistedGuardrail(snapshot);
    if (guardrail.level === "none") {
      return [];
    }

    const actions = [
      {
        action: "assisted_cleanup_profile",
        label: "Clean Generated Props",
        message: "Remove generated props for the selected assisted profile.",
      },
    ];

    if (guardrail.profile !== "nes") {
      actions.push({
        action: "assisted_switch_nes",
        label: "Switch to NES",
        message: "Use NES assisted profile for a larger primitive budget.",
      });
    }
    if (guardrail.profile !== "snes") {
      actions.push({
        action: "assisted_switch_snes",
        label: "Switch to SNES",
        message: "Use SNES assisted profile for the largest primitive budget.",
      });
    }
    if (guardrail.profile !== "game_boy") {
      actions.push({
        action: "assisted_switch_game_boy",
        label: "Switch to Game Boy",
        message: "Switch back to Game Boy assisted profile.",
      });
    }

    return actions;
  }

  function buildIssueRecoveryActions(snapshot) {
    const info = snapshot.lastError;
    if (!info?.action) {
      return [];
    }
    const action = info.action;
    if (action === "open") {
      return [{ action: "retry_open", label: "Retry Open", message: "Open failed." }];
    }
    if (action === "save") {
      return [{ action: "retry_save", label: "Retry Save", message: "Save failed." }];
    }
    if (action === "tickPlaytest" || action === "enterPlaytest" || action === "exitPlaytest") {
      return [
        {
          action: "restart_playtest",
          label: "Restart Playtest",
          message: "Playtest command failed.",
        },
        {
          action: "reload_editor",
          label: "Reload Editor State",
          message: "Refresh editor/runtime state from source.",
        },
      ];
    }
    if (
      action === "window:error" ||
      action === "window:unhandledrejection" ||
      action === "tickPlaytest" ||
      action === "moveSelectedBy" ||
      action === "selectEntities" ||
      action === "paintTileAt" ||
      action === "eraseTileAt" ||
      action === "applyTileStroke"
    ) {
      return [
        {
          action: "reload_editor",
          label: "Reload Editor State",
          message: "Runtime command failed.",
        },
      ];
    }
    const retryConfig = RETRYABLE_RUNTIME_ACTIONS[action];
    if (retryConfig) {
      return [
        {
          action: "retry_last_action",
          label: retryConfig.label,
          message: retryConfig.message,
        },
        {
          action: "reload_editor",
          label: "Reload Editor State",
          message: "Recover by refreshing current editor state.",
        },
      ];
    }
    return [
      {
        action: "reload_editor",
        label: "Reload Editor State",
        message: "Recover by refreshing current editor state.",
      },
    ];
  }

  function buildDrawPresetIssueActions() {
    if (drawSeedController.getImportWarnings().length === 0) {
      return [];
    }
    return [
      {
        action: "dismiss_draw_preset_warnings",
        label: "Dismiss",
        message: "Draw preset import warnings are active.",
      },
    ];
  }

  function renderIssues(snapshot, baseIssues) {
    const recoveryActions = [
      ...buildIssueRecoveryActions(snapshot),
      ...buildAssistedGuardrailActions(snapshot),
      ...buildDrawPresetIssueActions(),
    ];
    const scriptValidation = snapshot.scriptValidation || {};
    const entries = baseIssues.map((message) => ({
      kind: "base",
      message,
    }));
    if (scriptValidation.parseError) {
      entries.push({
        kind: "script_parse",
        message: `Script validation: ${scriptValidation.parseError}`,
      });
    }
    (scriptValidation.errors || []).forEach((error) => {
      entries.push({
        kind: "script_error",
        code: error.code,
        nodeId: error.node_id || "",
        message: `Script ${error.code}: ${error.message}`,
      });
    });
    drawSeedController.getImportWarnings().forEach((warning) => {
      entries.push({
        kind: "draw_preset_warning",
        code: warning.code,
        severity: warning.severity,
        message: warning.message,
      });
    });
    debugPanelsController.renderIssues({
      recoveryActions,
      entries,
    });
  }

  async function runIssueRecoveryAction(action) {
    if (action === "reload_editor") {
      await state.refreshEditorState();
      requestRender();
      return;
    }
    if (action === "retry_open") {
      await state.open(state.snapshot().projectDir || ".");
      requestRender();
      return;
    }
    if (action === "retry_save") {
      await state.save();
      requestRender();
      return;
    }
    if (action === "restart_playtest") {
      const snapshot = state.snapshot();
      if (snapshot.playtest.active) {
        await state.exitPlaytest();
      }
      await state.enterPlaytest();
      requestRender();
      return;
    }
    if (
      action === "assisted_switch_game_boy" ||
      action === "assisted_switch_nes" ||
      action === "assisted_switch_snes"
    ) {
      if (!elements.assistedProfileSelect) {
        return;
      }
      if (action === "assisted_switch_game_boy") {
        elements.assistedProfileSelect.value = "game_boy";
      } else if (action === "assisted_switch_nes") {
        elements.assistedProfileSelect.value = "nes";
      } else if (action === "assisted_switch_snes") {
        elements.assistedProfileSelect.value = "snes";
      }
      requestRender();
      return;
    }
    if (action === "assisted_cleanup_profile") {
      const profile = selectedAssistedProfile();
      await state.cleanupAssistedGenerated(profile);
      requestRender();
      return;
    }
    if (action === "dismiss_draw_preset_warnings") {
      drawSeedController.clearImportWarnings();
      requestRender();
    }
    if (action === "retry_last_action") {
      const snapshot = state.snapshot();
      const failedAction = snapshot?.lastError?.action || "";
      if (failedAction === "refreshHealth") {
        await state.refreshHealth();
      } else if (failedAction === "refreshEditorState") {
        await state.refreshEditorState();
      } else if (failedAction === "addEntity") {
        await state.addEntity();
      } else if (failedAction === "deleteSelected") {
        await state.deleteSelected();
      } else if (failedAction === "undo") {
        await state.undo();
      } else if (failedAction === "redo") {
        await state.redo();
      } else if (failedAction === "reselectPrevious") {
        await state.reselectPrevious();
      } else if (failedAction === "togglePlayPause") {
        await state.togglePlayPause();
      } else if (failedAction === "stepPlaytestFrame") {
        await state.stepPlaytestFrame();
      } else if (failedAction === "setTraceEnabled") {
        await state.setTraceEnabled(!!snapshot?.diagnostics?.trace);
      } else if (failedAction === "setBreakpoints") {
        const enabledKinds = (snapshot?.playtestBreakpoints || [])
          .filter((entry) => entry?.value)
          .map((entry) => entry.key)
          .filter((key) => typeof key === "string" && key.length > 0);
        await state.setBreakpoints(enabledKinds);
      } else if (failedAction === "validateScriptGraphInput") {
        await state.validateScriptGraphInput(snapshot?.scriptValidation?.lastInput || "{}");
      } else if (failedAction === "exportPreview") {
        await state.exportPreview();
      } else {
        await state.refreshEditorState();
      }
      requestRender();
    }
  }

  return {
    buildAssistedGuardrail,
    renderIssues,
    runIssueRecoveryAction,
  };
}
