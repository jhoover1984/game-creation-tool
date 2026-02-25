import type { QuestGraphV2 } from './story.js';
export type SemanticSeverity = 'error' | 'warning' | 'info';
export interface SemanticDiagnostic {
    code: string;
    severity: SemanticSeverity;
    path: string;
    message: string;
}
export interface SemanticValidationResult {
    ok: boolean;
    diagnostics: SemanticDiagnostic[];
}
/**
 * Validates cross-reference invariants that JSON Schema cannot enforce.
 */
export declare function validateQuestGraphSemantics(graph: QuestGraphV2): SemanticValidationResult;
//# sourceMappingURL=semantic-validation.d.ts.map