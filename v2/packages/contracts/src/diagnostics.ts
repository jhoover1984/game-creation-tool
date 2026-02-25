/**
 * Diagnostic and Task contracts for UI-TASKS-001..003.
 *
 * Diagnostics are emitted by validation layers (schema, semantic, runtime).
 * Tasks are derived from diagnostics with actionable remediation paths.
 */

/** Severity levels per V2 Error Recovery UX spec. */
export type DiagnosticSeverity = 'info' | 'warning' | 'error' | 'fatal';

/** Source of a diagnostic emission. */
export type DiagnosticSource = 'project-load' | 'schema' | 'semantic' | 'runtime' | 'editor';
/** Recovery taxonomy bucket for consistent task grouping and messaging. */
export type DiagnosticCategory =
  | 'topology'
  | 'reference'
  | 'bounds'
  | 'workflow'
  | 'validation'
  | 'runtime'
  | 'interaction'
  | 'persistence'
  | 'unknown';

/**
 * A diagnostic emitted by the system.
 * Implements UI-TASKS-001: id, severity, message, detail, actions.
 */
export interface Diagnostic {
  id: string;
  code: string;
  severity: DiagnosticSeverity;
  source: DiagnosticSource;
  category?: DiagnosticCategory;
  path: string;
  message: string;
  detail?: string;
  actions: FixAction[];
}

/**
 * A fix action attached to a diagnostic.
 * Implements UI-TASKS-003: deterministic vs non-deterministic actions.
 */
export interface FixAction {
  label: string;
  /** If true, action executes immediately and records an undo entry. */
  deterministic: boolean;
  /** Command type to dispatch when fix is applied. Undefined for non-deterministic actions. */
  commandType?: string;
  /** Payload for the fix command. */
  commandPayload?: Record<string, unknown>;
}

/**
 * A task derived from a diagnostic.
 * Implements UI-TASKS-002: diagnosticId, label, targetRef, fixAction.
 */
export interface EditorTask {
  id: string;
  diagnosticId: string;
  severity: DiagnosticSeverity;
  category?: DiagnosticCategory;
  label: string;
  targetRef?: string;
  fixAction?: FixAction;
}
