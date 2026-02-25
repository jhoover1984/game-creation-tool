/**
 * BehaviorPanelController -- manages the Behavior panel.
 * Governs: BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001
 *
 * - Edit mode: shows behavior rows for selected entity; dispatches CRUD commands.
 * - Playtest mode: shows trace entries from evaluator.
 * - Selection and deselection both route through notifyEntitySelected().
 */

import type { AnyCommand, BehaviorRow, BehaviorTraceEntry, GameEvent } from '@gcs/contracts';
import { renderBehaviorPanel } from './behavior-panel.js';

export interface BehaviorPanelAppAdapter {
  subscribe(fn: (event: GameEvent) => void): () => void;
  dispatch(cmd: AnyCommand): void;
  getBehaviors(entityId: string): BehaviorRow[];
  getTrace(): readonly BehaviorTraceEntry[];
}

export class BehaviorPanelController {
  private readonly app: BehaviorPanelAppAdapter;
  private readonly container: HTMLElement;
  private readonly unsubscribeApp: () => void;
  private readonly clickHandler: (event: Event) => void;
  private currentEntityId: string | null = null;
  private playtestMode = false;

  constructor(app: BehaviorPanelAppAdapter, container: HTMLElement) {
    this.app = app;
    this.container = container;

    // Bus events that trigger a refresh
    this.unsubscribeApp = app.subscribe((event: GameEvent) => {
      if (
        event.type === 'behavior:row:added' ||
        event.type === 'behavior:row:removed' ||
        event.type === 'behavior:row:updated'
      ) {
        this.refresh();
      } else if (event.type === 'entity:deleted') {
        // If the deleted entity was selected, deselect
        const payload = event.payload as { entityId?: string };
        if (payload.entityId === this.currentEntityId) {
          this.currentEntityId = null;
          this.refresh();
        }
      }
    });

    this.clickHandler = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest('[data-action]') as HTMLElement | null;
      const action = target?.dataset?.['action'];
      if (!action) return;

      if (action === 'behavior:row:add' && this.currentEntityId) {
        const row: BehaviorRow = {
          id: this.generateId(),
          label: 'New Row',
          enabled: true,
          trigger: { type: 'on:tick' },
          conditions: [
            { id: this.generateId(), type: 'always', target: { type: 'this' } },
          ],
          actions: [
            { id: this.generateId(), type: 'log', target: { type: 'this' }, params: {} },
          ],
        };
        this.app.dispatch({ type: 'behavior:row:add', payload: { entityId: this.currentEntityId, row } });
      } else if (action === 'behavior:row:remove') {
        const rowId = target?.dataset?.['rowId'];
        if (rowId && this.currentEntityId) {
          this.app.dispatch({ type: 'behavior:row:remove', payload: { entityId: this.currentEntityId, rowId } });
        }
      }
    };

    container.addEventListener('click', this.clickHandler);
    this.refresh();
  }

  /** Called by shell when entity selection changes (selection or deselection). */
  notifyEntitySelected(entityId: string | null): void {
    this.currentEntityId = entityId;
    this.refresh();
  }

  /** Called by shell when playtest is entered. */
  notifyPlaytestEntered(): void {
    this.playtestMode = true;
    this.refresh();
  }

  /** Called by shell when playtest is exited. */
  notifyPlaytestExited(): void {
    this.playtestMode = false;
    this.refresh();
  }

  refresh(): void {
    const rows = this.currentEntityId
      ? this.app.getBehaviors(this.currentEntityId)
      : [];
    this.container.innerHTML = renderBehaviorPanel(
      this.currentEntityId,
      rows,
      this.playtestMode ? 'playtest' : 'edit',
      this.app.getTrace(),
    );
  }

  dispose(): void {
    this.unsubscribeApp();
    this.container.removeEventListener('click', this.clickHandler);
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `beh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }
}
