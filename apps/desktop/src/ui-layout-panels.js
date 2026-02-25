const LEFT_PANEL_STORAGE_KEY = "gcs.layout.left_collapsed.v1";
const RIGHT_PANEL_STORAGE_KEY = "gcs.layout.right_collapsed.v1";
const RIGHT_TAB_STORAGE_KEY = "gcs.layout.right_tab.v1";

const RIGHT_TAB_FALLBACK = "inspector";

function readBooleanPref(storageKey) {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function writeBooleanPref(storageKey, value, log) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, value ? "1" : "0");
  } catch (error) {
    const quotaExceeded = error && typeof error === "object" && error.name === "QuotaExceededError";
    const reason = quotaExceeded ? "storage quota exceeded" : "storage unavailable";
    if (typeof log === "function") {
      log(`Layout preference save skipped: ${reason}.`);
    }
  }
}

function readStringPref(storageKey, fallback = "") {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  try {
    const value = window.localStorage.getItem(storageKey);
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeStringPref(storageKey, value, log) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, value);
  } catch (error) {
    const quotaExceeded = error && typeof error === "object" && error.name === "QuotaExceededError";
    const reason = quotaExceeded ? "storage quota exceeded" : "storage unavailable";
    if (typeof log === "function") {
      log(`Layout preference save skipped: ${reason}.`);
    }
  }
}

export function createLayoutPanelsController({ elements, render, log }) {
  const listeners = [];
  let eventsBound = false;
  let leftCollapsed = readBooleanPref(LEFT_PANEL_STORAGE_KEY);
  let rightCollapsed = readBooleanPref(RIGHT_PANEL_STORAGE_KEY);
  let activeRightTab = readStringPref(RIGHT_TAB_STORAGE_KEY, RIGHT_TAB_FALLBACK);

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

  function updateToggleButton(button, isCollapsed, visibleLabel, hiddenLabel) {
    if (!button) {
      return;
    }
    const text = isCollapsed ? visibleLabel : hiddenLabel;
    button.textContent = text;
    button.setAttribute("aria-pressed", String(isCollapsed));
    button.setAttribute("aria-label", text);
  }

  function applyPanelCollapseState() {
    if (typeof document === "undefined") {
      return;
    }
    document.body.classList.toggle("panel-left-collapsed", leftCollapsed);
    document.body.classList.toggle("panel-right-collapsed", rightCollapsed);
    updateToggleButton(
      elements.toggleLeftPanelBtn,
      leftCollapsed,
      "Show Left Panel",
      "Hide Left Panel"
    );
    updateToggleButton(
      elements.toggleRightPanelBtn,
      rightCollapsed,
      "Show Right Panel",
      "Hide Right Panel"
    );
  }

  function isSectionVisibleForProfile(section) {
    if (!(section instanceof HTMLElement)) {
      return false;
    }
    const profile = document.body?.getAttribute("data-ui-profile");
    if (profile === "beginner" && section.classList.contains("profile-advanced")) {
      return false;
    }
    return true;
  }

  function visibleTabSet() {
    const visible = new Set();
    elements.rightTabSections.forEach((section) => {
      if (!isSectionVisibleForProfile(section)) {
        return;
      }
      const key = section.getAttribute("data-right-panel-group");
      if (!key) {
        return;
      }
      visible.add(key);
    });
    return visible;
  }

  function firstVisibleTabOrFallback() {
    const visible = visibleTabSet();
    if (visible.has(activeRightTab)) {
      return activeRightTab;
    }
    if (visible.has(RIGHT_TAB_FALLBACK)) {
      return RIGHT_TAB_FALLBACK;
    }
    const [first] = Array.from(visible.values());
    return first || RIGHT_TAB_FALLBACK;
  }

  function applyRightTabState() {
    activeRightTab = firstVisibleTabOrFallback();
    writeStringPref(RIGHT_TAB_STORAGE_KEY, activeRightTab, log);

    const visible = visibleTabSet();
    elements.rightTabButtons.forEach((button) => {
      const key = button.getAttribute("data-right-panel-tab");
      const available = !!key && visible.has(key);
      const active = available && key === activeRightTab;
      button.hidden = !available;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });

    elements.rightTabSections.forEach((section) => {
      const key = section.getAttribute("data-right-panel-group");
      const visibleForProfile = isSectionVisibleForProfile(section);
      const visibleForTab = key === activeRightTab;
      section.hidden = !(visibleForProfile && visibleForTab);
    });
  }

  function visibleTabButtons() {
    return elements.rightTabButtons.filter((button) => !button.hidden);
  }

  function setActiveTab(nextTab) {
    if (!nextTab || nextTab === activeRightTab) {
      return;
    }
    activeRightTab = nextTab;
    requestRender();
  }

  function toggleLeftPanel() {
    leftCollapsed = !leftCollapsed;
    writeBooleanPref(LEFT_PANEL_STORAGE_KEY, leftCollapsed, log);
    requestRender();
  }

  function toggleRightPanel() {
    rightCollapsed = !rightCollapsed;
    writeBooleanPref(RIGHT_PANEL_STORAGE_KEY, rightCollapsed, log);
    requestRender();
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;
    addListener(elements.toggleLeftPanelBtn, "click", () => toggleLeftPanel());
    addListener(elements.toggleRightPanelBtn, "click", () => toggleRightPanel());
    addListener(elements.rightTabs, "click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const tabBtn = target.closest("[data-right-panel-tab]");
      if (!(tabBtn instanceof HTMLElement)) {
        return;
      }
      const next = tabBtn.getAttribute("data-right-panel-tab");
      if (!next || next === activeRightTab) {
        return;
      }
      setActiveTab(next);
    });
    addListener(elements.rightTabs, "keydown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const tabBtn = target.closest("[data-right-panel-tab]");
      if (!(tabBtn instanceof HTMLElement)) {
        return;
      }

      const tabs = visibleTabButtons();
      if (tabs.length === 0) {
        return;
      }

      const key = event.key;
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        setActiveTab(tabBtn.getAttribute("data-right-panel-tab"));
        return;
      }

      const currentIndex = tabs.indexOf(tabBtn);
      if (currentIndex < 0) {
        return;
      }

      let nextIndex = currentIndex;
      if (key === "ArrowRight" || key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (key === "ArrowLeft" || key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (key === "Home") {
        nextIndex = 0;
      } else if (key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const nextBtn = tabs[nextIndex];
      if (!(nextBtn instanceof HTMLElement)) {
        return;
      }
      nextBtn.focus();
      setActiveTab(nextBtn.getAttribute("data-right-panel-tab"));
    });
  }

  function renderLayout() {
    applyPanelCollapseState();
    applyRightTabState();
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  return {
    bindEvents,
    renderLayout,
    dispose,
  };
}
