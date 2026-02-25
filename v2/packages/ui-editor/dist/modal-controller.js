/**
 * ModalController -- UI-SHELL-002
 * Generic modal dialog with full focus management (focus trap, focus restore).
 * Supports confirm (OK + Cancel) and error (OK only) flows.
 */
export class ModalController {
    overlay;
    titleEl;
    messageEl;
    btnConfirm;
    btnCancel;
    keydownHandler;
    pendingConfirm = null;
    pendingCancel = null;
    previousFocus = null;
    _isOpen = false;
    constructor(overlay) {
        this.overlay = overlay;
        this.titleEl = overlay.querySelector('#modal-title');
        this.messageEl = overlay.querySelector('#modal-message');
        this.btnConfirm = overlay.querySelector('#modal-confirm');
        this.btnCancel = overlay.querySelector('#modal-cancel');
        this.btnConfirm.addEventListener('click', () => this.confirm());
        this.btnCancel.addEventListener('click', () => this.cancel());
        this.keydownHandler = (e) => {
            if (!this._isOpen)
                return;
            if (e.key === 'Escape') {
                e.preventDefault();
                this.cancel();
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                this.confirm();
            }
            else if (e.key === 'Tab') {
                this.trapFocus(e);
            }
        };
        this.overlay.addEventListener('keydown', this.keydownHandler);
    }
    get isOpen() {
        return this._isOpen;
    }
    showConfirm(title, message, onConfirm, onCancel) {
        this.pendingConfirm = onConfirm;
        this.pendingCancel = onCancel ?? null;
        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this.btnCancel.style.display = '';
        this.open();
    }
    showError(title, message) {
        this.pendingConfirm = null;
        this.pendingCancel = null;
        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this.btnCancel.style.display = 'none';
        this.open();
    }
    hide() {
        if (!this._isOpen)
            return;
        this._isOpen = false;
        this.overlay.setAttribute('aria-hidden', 'true');
        this.pendingConfirm = null;
        this.pendingCancel = null;
        this.previousFocus?.focus();
        this.previousFocus = null;
    }
    open() {
        this.previousFocus =
            (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null);
        this._isOpen = true;
        this.overlay.setAttribute('aria-hidden', 'false');
        this.btnConfirm.focus();
    }
    confirm() {
        const cb = this.pendingConfirm;
        this.hide();
        cb?.();
    }
    cancel() {
        const cb = this.pendingCancel;
        this.hide();
        cb?.();
    }
    trapFocus(e) {
        const focusable = Array.from(this.overlay.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled'));
        if (focusable.length === 0)
            return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        }
        else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
}
//# sourceMappingURL=modal-controller.js.map