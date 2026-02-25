import {
  DASHBOARD_TEMPLATE_CATALOG,
  DASHBOARD_TEMPLATE_DEFAULT,
} from "./ui-dashboard-templates.js";
import {
  DASHBOARD_RECENT_STORAGE_KEY,
  MAX_RECENT_PROJECTS,
  UI_PROFILE_STORAGE_KEY,
} from "./ui-dashboard-config.js";
import { parseRecentProjects } from "./ui-dashboard-recents.js";
const DASHBOARD_TEMPLATE_IDS = new Set(DASHBOARD_TEMPLATE_CATALOG.map((template) => template.id));

/** @typedef {import("./types.js").EditorSnapshot} EditorSnapshot */

/**
 * @typedef {{
 *   newProjectFromTemplate: (template: string) => Promise<unknown>,
 *   open: (projectDir?: string) => Promise<unknown>,
 *   refreshEditorState: () => Promise<unknown>,
 *   refreshHealth: () => Promise<unknown>
 * }} LaunchDashboardStatePort
 */

/**
 * @typedef {{
 *   root: HTMLElement | null,
 *   editorRoot: HTMLElement | null,
 *   runtimeModeBadge: HTMLElement | null,
 *   status: HTMLElement | null,
 *   newBtn: HTMLElement | null,
 *   openBtn: HTMLElement | null,
 *   continueBtn: HTMLElement | null,
 *   recoverBtn: HTMLElement | null,
 *   templateSelect: HTMLSelectElement | null,
 *   profileSelect: HTMLSelectElement | null,
 *   uiModeSelect: HTMLSelectElement | null,
 *   recentList: HTMLElement | null,
 *   templateGrid: HTMLElement | null,
 *   workspaceTemplateSelect: HTMLSelectElement | null,
 *   workspaceUiProfileSelect: HTMLSelectElement | null,
 *   workspaceAssistedProfileSelect: HTMLSelectElement | null,
 *   workspaceDrawAssistedProfileSelect: HTMLSelectElement | null
 * }} LaunchDashboardElements
 */

/**
 * @typedef {{
 *   elements: LaunchDashboardElements,
 *   state: LaunchDashboardStatePort,
 *   applyStarterScriptForTemplate?: (template: string) => Promise<void>,
 *   log: (message: string) => void,
 *   getEntryMode: () => "launch_dashboard" | "editor_workspace",
 *   setEntryMode: (mode: string) => void,
 *   render: () => void
 * }} LaunchDashboardControllerDeps
 */

/**
 * @param {LaunchDashboardControllerDeps} deps
 */
