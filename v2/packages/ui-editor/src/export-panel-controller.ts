import type { ExportBuildReport, ExportPreflightReport } from '@gcs/runtime-web';
import type { GameEvent } from '@gcs/contracts';
import { renderExportPanel } from './export-panel.js';
import type { EditorApp } from './editor-app.js';

export class ExportPanelController {
  private readonly app: EditorApp;
  private readonly container: HTMLElement;
  private readonly clickHandler: (e: Event) => void;
  private readonly unsubscribeBus: () => void;
  private report: ExportPreflightReport | null = null;
  private buildReport: ExportBuildReport | null = null;
  private readonly onLog: ((line: string) => void) | null;

  constructor(app: EditorApp, container: HTMLElement, onLog?: (line: string) => void) {
    this.app = app;
    this.container = container;
    this.onLog = onLog ?? null;

    this.clickHandler = (e: Event) => {
      const target = (e.target as Element).closest('[data-action]') as HTMLElement | null;
      if (!target) return;
      const action = target.dataset['action'];
      if (action === 'export:preflight') {
        this.report = this.app.runExportPreflight();
        this.buildReport = null;
        this.log(
          this.report.ok
            ? `Export preflight passed (${this.report.warningCount} warning(s)).`
            : `Export preflight failed (${this.report.blockingCount} blocking, ${this.report.warningCount} warning(s)).`,
        );
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
    this.unsubscribeBus = this.app.subscribe((_event: GameEvent) => {
      this.report = null;
      this.buildReport = null;
      this.refresh();
    });

    this.container.addEventListener('click', this.clickHandler);
    this.refresh();
  }

  refresh(): void {
    this.container.innerHTML = renderExportPanel(this.report, this.buildReport);
  }

  invalidate(): void {
    this.report = null;
    this.buildReport = null;
    this.refresh();
  }

  dispose(): void {
    this.unsubscribeBus();
    this.container.removeEventListener('click', this.clickHandler);
  }

  private log(line: string): void {
    if (this.onLog) this.onLog(line);
  }
}
