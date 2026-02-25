import type { Diagnostic, DiagnosticSeverity, DiagnosticSource, EditorTask, FixAction, SemanticDiagnostic } from '@gcs/contracts';
/**
 * DiagnosticStore -- collects diagnostics from all sources and generates tasks.
 *
 * Implements:
 * - UI-TASKS-001: Diagnostic collection and severity filtering
 * - UI-TASKS-002: Task generation from diagnostics with remediation paths
 * - UI-TASKS-003: Auto-fix action lookup
 */
export declare class DiagnosticStore {
    private diagnostics;
    private listeners;
    /** Subscribe to diagnostic changes. Returns unsubscribe function. */
    subscribe(listener: () => void): () => void;
    /** Get all current diagnostics. */
    getAll(): readonly Diagnostic[];
    /** Get diagnostics filtered by severity. */
    getBySeverity(severity: DiagnosticSeverity): readonly Diagnostic[];
    /** Get diagnostics filtered by source. */
    getBySource(source: DiagnosticSource): readonly Diagnostic[];
    /** Clear all diagnostics from a specific source. */
    clearSource(source: DiagnosticSource): void;
    /** Clear all diagnostics. */
    clearAll(): void;
    /** Add a single diagnostic. */
    add(diagnostic: Diagnostic): void;
    /** Remove a diagnostic by ID. */
    remove(diagnosticId: string): void;
    /** Remove diagnostics matching a specific code and path prefix. */
    removeByCodeAndPath(code: string, pathPrefix: string): void;
    /**
     * Ingest SemanticDiagnostics (from existing validation layer) into the store.
     * Converts the simpler SemanticDiagnostic format to full Diagnostic format.
     */
    ingestSemanticDiagnostics(semanticDiags: SemanticDiagnostic[], source?: DiagnosticSource): void;
    /**
     * Generate tasks from current diagnostics.
     * Implements UI-TASKS-002: each diagnostic with a remediation path becomes a task.
     */
    generateTasks(): EditorTask[];
    private notify;
}
/**
 * Resolve a known fix action for a diagnostic code.
 * Returns undefined if no auto-fix is available.
 */
export declare function resolveFixAction(code: string): FixAction | undefined;
//# sourceMappingURL=diagnostic-store.d.ts.map