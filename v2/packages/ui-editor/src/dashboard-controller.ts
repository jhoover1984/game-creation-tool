/**
 * DashboardController -- manages the welcome dashboard overlay.
 * Boot-once: overlay visibility only; does not re-bootstrap the editor.
 * Governs: UI-DASH-001, UI-DASH-002
 */

import { OnboardingStore } from './onboarding-store.js';
import { renderDashboard } from './dashboard-panel.js';

export class DashboardController {
  private readonly store: OnboardingStore;
  private readonly overlayEl: HTMLElement;
  private readonly onDismiss: () => void;
  private readonly unsubscribeStore: () => void;
  private readonly clickHandler: (event: Event) => void;
  private readonly changeHandler: (event: Event) => void;

  constructor(store: OnboardingStore, overlayEl: HTMLElement, onDismiss: () => void) {
    this.store = store;
    this.overlayEl = overlayEl;
    this.onDismiss = onDismiss;

    this.clickHandler = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest('[data-action]') as HTMLElement | null;
      const action = target?.dataset?.['action'];
      if (!action) return;

      if (action === 'new-project' || action === 'dismiss-dashboard') {
        this.hide();
        this.onDismiss();
      } else if (action === 'open-recent') {
        // MVP: treat as dismiss only; no project switching yet
        this.hide();
        this.onDismiss();
      }
      // open-project, open-sample, template buttons are disabled in HTML; no handler needed
    };

    this.changeHandler = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      if (target?.dataset?.['action'] === 'dont-show-again') {
        store.setPreferences({ showDashboardOnLaunch: !target.checked });
        if (target.checked) {
          this.hide();
          this.onDismiss();
        }
      }
    };

    overlayEl.addEventListener('click', this.clickHandler);
    overlayEl.addEventListener('change', this.changeHandler);

    this.unsubscribeStore = store.subscribe(() => this.refresh());

    // Boot routing: decide initial visibility
    const prefs = store.getPreferences();
    if (prefs.openLastProjectOnLaunch && store.getRecents().length > 0) {
      // Recents are local metadata only; skip dashboard, go direct to editor
      this.hide();
      this.onDismiss();
    } else if (prefs.showDashboardOnLaunch) {
      this.show();
    } else {
      this.hide();
      this.onDismiss();
    }
  }

  show(): void {
    this.overlayEl.style.display = '';
    this.refresh();
  }

  hide(): void {
    this.overlayEl.style.display = 'none';
  }

  refresh(): void {
    const prefs = this.store.getPreferences();
    const recents = this.store.getRecents();
    this.overlayEl.innerHTML = renderDashboard(recents, prefs);
  }

  dispose(): void {
    this.unsubscribeStore();
    this.overlayEl.removeEventListener('click', this.clickHandler);
    this.overlayEl.removeEventListener('change', this.changeHandler);
  }
}
