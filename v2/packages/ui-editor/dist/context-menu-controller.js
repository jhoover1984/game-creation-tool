/**
 * ContextMenuController -- UI-CTX-001
 * Right-click canvas context menu with Delete Entity, Deselect, and Properties actions.
 * Closes on click-away or Escape. Items are shown/hidden based on selection state.
 */
export class ContextMenuController {
    menu;
    callbacks;
    globalTarget;
    itemDelete;
    itemDeselect;
    itemProperties;
    menuClickHandler;
    clickAwayHandler;
    escapeHandler;
    _isOpen = false;
    constructor(menu, callbacks, globalTarget) {
        this.menu = menu;
        this.callbacks = callbacks;
        this.globalTarget = globalTarget ?? null;
        this.itemDelete = menu.querySelector('[data-action="ctx-delete"]');
        this.itemDeselect = menu.querySelector('[data-action="ctx-deselect"]');
        this.itemProperties = menu.querySelector('[data-action="ctx-properties"]');
        this.menuClickHandler = (e) => this.handleMenuClick(e);
        this.clickAwayHandler = (e) => {
            if (!this.menu.contains(e.target)) {
                this.hide();
            }
        };
        this.escapeHandler = (e) => {
            if (e.key === 'Escape')
                this.hide();
        };
        this.menu.addEventListener('click', this.menuClickHandler);
    }
    get isOpen() {
        return this._isOpen;
    }
    show(x, y) {
        const hasSelection = this.callbacks.getSelectedEntityId() !== null;
        if (this.itemDelete) {
            if (hasSelection) {
                this.itemDelete.removeAttribute('hidden');
            }
            else {
                this.itemDelete.setAttribute('hidden', '');
            }
        }
        if (this.itemDeselect) {
            if (hasSelection) {
                this.itemDeselect.removeAttribute('hidden');
            }
            else {
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
    hide() {
        if (!this._isOpen)
            return;
        this._isOpen = false;
        this.menu.setAttribute('hidden', '');
        this.globalTarget?.removeEventListener('click', this.clickAwayHandler);
        this.globalTarget?.removeEventListener('keydown', this.escapeHandler);
    }
    dispose() {
        this.hide();
        this.menu.removeEventListener('click', this.menuClickHandler);
    }
    handleMenuClick(e) {
        const target = e.target?.closest('[data-action]');
        if (!target)
            return;
        const action = target.getAttribute('data-action');
        if (action === 'ctx-delete') {
            const id = this.callbacks.getSelectedEntityId();
            if (id)
                this.callbacks.deleteSelected();
        }
        else if (action === 'ctx-deselect') {
            this.callbacks.deselectAll();
        }
        else if (action === 'ctx-properties') {
            this.callbacks.focusInspector();
        }
        this.hide();
    }
}
//# sourceMappingURL=context-menu-controller.js.map