/**
 * DiagnosticStore -- collects diagnostics from all sources and generates tasks.
 *
 * Implements:
 * - UI-TASKS-001: Diagnostic collection and severity filtering
 * - UI-TASKS-002: Task generation from diagnostics with remediation paths
 * - UI-TASKS-003: Auto-fix action lookup
 */
export class DiagnosticStore {
    diagnostics = [];
    listeners = [];
    /** Subscribe to diagnostic changes. Returns unsubscribe function. */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    /** Get all current diagnostics. */
    getAll() {
        return this.diagnostics;
    }
    /** Get diagnostics filtered by severity. */
    getBySeverity(severity) {
        return this.diagnostics.filter((d) => d.severity === severity);
    }
    /** Get diagnostics filtered by source. */
    getBySource(source) {
        return this.diagnostics.filter((d) => d.source === source);
    }
    /** Clear all diagnostics from a specific source. */
    clearSource(source) {
        const before = this.diagnostics.length;
        this.diagnostics = this.diagnostics.filter((d) => d.source !== source);
        if (this.diagnostics.length !== before) {
            this.notify();
        }
    }
    /** Clear all diagnostics. */
    clearAll() {
        if (this.diagnostics.length > 0) {
            this.diagnostics = [];
            this.notify();
        }
    }
    /** Add a single diagnostic. */
    add(diagnostic) {
        this.diagnostics.push({
            ...diagnostic,
            category: diagnostic.category ?? resolveDiagnosticCategory(diagnostic.code, diagnostic.source),
        });
        this.notify();
    }
    /** Remove a diagnostic by ID. */
    remove(diagnosticId) {
        const before = this.diagnostics.length;
        this.diagnostics = this.diagnostics.filter((d) => d.id !== diagnosticId);
        if (this.diagnostics.length !== before) {
            this.notify();
        }
    }
    /** Remove diagnostics matching a specific code and path prefix. */
    removeByCodeAndPath(code, pathPrefix) {
        const before = this.diagnostics.length;
        this.diagnostics = this.diagnostics.filter((d) => !(d.code === code && d.path.startsWith(pathPrefix)));
        if (this.diagnostics.length !== before) {
            this.notify();
        }
    }
    /**
     * Ingest SemanticDiagnostics (from existing validation layer) into the store.
     * Converts the simpler SemanticDiagnostic format to full Diagnostic format.
     */
    ingestSemanticDiagnostics(semanticDiags, source = 'semantic') {
        this.clearSource(source);
        for (let i = 0; i < semanticDiags.length; i++) {
            const sd = semanticDiags[i];
            const fixAction = resolveFixAction(sd.code);
            this.diagnostics.push({
                id: `${source}:${sd.code}:${i}`,
                code: sd.code,
                severity: sd.severity === 'error' ? 'error' : sd.severity === 'warning' ? 'warning' : 'info',
                source,
                category: resolveDiagnosticCategory(sd.code, source),
                path: sd.path,
                message: sd.message,
                actions: fixAction ? [fixAction] : [],
            });
        }
        if (semanticDiags.length > 0) {
            this.notify();
        }
    }
    /**
     * Generate tasks from current diagnostics.
     * Implements UI-TASKS-002: each diagnostic with a remediation path becomes a task.
     */
    generateTasks() {
        return this.diagnostics
            .map((d) => ({
            id: `task:${d.id}`,
            diagnosticId: d.id,
            severity: d.severity,
            category: d.category ?? resolveDiagnosticCategory(d.code, d.source),
            label: taskLabelForCode(d.code, d.message),
            targetRef: d.path || undefined,
            fixAction: d.actions.length > 0 ? d.actions[0] : undefined,
        }))
            .sort((a, b) => {
            const severityDelta = severityWeight(b.severity) - severityWeight(a.severity);
            if (severityDelta !== 0)
                return severityDelta;
            const catA = a.category ?? 'unknown';
            const catB = b.category ?? 'unknown';
            if (catA !== catB)
                return catA.localeCompare(catB);
            return a.label.localeCompare(b.label);
        });
    }
    notify() {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
function severityWeight(severity) {
    switch (severity) {
        case 'fatal':
            return 4;
        case 'error':
            return 3;
        case 'warning':
            return 2;
        default:
            return 1;
    }
}
function resolveDiagnosticCategory(code, source) {
    if (source === 'runtime')
        return 'runtime';
    if (source === 'schema')
        return 'validation';
    if (source === 'semantic' || source === 'project-load') {
        if (code.includes('UNREACHABLE') || code.includes('START_NODE') || code.includes('EDGE'))
            return 'topology';
        if (code.includes('DUPLICATE'))
            return 'reference';
        return 'validation';
    }
    if (source === 'editor') {
        if (code.includes('BOUNDS'))
            return 'bounds';
        if (code.includes('ASSET_REF'))
            return 'reference';
        if (code.includes('LAYER') || code.includes('ENTITY') || code.includes('COMMAND'))
            return 'workflow';
        return 'interaction';
    }
    return 'unknown';
}
/**
 * Resolve a known fix action for a diagnostic code.
 * Returns undefined if no auto-fix is available.
 */
export function resolveFixAction(code) {
    switch (code) {
        case 'QUEST_DUPLICATE_NODE_ID':
            return {
                label: 'Remove duplicate node',
                deterministic: false,
            };
        case 'QUEST_START_NODE_MISSING':
            return {
                label: 'Add start node',
                deterministic: false,
            };
        case 'QUEST_NODE_UNREACHABLE':
            return {
                label: 'Connect or remove unreachable node',
                deterministic: false,
            };
        case 'EDIT_LAYER_MISSING':
            return {
                label: 'Use fallback layer',
                deterministic: true,
            };
        case 'EDIT_TILE_OUT_OF_BOUNDS':
            return {
                label: 'Use in-bounds tile coordinates',
                deterministic: true,
            };
        case 'EDIT_TILE_SET_FAILED':
            return {
                label: 'Retry tile edit',
                deterministic: false,
            };
        case 'EDIT_ENTITY_MISSING':
            return {
                label: 'Select an existing entity',
                deterministic: false,
            };
        case 'EDIT_ENTITY_CREATE_FAILED':
            return {
                label: 'Retry entity creation',
                deterministic: false,
            };
        case 'EDIT_COMMAND_FAILED':
            return {
                label: 'Inspect command inputs',
                deterministic: false,
            };
        case 'EDIT_ASSET_REF_INVALID':
            return {
                label: 'Clear invalid asset reference',
                deterministic: true,
            };
        case 'EDIT_ENTITY_OUT_OF_BOUNDS':
            return {
                label: 'Clamp entity to canvas bounds',
                deterministic: true,
            };
        case 'EDIT_DUPLICATE_ENTITY_NAME':
            return {
                label: 'Rename to a unique name',
                deterministic: true,
            };
        case 'SPRITE_COLOR_OUT_OF_PALETTE':
            return {
                label: 'Use Remap in Sprite Panel',
                deterministic: false,
            };
        case 'TILE_RULESET_INVALID':
            return {
                label: 'Fix or replace the active ruleset',
                deterministic: false,
            };
        case 'TILE_RULE_MISSING_VARIANT':
            return {
                label: 'Add missing tile variant to ruleset',
                deterministic: false,
            };
        case 'EFFECT_PRESET_UNKNOWN':
            return {
                label: 'Select a valid effect preset',
                deterministic: false,
            };
        case 'EFFECT_FIELD_UNKNOWN':
            return {
                label: 'Select a valid effect field',
                deterministic: false,
            };
        case 'EXPORT_PREFLIGHT_LAYER_MISSING':
            return {
                label: 'Create a map layer',
                deterministic: false,
            };
        case 'EXPORT_PREFLIGHT_PLAYER_MISSING':
            return {
                label: 'Create a player entity with tag player',
                deterministic: false,
            };
        case 'EXPORT_PREFLIGHT_MAP_EMPTY':
            return {
                label: 'Paint at least one tile',
                deterministic: false,
            };
        case 'BEHAV_ROW_CAP_EXCEEDED':
            return {
                label: 'Reduce behavior rows (cap: 256 per step)',
                deterministic: false,
            };
        case 'BEHAV_ACTION_CAP_EXCEEDED':
            return {
                label: 'Reduce actions per behavior row (cap: 16)',
                deterministic: false,
            };
        default:
            return undefined;
    }
}
/**
 * Generate a user-friendly task label from a diagnostic code.
 */
function taskLabelForCode(code, fallbackMessage) {
    switch (code) {
        case 'QUEST_DUPLICATE_NODE_ID':
            return 'Fix duplicate node ID';
        case 'QUEST_EDGE_FROM_MISSING':
            return 'Fix broken edge source';
        case 'QUEST_EDGE_TO_MISSING':
            return 'Fix broken edge target';
        case 'QUEST_START_NODE_MISSING':
            return 'Add missing start node';
        case 'QUEST_START_NODE_MULTIPLE':
            return 'Remove extra start nodes';
        case 'QUEST_NODE_UNREACHABLE':
            return 'Connect unreachable node';
        case 'EDIT_LAYER_MISSING':
            return 'Select a valid layer before editing';
        case 'EDIT_TILE_OUT_OF_BOUNDS':
            return 'Adjust tile edit to map bounds';
        case 'EDIT_TILE_SET_FAILED':
            return 'Retry tile edit operation';
        case 'EDIT_ENTITY_MISSING':
            return 'Select an entity that exists';
        case 'EDIT_ENTITY_CREATE_FAILED':
            return 'Retry entity creation';
        case 'EDIT_COMMAND_FAILED':
            return 'Review failed command input';
        case 'EDIT_ASSET_REF_INVALID':
            return 'Fix invalid asset reference';
        case 'EDIT_ENTITY_OUT_OF_BOUNDS':
            return 'Move entity within canvas bounds';
        case 'EDIT_DUPLICATE_ENTITY_NAME':
            return 'Rename duplicate entity';
        case 'SPRITE_COLOR_OUT_OF_PALETTE':
            return 'Remap sprite pixels to palette';
        case 'TILE_RULESET_INVALID':
            return 'Fix or replace the active tile ruleset';
        case 'TILE_RULE_MISSING_VARIANT':
            return 'Add missing tile variant to ruleset';
        case 'EFFECT_PRESET_UNKNOWN':
            return 'Select a valid effect preset';
        case 'EFFECT_FIELD_UNKNOWN':
            return 'Select a valid effect field';
        case 'EXPORT_PREFLIGHT_LAYER_MISSING':
            return 'Add at least one tile layer';
        case 'EXPORT_PREFLIGHT_PLAYER_MISSING':
            return 'Add a player entity before export';
        case 'EXPORT_PREFLIGHT_MAP_EMPTY':
            return 'Paint at least one tile before export';
        case 'BEHAV_ROW_CAP_EXCEEDED':
            return 'Reduce total behavior rows evaluated per step (cap: 256)';
        case 'BEHAV_ACTION_CAP_EXCEEDED':
            return 'Reduce actions in this behavior row (cap: 16)';
        default:
            return fallbackMessage;
    }
}
//# sourceMappingURL=diagnostic-store.js.map