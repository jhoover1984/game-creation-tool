/**
 * BehaviorEvaluator -- deterministic behavior row evaluation.
 * Governs: BEHAV-ROW-001, BEHAV-PICK-001, BEHAV-DEBUG-001
 *
 * MVP scope: on:tick trigger, always/entity_has_tag conditions, log action.
 * Expanded scope: on:interact/on:collision trigger filtering and actionable
 * dispatch metadata for set_velocity/destroy_self (execution occurs in runner).
 * Remaining unimplemented trigger/condition/action shapes are stubbed with reason.
 * Trace buffer is ring-capped at maxTrace to avoid unbounded memory growth.
 * Evaluation NEVER mutates entity state.
 *
 * ConditionDef.target semantics for entity_has_tag:
 *   target: { type: 'tag', value: 'X' } -> check if row-owner entity.tags includes 'X'
 */

import type {
  BehaviorRow,
  BehaviorTraceEntry,
  BehaviorEvalOverflow,
  ConditionType,
  ActionType,
  TriggerType,
  EntityDef,
} from '@gcs/contracts';
import { resolveTargetEntityIds } from './behavior-targeting.js';

export class BehaviorEvaluator {
  private readonly maxTrace = 200;
  private readonly maxRowsPerEvaluate = 256;
  private readonly maxActionsPerRow = 16;
  private traceBuffer: BehaviorTraceEntry[] = [];
  private lastOverflow: BehaviorEvalOverflow = { rowCapHit: false, actionCapHits: [] };

  /**
   * Evaluate all behavior rows for the given trigger type.
   * Returns only the entries produced this call; full history via getTrace().
   */
  evaluate(
    behaviors: Record<string, BehaviorRow[]>,
    entities: EntityDef[],
    trigger: TriggerType,
    triggerEntityIds?: ReadonlySet<string>,
  ): BehaviorTraceEntry[] {
    // Reset overflow state for this call
    this.lastOverflow = { rowCapHit: false, actionCapHits: [] };
    const actionCapSeen = new Set<string>(); // dedup key: `${entityId}:${rowId}`

    const produced: BehaviorTraceEntry[] = [];
    const now = Date.now();
    let evaluatedRows = 0;

    for (const entity of entities) {
      if (triggerEntityIds && !triggerEntityIds.has(entity.id)) continue;
      const rows = behaviors[entity.id] ?? [];
      for (const row of rows) {
        if (evaluatedRows >= this.maxRowsPerEvaluate) {
          // Deterministic guardrail: stop evaluating additional rows for this call.
          this.lastOverflow = { ...this.lastOverflow, rowCapHit: true };
          break;
        }
        if (!row.enabled) continue;
        if (row.trigger.type !== trigger) continue;

        const conditionResults = this.evaluateConditions(row, entity, entities);
        const allPass = conditionResults.every((r) => r.passed);
        const actionResults = this.evaluateActions(row, entity.id, allPass, actionCapSeen);

        produced.push({
          rowId: row.id,
          entityId: entity.id,
          triggerType: trigger,
          conditionResults,
          actionResults,
          timestamp: now,
        });
        evaluatedRows += 1;
      }
      if (evaluatedRows >= this.maxRowsPerEvaluate) break;
    }

    // Ring-cap: keep only the most recent maxTrace entries
    this.traceBuffer = [...this.traceBuffer, ...produced].slice(-this.maxTrace);
    return produced;
  }

  getTrace(): readonly BehaviorTraceEntry[] {
    return this.traceBuffer;
  }

  clearTrace(): void {
    this.traceBuffer = [];
  }

  /** Return the overflow report from the most recent evaluate() call. */
  getLastOverflow(): BehaviorEvalOverflow {
    return this.lastOverflow;
  }

  // -- private helpers --

  private evaluateConditions(
    row: BehaviorRow,
    entity: EntityDef,
    entities: readonly EntityDef[],
  ): BehaviorTraceEntry['conditionResults'] {
    return row.conditions.map((cond) => {
      let rawPass = false;
      let reason = '';

      if (cond.type === 'always') {
        rawPass = true;
        reason = 'always passes';
      } else if (cond.type === 'entity_has_tag') {
        if (cond.target.type === 'tag') {
          // target.value is the tag name to check on the row-owner entity
          const tagName = cond.target.value;
          rawPass = entity.tags.includes(tagName);
          reason = rawPass
            ? `entity has tag "${tagName}"`
            : `entity lacks tag "${tagName}"`;
        } else if (cond.target.type === 'this') {
          rawPass = false;
          reason = 'entity_has_tag with target:this requires target:tag with value (MVP)';
        } else {
          rawPass = false;
          reason = 'entity_has_tag with radius target is not supported';
        }
      } else if (cond.type === 'entity_in_radius') {
        if (cond.target.type !== 'radius') {
          rawPass = false;
          reason = 'entity_in_radius requires target:radius';
        } else {
          const selected = resolveTargetEntityIds(entities, entity.id, cond.target);
          rawPass = selected.length > 0;
          reason = rawPass
            ? `${selected.length} entity(s) within radius ${cond.target.value}`
            : `no entities within radius ${cond.target.value}`;
        }
      } else {
        rawPass = false;
        reason = `condition "${cond.type as ConditionType}" not yet implemented (MVP)`;
      }

      const passed = cond.negate === true ? !rawPass : rawPass;
      const negSuffix = cond.negate === true && cond.type !== 'always' ? ' (negated)' : '';
      return { id: cond.id, type: cond.type, passed, reason: `${reason}${negSuffix}` };
    });
  }

  private evaluateActions(
    row: BehaviorRow,
    entityId: string,
    conditionsPassed: boolean,
    actionCapSeen: Set<string>,
  ): BehaviorTraceEntry['actionResults'] {
    return row.actions.map((action, index) => {
      if (index >= this.maxActionsPerRow) {
        const key = `${entityId}:${row.id}`;
        if (!actionCapSeen.has(key)) {
          actionCapSeen.add(key);
          const hits = [...this.lastOverflow.actionCapHits, { entityId, rowId: row.id }];
          this.lastOverflow = { ...this.lastOverflow, actionCapHits: hits };
        }
        return {
          id: action.id,
          type: action.type,
          dispatched: false,
          reason: `row action budget exceeded (${this.maxActionsPerRow})`,
        };
      }
      if (!conditionsPassed) {
        return { id: action.id, type: action.type, dispatched: false, reason: 'conditions not met' };
      }
      if (action.type === 'log') {
        return { id: action.id, type: action.type, dispatched: true, reason: 'logged' };
      }
      if (action.type === 'set_velocity') {
        const vx = this.getNumberParam(action.params, 'vx');
        const vy = this.getNumberParam(action.params, 'vy');
        if (vx === null || vy === null) {
          return {
            id: action.id,
            type: action.type,
            dispatched: false,
            reason: 'set_velocity requires numeric params.vx and params.vy',
          };
        }
        return { id: action.id, type: action.type, dispatched: true, reason: 'set_velocity ready' };
      }
      if (action.type === 'destroy_self') {
        return { id: action.id, type: action.type, dispatched: true, reason: 'destroy_self ready' };
      }
      return {
        id: action.id,
        type: action.type as ActionType,
        dispatched: false,
        reason: `action "${action.type as ActionType}" not yet implemented (MVP)`,
      };
    });
  }

  private getNumberParam(params: Record<string, unknown>, key: string): number | null {
    const value = params[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
