import type { EntityDef, TargetSelector } from '@gcs/contracts';
/**
 * Deterministic target resolution for behavior selectors.
 * Output order is stable (ascending entity id).
 */
export declare function resolveTargetEntityIds(entities: readonly EntityDef[], ownerEntityId: string, selector: TargetSelector): string[];
//# sourceMappingURL=behavior-targeting.d.ts.map