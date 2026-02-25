/**
 * ContextMenuController -- UI-CTX-001
 * Right-click canvas context menu with Delete Entity, Deselect, and Properties actions.
 * Closes on click-away or Escape. Items are shown/hidden based on selection state.
 */

export interface ContextMenuCallbacks {
  getSelectedEntityId(): string | null;
  deleteSelected(): void;
  deselectAll(): void;
  focusInspector(): void;
}

/** Minimal injectable click-away / keydown target (pass `document` wrapper in production). */
export interface ContextMenuGlobalTarget {
  addEventListener(type: string, fn: (e: Event) => void): void;
  removeEventListener(type: string, fn: (e: Event) => void): void;
}

export class ContextMenuController {
  private readonly menu: HTMLElement;
  private readonly callbacks: ContextMenuCallbacks;
  private readonly globalTarget: ContextMenuGlobalTarget | null;
  private readonly itemDelete: HTMLElement | null;
  private readonly itemDeselect: HTMLElement | null;
  private readonly itemProperties: HTMLElement | null;
  private readonly menuClickHandler: (e: Event) => void;
  private readonly clickAwayHandler: (e: Event) => void;
  private readonly escapeHandler: (e: Event) => void;
  private _isOpen = false;

  constructor(
    menu: HTMLElement,
    callbacks: ContextMenuCallbacks,
    globalTarget?: ContextMenuGlobalTarget | null,
  ) {
    this.menu = menu;
    this.callbacks = callbacks;
    this.globalTarget = globalTarget ?? null;

    this.itemDelete = menu.querySelector('[data-action="ctx-delete"]') as HTMLElement | null;
    this.itemDeselect = menu.querySelector('[data-action="ctx-deselect"]') as HTMLElement | null;
    this.itemProperties = menu.querySelector('[data-action="ctx-properties"]') as HTMLElement | null;

    this.menuClickHandler = (e: Event) => this.handleMenuClick(e);
    this.clickAwayHandler = (e: Event) => {
      if (!this.menu.contains(e.target as Node | null)) {
        this.hide();
      }
    };
    this.escapeHandler = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape') this.hide();
    };

    this.menu.addEventListener('click', this.menuClickHandler);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  show(x: number, y: number): void {
    const hasSelection = this.callbacks.getSelectedEntityId() !== null;
    if (this.itemDelete) {
      if (hasSelection) {
        this.itemDelete.removeAttribute('hidden');
      } else {
        this.itemDelete.setAttribute('hidden', '');
      }
    }
    if (this.itemDeselect) {
      if (hasSelection) {
        this.itemDeselect.removeAttribute('hidden');
      } else {
        this.itemDeselect.setAttribute('hidden', '');
      }
    }
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.removeAttribute('hidden');
    this._isOpen = true;
    this.globalTarget?.addEventListener('click', this.clickAwayHandler);
    this.globalTarget?.addEventListener('keydown', this.escapeHandler);
  }

  hide(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.menu.setAttribute('hidden', '');
    this.globalTarget?.removeEventListener('click', this.clickAwayHandler);
    this.globalTarget?.removeEventListener('keydown', this.escapeHandler);
  }

  dispose(): void {
    this.hide();
    this.menu.removeEventListener('click', this.menuClickHandler);
  }

  private handleMenuClick(e: Event): void {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'ctx-delete') {
      const id = this.callbacks.getSelectedEntityId();
      if (id) this.callbacks.deleteSelected();
    } else if (action === 'ctx-deselect') {
      this.callbacks.deselectAll();
    } else if (action === 'ctx-properties') {
      this.callbacks.focusInspector();
    }
    this.hide();
  }
}
