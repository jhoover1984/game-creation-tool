import type { ExportBuildReport, ExportPreflightReport } from '@gcs/runtime-web';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderExportPanel(
  report: ExportPreflightReport | null,
  buildReport: ExportBuildReport | null = null,
): string {
  const runButton = '<button class="export-btn" data-action="export:preflight">Run Preflight</button>';
  if (!report) {
    return `<div class="export-panel">
  <div class="export-actions">
    ${runButton}
    <button class="export-btn" data-action="export:build" disabled>Build Preview</button>
  </div>
  <div class="empty-state">Run preflight to check export readiness.</div>
</div>`;
  }

  const issues = report.issues.map((issue) => {
    const sevClass = issue.severity === 'error' ? 'export-issue--error' : 'export-issue--warning';
    const badge = issue.blocking ? 'blocking' : 'warning';
    return `<li class="export-issue ${sevClass}">
  <span class="export-issue-badge">${badge}</span>
  <span class="export-issue-code">${escapeHtml(issue.code)}</span>
  <span class="export-issue-msg">${escapeHtml(issue.message)}</span>
</li>`;
  }).join('');

  const buildSummary = buildReport ? `<div class="export-build">
  <div>Build ID: <code>${escapeHtml(buildReport.buildId)}</code></div>
  <div>Schema: ${escapeHtml(buildReport.metadata.buildSchemaVersion)}</div>
  <div>Compatibility: ${escapeHtml(buildReport.metadata.compatibilityMarker)}</div>
  <div>Artifacts: ${buildReport.artifacts.length}</div>
</div>` : '';

  return `<div class="export-panel">
  <div class="export-actions">
    ${runButton}
    <button class="export-btn" data-action="export:build"${report.ok ? '' : ' disabled'}>Build Preview</button>
  </div>
  <div class="export-summary">
    <span>Blocking: ${report.blockingCount}</span>
    <span>Warnings: ${report.warningCount}</span>
    <span>Status: ${report.ok ? 'Ready' : 'Not Ready'}</span>
  </div>
  ${buildSummary}
  <ul class="export-issues">${issues || '<li class="empty-state">No issues.</li>'}</ul>
</div>`;
}
