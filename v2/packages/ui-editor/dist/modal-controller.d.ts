/**
 * ModalController -- UI-SHELL-002
 * Generic modal dialog with full focus management (focus trap, focus restore).
 * Supports confirm (OK + Cancel) and error (OK only) flows.
 */
export declare class ModalController {
    private readonly overlay;
    private readonly titleEl;
    private readonly messageEl;
    private readonly btnConfirm;
    private readonly btnCancel;
    private readonly keydownHandler;
    private pendingConfirm;
    private pendingCancel;
    private previousFocus;
    private _isOpen;
    constructor(overlay: HTMLElement);
    get isOpen(): boolean;
    showConfirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void): void;
    showError(title: string, message: string): void;
    hide(): void;
    private open;
    private confirm;
    private cancel;
    private trapFocus;
}
//# sourceMappingURL=modal-controller.d.ts.map