export function createLaunchDashboardController({
  elements,
  state,
  applyStarterScriptForTemplate,
  log,
  getEntryMode,
  setEntryMode,
  render,
}) {
  const listeners = [];
  let eventsBound = false;
  let templatesHydrated = false;
  let recentProjects = readRecentProjects();

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

  function readRecentProjects() {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }
    return parseRecentProjects(
      window.localStorage.getItem(DASHBOARD_RECENT_STORAGE_KEY),
      MAX_RECENT_PROJECTS
    );
  }

  function writeRecentProjects() {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(DASHBOARD_RECENT_STORAGE_KEY, JSON.stringify(recentProjects));
    } catch {
      // Keep dashboard actions non-blocking if storage is unavailable.
    }
  }

  /**
   * @param {EditorSnapshot | null | undefined} snapshot
   * @param {string | undefined} fallbackDir
   */
  function upsertRecentProject(snapshot, fallbackDir = undefined, touchTimestamp = true) {
    const projectDir = String(snapshot?.projectDir || fallbackDir || "").trim();
    if (!projectDir) {
      return;
    }
    const projectName = String(snapshot?.projectName || "").trim() || "Untitled Project";
    const existing = recentProjects.find((entry) => entry.projectDir === projectDir);
    if (
      existing &&
      existing.projectName === projectName &&
      !touchTimestamp &&
      recentProjects[0]?.projectDir === projectDir
    ) {
      return;
    }
    const nextEntry = {
      projectDir,
      projectName,
      updatedAt: touchTimestamp ? Date.now() : existing?.updatedAt || Date.now(),
    };
    recentProjects = [nextEntry, ...recentProjects.filter((entry) => entry.projectDir !== projectDir)]
      .slice(0, MAX_RECENT_PROJECTS);
    writeRecentProjects();
  }

  function renderRecentProjects() {
    if (!elements.recentList) {
      return;
    }
    if (!recentProjects.length) {
      const empty = document.createElement("li");
      empty.textContent = "No recent projects yet.";
      elements.recentList.replaceChildren(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    recentProjects.forEach((entry) => {
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "launch-recent-item";
      button.setAttribute("data-dashboard-recent-dir", entry.projectDir);
      button.setAttribute("aria-label", `Open recent project ${entry.projectName}`);

      const title = document.createElement("strong");
      title.textContent = entry.projectName;
      const path = document.createElement("small");
      path.textContent = entry.projectDir;
      button.append(title, path);
      row.appendChild(button);
      fragment.appendChild(row);
    });
    elements.recentList.replaceChildren(fragment);
  }

  function setWorkspaceTemplate(value) {
    if (!elements.workspaceTemplateSelect || !value) {
      return;
    }
    elements.workspaceTemplateSelect.value = value;
  }

  function setWorkspaceUiProfile(value) {
    savePreferredUiProfile(value);
    if (!elements.workspaceUiProfileSelect || !value) {
      return;
    }
    if (elements.workspaceUiProfileSelect.value === value) {
      return;
    }
    elements.workspaceUiProfileSelect.value = value;
    elements.workspaceUiProfileSelect.dispatchEvent(
      new globalThis.Event("change", { bubbles: true })
    );
  }

  function selectedProjectProfile() {
    const value = elements.profileSelect?.value || "game_boy";
    return value === "nes" || value === "snes" ? value : "game_boy";
  }

  function setWorkspaceProjectProfile(value) {
    const profile = value === "nes" || value === "snes" ? value : "game_boy";
    if (
      elements.workspaceAssistedProfileSelect &&
      elements.workspaceAssistedProfileSelect.value !== profile
    ) {
      elements.workspaceAssistedProfileSelect.value = profile;
      elements.workspaceAssistedProfileSelect.dispatchEvent(
        new globalThis.Event("change", { bubbles: true })
      );
    }
    if (
      elements.workspaceDrawAssistedProfileSelect &&
      elements.workspaceDrawAssistedProfileSelect.value !== profile
    ) {
      elements.workspaceDrawAssistedProfileSelect.value = profile;
      elements.workspaceDrawAssistedProfileSelect.dispatchEvent(
        new globalThis.Event("change", { bubbles: true })
      );
    }
  }

  function savePreferredUiProfile(value) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    const normalized = value === "beginner" ? "beginner" : "builder";
    try {
      window.localStorage.setItem(UI_PROFILE_STORAGE_KEY, normalized);
    } catch {
      // Keep dashboard actions non-blocking if storage is unavailable.
    }
  }

  function setDashboardTemplate(value) {
    const normalized = normalizeTemplateId(value);
    if (!elements.templateSelect) {
      return;
    }
    elements.templateSelect.value = normalized;
    setWorkspaceTemplate(normalized);
    renderTemplateGrid();
  }

  function normalizeTemplateId(value) {
    return DASHBOARD_TEMPLATE_IDS.has(value) ? value : DASHBOARD_TEMPLATE_DEFAULT;
  }

  function replaceTemplateOptions(select) {
    if (
      !select ||
      typeof select !== "object" ||
      !("tagName" in select) ||
      String(select.tagName).toUpperCase() !== "SELECT"
    ) {
      return;
    }
    const selected = normalizeTemplateId(select.value);
    const nextOptions = DASHBOARD_TEMPLATE_CATALOG.map((template) => {
      const option = document.createElement("option");
      option.value = template.id;
      option.textContent = template.selectLabel;
      return option;
    });
    select.replaceChildren(...nextOptions);
    select.value = selected;
  }

  function renderTemplateGrid() {
    if (!elements.templateGrid) {
      return;
    }
    const selected = selectedTemplate();
    const fragment = document.createDocumentFragment();
    DASHBOARD_TEMPLATE_CATALOG.forEach((template) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "launch-template-card";
      card.setAttribute("data-dashboard-template", template.id);
      const isActive = template.id === selected;
      card.classList.toggle("active", isActive);
      card.setAttribute("aria-pressed", String(isActive));

      const title = document.createElement("strong");
      title.textContent = template.title;
      const eta = document.createElement("span");
      eta.textContent = template.eta;
      const difficulty = document.createElement("em");
      difficulty.textContent = template.difficulty;
      const summary = document.createElement("small");
      summary.textContent = template.summary;

      card.append(title, eta, difficulty, summary);
      fragment.appendChild(card);
    });
    elements.templateGrid.replaceChildren(fragment);
  }

  function hydrateTemplateCatalog() {
    if (templatesHydrated) {
      return;
    }
    templatesHydrated = true;
    replaceTemplateOptions(elements.templateSelect);
    replaceTemplateOptions(elements.workspaceTemplateSelect);
    renderTemplateGrid();
  }

  function selectedTemplate() {
    return normalizeTemplateId(elements.templateSelect?.value || DASHBOARD_TEMPLATE_DEFAULT);
  }

  function selectedUiProfile() {
    return elements.uiModeSelect?.value === "beginner" ? "beginner" : "builder";
  }

  async function runAction(action) {
    if (action === "new") {
      setWorkspaceTemplate(selectedTemplate());
      setWorkspaceUiProfile(selectedUiProfile());
      setWorkspaceProjectProfile(selectedProjectProfile());
      setEntryMode("editor_workspace");
      const template = selectedTemplate();
      const next = /** @type {EditorSnapshot} */ (await state.newProjectFromTemplate(template));
      if (typeof applyStarterScriptForTemplate === "function") {
        await applyStarterScriptForTemplate(template);
      }
      upsertRecentProject(next);
      log("Dashboard: created starter project.");
      requestRender();
      return;
    }
    if (action === "open") {
      setEntryMode("editor_workspace");
      const next = /** @type {EditorSnapshot} */ (await state.open());
      upsertRecentProject(next);
      log("Dashboard: opened project.");
      requestRender();
      return;
    }
    if (action === "continue") {
      if (recentProjects.length > 0) {
        await openRecentProject(recentProjects[0].projectDir);
        return;
      }
      setEntryMode("editor_workspace");
      const next = /** @type {EditorSnapshot} */ (await state.refreshEditorState());
      upsertRecentProject(next);
      log("Dashboard: resumed workspace.");
      requestRender();
      return;
    }
    if (action === "recover") {
      setEntryMode("editor_workspace");
      const opened = /** @type {EditorSnapshot} */ (await state.open());
      await state.refreshHealth();
      upsertRecentProject(opened);
      log("Dashboard: checked project health and recovery state.");
      requestRender();
    }
  }

  async function openRecentProject(projectDir) {
    const nextDir = String(projectDir || "").trim();
    if (!nextDir) {
      return;
    }
    setEntryMode("editor_workspace");
    const next = /** @type {EditorSnapshot} */ (await state.open(nextDir));
    upsertRecentProject(next, nextDir);
    log(`Dashboard: opened recent project (${nextDir}).`);
    requestRender();
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    hydrateTemplateCatalog();
    eventsBound = true;
    addListener(elements.newBtn, "click", async () => runAction("new"));
    addListener(elements.openBtn, "click", async () => runAction("open"));
    addListener(elements.continueBtn, "click", async () => runAction("continue"));
    addListener(elements.recoverBtn, "click", async () => runAction("recover"));
    addListener(elements.templateSelect, "change", () => {
      setWorkspaceTemplate(selectedTemplate());
      renderTemplateGrid();
      requestRender();
    });
    addListener(elements.profileSelect, "change", () => {
      setWorkspaceProjectProfile(selectedProjectProfile());
      requestRender();
    });
    addListener(elements.templateGrid, "click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const templateBtn = target.closest("[data-dashboard-template]");
      if (!(templateBtn instanceof HTMLElement)) {
        return;
      }
      const template = templateBtn.getAttribute("data-dashboard-template");
      if (!template) {
        return;
      }
      setDashboardTemplate(template);
      requestRender();
    });
    addListener(elements.recentList, "click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const recentBtn = target.closest("[data-dashboard-recent-dir]");
      if (!(recentBtn instanceof HTMLElement)) {
        return;
      }
      const projectDir = recentBtn.getAttribute("data-dashboard-recent-dir") || "";
      await openRecentProject(projectDir);
    });
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderDashboard(snapshot) {
    hydrateTemplateCatalog();
    renderRecentProjects();
    const inDashboard = getEntryMode() === "launch_dashboard";
    if (elements.root) {
      elements.root.hidden = !inDashboard;
    }
    if (elements.editorRoot) {
      elements.editorRoot.hidden = inDashboard;
    }

    if (elements.runtimeModeBadge) {
      const mode = snapshot.runtimeMode === "desktop_local" ? "Desktop Local" : "Web Mode";
      elements.runtimeModeBadge.textContent = mode;
      elements.runtimeModeBadge.classList.toggle(
        "desktop",
        snapshot.runtimeMode === "desktop_local"
      );
    }

    if (!elements.status) {
      return;
    }
    if (snapshot.lastError?.message) {
      elements.status.textContent = `Last error: ${snapshot.lastError.message}`;
      return;
    }
    if (snapshot.projectName) {
      elements.status.textContent = `Current project: ${snapshot.projectName}. Choose Continue Recent or Open.`;
      upsertRecentProject(snapshot, undefined, false);
      renderRecentProjects();
      return;
    }
    elements.status.textContent = "Choose a starter and click New or Open.";
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  return {
    bindEvents,
    dispose,
    renderDashboard,
  };
}
