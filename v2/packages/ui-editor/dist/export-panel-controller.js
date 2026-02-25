import { renderExportPanel } from './export-panel.js';
export class ExportPanelController {
    app;
    container;
    clickHandler;
    unsubscribeBus;
    report = null;
    buildReport = null;
    onLog;
    constructor(app, container, onLog) {
        this.app = app;
        this.container = container;
        this.onLog = onLog ?? null;
        this.clickHandler = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target)
                return;
            const action = target.dataset['action'];
            if (action === 'export:preflight') {
                this.report = this.app.runExportPreflight();
                this.buildReport = null;
                this.log(this.report.ok
                    ? `Export preflight passed (${this.report.warningCount} warning(s)).`
                    : `Export preflight failed (${this.report.blockingCount} blocking, ${this.report.warningCount} warning(s)).`);
                this.refresh();
                return;
            }
            if (action === 'export:build') {
                if (!this.report) {
                    this.report = this.app.runExportPreflight();
                }
                if (!this.report.ok) {
                    this.log('Export build blocked by preflight issues.');
                    this.refresh();
                    return;
                }
                this.buildReport = this.app.runExportBuild(0);
                this.log(`Export build ready (${this.buildReport.buildId}, ${this.buildReport.artifacts.length} artifacts).`);
                this.refresh();
            }
        };
        // Any command/event can invalidate stale preflight; require explicit rerun.
        this.unsubscribeBus = this.app.subscribe((_event) => {
            this.report = null;
            this.buildReport = null;
            this.refresh();
        });
        this.container.addEventListener('click', this.clickHandler);
        this.refresh();
    }
    refresh() {
        this.container.innerHTML = renderExportPanel(this.report, this.buildReport);
    }
    invalidate() {
        this.report = null;
        this.buildReport = null;
        this.refresh();
    }
    dispose() {
        this.unsubscribeBus();
        this.container.removeEventListener('click', this.clickHandler);
    }
    log(line) {
        if (this.onLog)
            this.onLog(line);
    }
}
//# sourceMappingURL=export-panel-controller.js.map