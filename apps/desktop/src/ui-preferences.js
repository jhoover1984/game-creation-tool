const UI_PROFILE_STORAGE_KEY = "gcs.ui_profile.v1";
const THEME_STORAGE_KEY = "gcs.theme.v1";
const DENSITY_STORAGE_KEY = "gcs.density.v1";

const VALID_UI_PROFILES = new Set(["beginner", "builder"]);
const VALID_THEMES = new Set(["dark", "light", "dark_high_contrast"]);
const VALID_DENSITIES = new Set(["comfortable", "compact"]);

export function createPreferencesController({ elements, render, log }) {
  let uiProfile = readStoredValue(UI_PROFILE_STORAGE_KEY, "builder", VALID_UI_PROFILES);
  let theme = readStoredValue(THEME_STORAGE_KEY, "dark", VALID_THEMES);
  let density = readStoredValue(DENSITY_STORAGE_KEY, "comfortable", VALID_DENSITIES);
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

  function readStoredValue(storageKey, fallback, validValues) {
    if (typeof window === "undefined" || !window.localStorage) {
      return fallback;
    }
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (typeof stored !== "string") {
        return fallback;
      }
      return validValues.has(stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocalStorageValueSafe(storageKey, value) {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    try {
      window.localStorage.setItem(storageKey, value);
      return true;
    } catch (error) {
      const quotaExceeded =
        error && typeof error === "object" && error.name === "QuotaExceededError";
      const reason = quotaExceeded ? "storage quota exceeded" : "storage unavailable";
      if (typeof log === "function") {
        log(`Local preference save skipped: ${reason}.`);
      }
      return false;
    }
  }

  function writeUiProfile(profile) {
    writeLocalStorageValueSafe(UI_PROFILE_STORAGE_KEY, profile);
  }

  function writeTheme(nextTheme) {
    writeLocalStorageValueSafe(THEME_STORAGE_KEY, nextTheme);
  }

  function writeDensity(nextDensity) {
    writeLocalStorageValueSafe(DENSITY_STORAGE_KEY, nextDensity);
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;
    addListener(elements.uiProfileSelect, "change", () => {
      const next = elements.uiProfileSelect?.value === "beginner" ? "beginner" : "builder";
      uiProfile = next;
      writeUiProfile(next);
      requestRender();
    });
    addListener(elements.themeSelect, "change", () => {
      const selected = elements.themeSelect?.value || "dark";
      const next = VALID_THEMES.has(selected) ? selected : "dark";
      theme = next;
      writeTheme(next);
      requestRender();
    });
    addListener(elements.densitySelect, "change", () => {
      const selected = elements.densitySelect?.value || "comfortable";
      const next = VALID_DENSITIES.has(selected) ? selected : "comfortable";
      density = next;
      writeDensity(next);
      requestRender();
    });
  }

  function applyPreferences() {
    if (typeof document === "undefined") {
      return;
    }
    document.body.setAttribute("data-ui-profile", uiProfile);
    document.body.setAttribute("data-theme", theme);
    document.body.setAttribute("data-density", density);
    if (elements.uiProfileSelect && elements.uiProfileSelect.value !== uiProfile) {
      elements.uiProfileSelect.value = uiProfile;
    }
    if (elements.themeSelect && elements.themeSelect.value !== theme) {
      elements.themeSelect.value = theme;
    }
    if (elements.densitySelect && elements.densitySelect.value !== density) {
      elements.densitySelect.value = density;
    }
  }

  function applyUiProfile() {
    applyPreferences();
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  return {
    bindEvents,
    applyPreferences,
    applyUiProfile,
    dispose,
  };
}
