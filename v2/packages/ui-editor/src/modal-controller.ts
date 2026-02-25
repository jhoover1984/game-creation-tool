/**
 * ModalController -- UI-SHELL-002
 * Generic modal dialog with full focus management (focus trap, focus restore).
 * Supports confirm (OK + Cancel) and error (OK only) flows.
 */
export class ModalController {
  private readonly overlay: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly messageEl: HTMLElement;
  private readonly btnConfirm: HTMLButtonElement;
  private readonly btnCancel: HTMLButtonElement;
  private readonly keydownHandler: (e: KeyboardEvent) => void;
  private pendingConfirm: (() => void) | null = null;
  private pendingCancel: (() => void) | null = null;
  private previousFocus: HTMLElement | null = null;
  private _isOpen = false;

  constructor(overlay: HTMLElement) {
    this.overlay = overlay;
    this.titleEl = overlay.querySelector('#modal-title') as HTMLElement;
    this.messageEl = overlay.querySelector('#modal-message') as HTMLElement;
    this.btnConfirm = overlay.querySelector('#modal-confirm') as HTMLButtonElement;
    this.btnCancel = overlay.querySelector('#modal-cancel') as HTMLButtonElement;

    this.btnConfirm.addEventListener('click', () => this.confirm());
    this.btnCancel.addEventListener('click', () => this.cancel());

    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this._isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.cancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
      } else if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    };
    this.overlay.addEventListener('keydown', this.keydownHandler);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  showConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
  ): void {
    this.pendingConfirm = onConfirm;
    this.pendingCancel = onCancel ?? null;
    this.titleEl.textContent = title;
    this.messageEl.textContent = message;
    this.btnCancel.style.display = '';
    this.open();
  }

  showError(title: string, message: string): void {
    this.pendingConfirm = null;
    this.pendingCancel = null;
    this.titleEl.textContent = title;
    this.messageEl.textContent = message;
    this.btnCancel.style.display = 'none';
    this.open();
  }

  hide(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.pendingConfirm = null;
    this.pendingCancel = null;
    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  private open(): void {
    this.previousFocus =
      (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement as HTMLElement
        : null);
    this._isOpen = true;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.btnConfirm.focus();
  }

  private confirm(): void {
    const cb = this.pendingConfirm;
    this.hide();
    cb?.();
  }

  private cancel(): void {
    const cb = this.pendingCancel;
    this.hide();
    cb?.();
  }

  private trapFocus(e: KeyboardEvent): void {
    const focusable = Array.from(
      this.overlay.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}
