import type { EditorApp } from './editor-app.js';
export declare class AnimationPanelController {
    private readonly app;
    private readonly container;
    private readonly onClickHandler;
    private readonly unsubscribe;
    private selectedEntityId;
    constructor(app: EditorApp, container: HTMLElement);
    notifyEntitySelected(entityId: string | null): void;
    refresh(): void;
    dispose(): void;
    private getSelectedEntity;
    private getSelectedClip;
    private handleClick;
}
//# sourceMappingURL=animation-panel-controller.d.ts.map