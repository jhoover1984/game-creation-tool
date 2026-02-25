import type { QuestGraphNode } from '@gcs/contracts';
export interface StoryPanelAppAdapter {
    getQuestNodes(): readonly QuestGraphNode[];
    getSelectedQuestNode(): QuestGraphNode | null;
    selectQuestNode(nodeId: string | null): QuestGraphNode | null;
    updateQuestNodeBasics(nodeId: string, fields: {
        name: string;
        kind: QuestGraphNode['kind'];
    }): boolean;
}
export declare class StoryPanelController {
    private readonly app;
    private readonly container;
    private readonly onClickHandler;
    private readonly onChangeHandler;
    private readonly onMutate;
    constructor(app: StoryPanelAppAdapter, container: HTMLElement, onMutate?: () => void);
    refresh(): void;
    dispose(): void;
    private handleChange;
    private handleClick;
}
//# sourceMappingURL=story-panel-controller.d.ts.map