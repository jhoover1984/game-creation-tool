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
export declare class ContextMenuController {
    private readonly menu;
    private readonly callbacks;
    private readonly globalTarget;
    private readonly itemDelete;
    private readonly itemDeselect;
    private readonly itemProperties;
    private readonly menuClickHandler;
    private readonly clickAwayHandler;
    private readonly escapeHandler;
    private _isOpen;
    constructor(menu: HTMLElement, callbacks: ContextMenuCallbacks, globalTarget?: ContextMenuGlobalTarget | null);
    get isOpen(): boolean;
    show(x: number, y: number): void;
    hide(): void;
    dispose(): void;
    private handleMenuClick;
}
//# sourceMappingURL=context-menu-controller.d.ts.map