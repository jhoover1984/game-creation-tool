export function createScriptLabController({ elements, state, render, log }) {
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
    addListener(elements.scriptValidateBtn, "click", async () => {
      if (!elements.scriptGraphInput) {
        return;
      }
      await state.validateScriptGraphInput(elements.scriptGraphInput.value);
      requestRender();
    });
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  function renderValidationSummary(snapshot) {
    if (!elements.scriptValidationSummary) {
      return;
    }
    const scriptValidation = snapshot.scriptValidation || {};
    if (scriptValidation.parseError) {
      elements.scriptValidationSummary.textContent = scriptValidation.parseError;
      return;
    }
    if ((scriptValidation.errors || []).length > 0) {
      elements.scriptValidationSummary.textContent = `${scriptValidation.errors.length} issue(s) found.`;
      return;
    }
    if (scriptValidation.lastInput) {
      elements.scriptValidationSummary.textContent = "Script graph is valid.";
      return;
    }
    elements.scriptValidationSummary.textContent = "Paste graph JSON and validate.";
  }

  async function applyIssueAutoFix(code, nodeId) {
    if (!elements.scriptGraphInput) {
      return;
    }
    let graph;
    try {
      graph = JSON.parse(elements.scriptGraphInput.value);
    } catch (error) {
      log(`Auto-fix failed: invalid graph JSON (${error?.message || String(error)}).`);
      return;
    }

    const nodes = Array.isArray(graph.nodes) ? [...graph.nodes] : [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    if (nodeId) {
      const hasNode = nodeIds.has(nodeId);
      if (!hasNode) {
        const kind = code === "missing_source_node" ? "event" : "action";
        nodes.push({ id: nodeId, kind });
        nodeIds.add(nodeId);
      }
    }

    // Hardened fallback: if node_id was absent, derive fix from graph edges.
    if (code === "missing_source_node" || code === "missing_target_node") {
      const edges = Array.isArray(graph.edges) ? graph.edges : [];
      for (const edge of edges) {
        if (edge?.from && !nodeIds.has(edge.from)) {
          nodes.push({ id: edge.from, kind: "event" });
          nodeIds.add(edge.from);
        }
        if (edge?.to && !nodeIds.has(edge.to)) {
          nodes.push({ id: edge.to, kind: "action" });
          nodeIds.add(edge.to);
        }
      }
    }
    const nextGraph = {
      nodes,
      edges: Array.isArray(graph.edges) ? graph.edges : [],
    };
    elements.scriptGraphInput.value = JSON.stringify(nextGraph, null, 2);
    await state.validateScriptGraphInput(elements.scriptGraphInput.value);
    log(`Auto-fix applied for ${code} (${nodeId}).`);
    requestRender();
  }

  return {
    bindEvents,
    dispose,
    renderValidationSummary,
    applyIssueAutoFix,
  };
}
