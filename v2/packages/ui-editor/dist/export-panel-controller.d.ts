import type { EditorApp } from './editor-app.js';
export declare class ExportPanelController {
    private readonly app;
    private readonly container;
    private readonly clickHandler;
    private readonly unsubscribeBus;
    private report;
    private buildReport;
    private readonly onLog;
    constructor(app: EditorApp, container: HTMLElement, onLog?: (line: string) => void);
    refresh(): void;
    invalidate(): void;
    dispose(): void;
    private log;
}
//# sourceMappingURL=export-panel-controller.d.ts.map