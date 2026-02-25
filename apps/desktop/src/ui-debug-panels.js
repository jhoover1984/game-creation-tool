import { buildWatchSections, traceFilterKey, traceMatches } from "./ui-debug-helpers.js";

export function createDebugPanelsController({ elements, render }) {
  let activeWatchFilter = "all";
  let activeTraceFilter = "all";
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

    addListener(elements.traceFilters, "click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const filter = target.getAttribute("data-trace-filter");
      if (!filter) {
        return;
      }
      activeTraceFilter = filter;
      requestRender();
    });

    addListener(elements.traceLines, "click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const kind = target.getAttribute("data-trace-kind");
      if (!kind) {
        return;
      }
      activeTraceFilter = kind;
      requestRender();
      if (elements.traceLines) {
        elements.traceLines.scrollTop = 0;
      }
    });

    addListener(elements.watchFilterAllBtn, "click", () => setWatchFilter("all"));
    addListener(elements.watchFilterFlagsBtn, "click", () => setWatchFilter("flags"));
    addListener(elements.watchFilterVarsBtn, "click", () => setWatchFilter("vars"));
    addListener(elements.watchFilterInventoryBtn, "click", () => setWatchFilter("inventory"));
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  function setWatchFilter(filter) {
    activeWatchFilter = filter;
    requestRender();
  }

  function renderTraceFilterButtons() {
    if (!elements.traceFilters) {
      return;
    }
    elements.traceFilters.querySelectorAll("button[data-trace-filter]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.getAttribute("data-trace-filter") === activeTraceFilter
      );
    });
  }

  function renderWatchFilterButtons() {
    elements.watchFilterAllBtn?.classList.toggle("active", activeWatchFilter === "all");
    elements.watchFilterFlagsBtn?.classList.toggle("active", activeWatchFilter === "flags");
    elements.watchFilterVarsBtn?.classList.toggle("active", activeWatchFilter === "vars");
    elements.watchFilterInventoryBtn?.classList.toggle("active", activeWatchFilter === "inventory");
  }

  function renderTrace(snapshot) {
    if (!elements.traceLines) {
      return;
    }
    const events = snapshot.playtestTrace || [];
    const filtered = events.filter((event) => traceMatches(event, activeTraceFilter));
    if (events.length === 0) {
      const row = document.createElement("li");
      row.textContent = "No trace events.";
      elements.traceLines.replaceChildren(row);
      renderTraceFilterButtons();
      return;
    }
    if (filtered.length === 0) {
      const row = document.createElement("li");
      row.textContent = "No events for current trace filter.";
      elements.traceLines.replaceChildren(row);
      renderTraceFilterButtons();
      return;
    }
    const rows = document.createDocumentFragment();
    filtered.slice(-8).forEach((event) => {
      const row = document.createElement("li");
      const content = document.createElement("span");
      content.className = "trace-row";
      content.append(document.createTextNode(`[#${event.seq}] `));

      const frame = document.createElement("span");
      frame.className = "trace-frame";
      frame.textContent = `f${event.frame}`;
      content.append(frame);

      const kind = traceFilterKey(event.kind);
      const kindChip = document.createElement("button");
      kindChip.className = `trace-kind-chip${activeTraceFilter === kind ? " active" : ""}`;
      kindChip.setAttribute("data-trace-kind", kind);
      kindChip.textContent = event.kind;
      content.append(kindChip);

      const message = document.createElement("span");
      message.textContent = event.message;
      content.append(message);
      row.append(content);
      rows.append(row);
    });
    elements.traceLines.replaceChildren(rows);
    renderTraceFilterButtons();
  }

  function renderWatch(snapshot) {
    if (elements.watchSelected) {
      const selected = snapshot.watchSelectedEntity;
      elements.watchSelected.textContent = selected
        ? `Selected: ${selected.name} (#${selected.id}) @ (${selected.position.x}, ${selected.position.y})`
        : "No selected entity.";
    }

    if (!elements.watchFlags) {
      return;
    }
    const flags = snapshot.watchFlags || [];
    const vars = snapshot.watchVariables || [];
    const inventory = snapshot.watchInventory || [];
    const selectedFlags = snapshot.watchSelectedFlags || [];
    const selectedVars = snapshot.watchSelectedVariables || [];
    const selectedInventory = snapshot.watchSelectedInventory || [];
    const sections = buildWatchSections(
      {
        flags,
        vars,
        inventory,
        selectedFlags,
        selectedVars,
        selectedInventory,
      },
      activeWatchFilter
    );

    const visibleRows = sections.reduce((count, section) => count + section.rows.length, 0);
    if (visibleRows === 0) {
      const row = document.createElement("li");
      row.textContent = "No watch data.";
      elements.watchFlags.replaceChildren(row);
      renderWatchFilterButtons();
      return;
    }
    const rows = document.createDocumentFragment();
    sections.forEach((section) => {
      const titleRow = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = section.title;
      titleRow.append(title);
      rows.append(titleRow);
      section.rows.forEach((item) => {
        const row = document.createElement("li");
        row.textContent = `${item.key}: ${String(item.value)}`;
        rows.append(row);
      });
    });
    elements.watchFlags.replaceChildren(rows);
    renderWatchFilterButtons();
  }

  function renderIssues({ recoveryActions, entries }) {
    if (!elements.issuesList) {
      return;
    }
    const rows = document.createDocumentFragment();
    recoveryActions.forEach((item) => {
      const row = document.createElement("li");
      row.append(document.createTextNode(`${item.message} `));
      const actionButton = document.createElement("button");
      actionButton.className = "issue-fix-btn";
      actionButton.setAttribute("data-issue-action", item.action);
      actionButton.textContent = item.label;
      row.append(actionButton);
      rows.append(row);
    });

    entries.forEach((entry) => {
      if (entry.kind === "draw_preset_warning") {
        const severity = ["info", "warning", "error"].includes(entry.severity)
          ? entry.severity
          : "warning";
        const row = document.createElement("li");
        row.className = `issue-row issue-row-${severity}`;
        row.setAttribute("data-issue-kind", "draw_preset_warning");
        const severityChip = document.createElement("span");
        severityChip.className = `issue-severity issue-severity-${severity}`;
        severityChip.textContent = severity;
        const message = document.createElement("span");
        message.textContent = entry.message;
        row.append(severityChip, message);
        rows.append(row);
        return;
      }
      const row = document.createElement("li");
      row.append(document.createTextNode(entry.message));
      if (entry.kind === "script_error") {
        const fixable =
          entry.code === "missing_source_node" || entry.code === "missing_target_node";
        if (fixable) {
          row.append(document.createTextNode(" "));
          const fixButton = document.createElement("button");
          fixButton.className = "issue-fix-btn";
          fixButton.setAttribute("data-script-fix-code", entry.code);
          fixButton.setAttribute("data-script-fix-node-id", entry.nodeId);
          fixButton.textContent = "Auto-fix";
          row.append(fixButton);
        }
      }
      rows.append(row);
    });

    if (recoveryActions.length === 0 && entries.length === 0) {
      const emptyRow = document.createElement("li");
      emptyRow.textContent = "No active issues.";
      rows.append(emptyRow);
    }

    elements.issuesList.replaceChildren(rows);
  }

  return {
    bindEvents,
    dispose,
    renderTrace,
    renderWatch,
    renderIssues,
  };
}
