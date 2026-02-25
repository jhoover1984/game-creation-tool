/**
 * behavior-panel.ts -- pure render functions for the Behavior panel.
 * Governs: BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001
 */

import type { BehaviorRow, BehaviorTraceEntry, TargetSelector } from '@gcs/contracts';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTargetChip(target: TargetSelector): string {
  if (target.type === 'this') return '<span class="behavior-chip">This entity</span>';
  if (target.type === 'tag') return `<span class="behavior-chip">tag: ${escapeHtml(target.value)}</span>`;
  return `<span class="behavior-chip">radius: ${escapeHtml(String(target.value))}</span>`;
}

function renderRow(row: BehaviorRow): string {
  const condCount = row.conditions.length;
  const actCount = row.actions.length;
  const label = escapeHtml(row.label || row.id);
  const trigger = escapeHtml(row.trigger.type);

  // Collect unique target chips from conditions + actions
  const targets = [
    ...row.conditions.map((c) => renderTargetChip(c.target)),
    ...row.actions.map((a) => renderTargetChip(a.target)),
  ];
  const uniqueTargets = [...new Set(targets)].join(' ');

  return `<li class="behavior-row" data-row-id="${escapeHtml(row.id)}">
  <span class="behavior-row-label">${label}</span>
  <span class="behavior-chip">${trigger}</span>
  ${condCount > 0 ? `<span class="behavior-chip">${condCount} cond</span>` : ''}
  ${actCount > 0 ? `<span class="behavior-chip">${actCount} act</span>` : ''}
  ${uniqueTargets}
  <button data-action="behavior:row:remove" data-row-id="${escapeHtml(row.id)}" aria-label="Delete row">x</button>
</li>`;
}

function renderEditMode(entityId: string, rows: BehaviorRow[]): string {
  if (rows.length === 0) {
    return `<p class="empty-state">No behavior rows. Click Add Row to create one.</p>
<button data-action="behavior:row:add" data-entity-id="${escapeHtml(entityId)}">Add Row</button>`;
  }
  return `<ul class="behavior-row-list">${rows.map(renderRow).join('')}</ul>
<button data-action="behavior:row:add" data-entity-id="${escapeHtml(entityId)}">Add Row</button>`;
}

function renderTraceEntry(entry: BehaviorTraceEntry): string {
  const condHtml = entry.conditionResults.map((c) =>
    `<span class="${c.passed ? 'trace-pass' : 'trace-fail'}" title="${escapeHtml(c.reason)}">${escapeHtml(c.type)}</span>`
  ).join(' ');
  const actHtml = entry.actionResults.map((a) =>
    `<span class="${a.dispatched ? 'trace-pass' : 'trace-fail'}" title="${escapeHtml(a.reason)}">${escapeHtml(a.type)}</span>`
  ).join(' ');
  return `<li class="trace-entry">
  <span class="trace-row-id">${escapeHtml(entry.rowId)}</span>
  <span class="trace-entity">${escapeHtml(entry.entityId)}</span>
  ${condHtml}
  ${actHtml}
</li>`;
}

function renderPlaytestMode(trace: readonly BehaviorTraceEntry[]): string {
  if (trace.length === 0) {
    return '<p class="empty-state">No trace entries yet. Step the playtest.</p>';
  }
  // Show most recent 20 entries (newest first)
  const recent = [...trace].reverse().slice(0, 20);
  return `<ul class="trace-list">${recent.map(renderTraceEntry).join('')}</ul>`;
}

/**
 * Render the behavior panel for either edit or playtest mode.
 * @param entityId - ID of the selected entity, or null if none.
 * @param rows     - Behavior rows for the selected entity.
 * @param mode     - 'edit' when editing, 'playtest' when playtest is active.
 * @param trace    - Current trace buffer from the evaluator.
 */
export function renderBehaviorPanel(
  entityId: string | null,
  rows: BehaviorRow[],
  mode: 'edit' | 'playtest',
  trace: readonly BehaviorTraceEntry[],
): string {
  if (!entityId) {
    return '<p class="empty-state">Select an entity to edit its behaviors.</p>';
  }
  if (mode === 'playtest') {
    return renderPlaytestMode(trace);
  }
  return renderEditMode(entityId, rows);
}
