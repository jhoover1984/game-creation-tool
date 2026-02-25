/**
 * Lightweight toast/snackbar notification system.
 *
 * Usage:
 *   import { showToast } from "./ui-toast.js";
 *   showToast("Project saved", "success");
 *
 * @typedef {"info" | "success" | "warning" | "error"} ToastType
 */

const DURATION_MS = 2800;
const FADE_MS = 300;

/**
 * Display a brief notification at the bottom-right of the viewport.
 * @param {string} message
 * @param {ToastType} [type]
 * @param {number} [duration] - Visible duration in ms before fade-out begins
 */
export function showToast(message, type = "info", duration = DURATION_MS) {
  if (typeof document === "undefined") return;
  const region = document.getElementById("toast-region");
  if (!region) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "status");
  region.append(toast);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => {
    toast.classList.add("toast--visible");
  });

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    toast.classList.add("toast--hiding");
    setTimeout(() => toast.remove(), FADE_MS);
  }, duration);
}
