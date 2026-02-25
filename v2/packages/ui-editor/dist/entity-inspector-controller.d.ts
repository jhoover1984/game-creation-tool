import { type EntityDef } from '@gcs/contracts';
export interface InspectorAppAdapter {
    getSelectedEntity(): EntityDef | null;
    moveEntity(entityId: string, x: number, y: number): void;
    renameEntity(entityId: string, name: string): void;
    updateEntityVisual(entityId: string, visual: {
        solid: boolean;
        spriteId?: string;
        animationClipId?: string;
    }): boolean;
    setEntitySpeed(entityId: string, speed: number): boolean;
}
export declare class EntityInspectorController {
    private readonly app;
    private readonly container;
    private readonly onClickHandler;
    constructor(app: InspectorAppAdapter, container: HTMLElement);
    refresh(): void;
    dispose(): void;
    private handleClick;
}
//# sourceMappingURL=entity-inspector-controller.d.ts.map