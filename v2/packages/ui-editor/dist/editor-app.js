import { computeMask, resolveTile, collectNeighborhood } from './tile-rule-engine.js';
import { buildDeterministicExport, CommandBus, DiagnosticStore, evaluateExportPreflight, ProjectStore, resolveFixAction, } from '@gcs/runtime-web';
/**
 * EditorApp -- top-level controller for the GCS editor.
 * Owns the command bus, project store, diagnostic store, and coordinates UI panels.
 *
 * Implements:
 * - UI-TASKS-001: Diagnostic display via diagnosticStore
 * - UI-TASKS-002: Task generation via diagnosticStore.generateTasks()
 * - UI-TASKS-003: Auto-fix via applyFix()
 */
export class EditorApp {
    bus;
    store;
    diagnosticStore;
    canvas = null;
    ctx = null;
    hoverCell = null;
    /**
     * Optional runtime-only render overrides for entity positions during playtest.
     * Keeps authored entity positions unchanged while allowing live preview movement.
     */
    playtestEntityPositions = null;
    constructor() {
        this.bus = new CommandBus();
        this.store = new ProjectStore(this.bus);
        this.diagnosticStore = new DiagnosticStore();
    }
    /**
     * Run export preflight checks and emit diagnostics/tasks.
     * Preflight is read-only and deterministic.
     */
    runExportPreflight() {
        this.clearExportPreflightDiagnostics();
        const report = evaluateExportPreflight(this.store.manifest, this.store.tileLayers, this.store.entities);
        for (let i = 0; i < report.issues.length; i += 1) {
            const issue = report.issues[i];
            const fix = resolveFixAction(issue.code);
            this.diagnosticStore.add({
                id: `runtime:${issue.code}:${i}`,
                code: issue.code,
                severity: issue.severity,
                source: 'runtime',
                path: issue.path,
                message: issue.message,
                actions: fix ? [fix] : [],
            });
        }
        return report;
    }
    /**
     * Build deterministic export artifacts from the current project state.
     * Caller is responsible for preflight gating.
     */
    runExportBuild(seed = 0) {
        return buildDeterministicExport({
            manifest: this.store.manifest,
            tileLayers: this.store.tileLayers,
            entities: this.store.entities,
            questGraph: this.store.questGraph,
            behaviors: this.store.behaviors,
            effectState: this.store.effectState,
            seed,
        });
    }
    /** Initialize with a canvas element for rendering. */
    mount(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // Re-render on any event
        this.bus.subscribe(() => this.render());
    }
    /** Create a new project and render it. */
    newProject(name, widthTiles, heightTiles, tileSize) {
        this.store.createProject(name, widthTiles, heightTiles, tileSize);
        this.diagnosticStore.clearAll();
        if (this.canvas) {
            this.canvas.width = widthTiles * tileSize;
            this.canvas.height = heightTiles * tileSize;
        }
        this.render();
    }
    /** Paint a tile at grid position. */
    paintTile(layerId, x, y, tileId) {
        const layer = this.store.tileLayers.find((l) => l.id === layerId);
        if (!layer) {
            this.diagnosticStore.removeByCodeAndPath('EDIT_LAYER_MISSING', `/tileLayers/${layerId}`);
            const fallback = this.store.tileLayers[0];
            if (fallback) {
                const clampedX = Math.max(0, Math.min(x, fallback.width - 1));
                const clampedY = Math.max(0, Math.min(y, fallback.height - 1));
                this.addEditorDiagnostic('EDIT_LAYER_MISSING', `/tileLayers/${layerId}`, 'Tile layer not found.', {
                    label: `Use fallback layer ${fallback.id}`,
                    deterministic: true,
                    commandType: 'tile:set',
                    commandPayload: { layerId: fallback.id, x: clampedX, y: clampedY, tileId },
                });
            }
            else {
                this.addEditorDiagnostic('EDIT_LAYER_MISSING', `/tileLayers/${layerId}`, 'Tile layer not found.');
            }
            return;
        }
        if (x < 0 || y < 0 || x >= layer.width || y >= layer.height) {
            this.diagnosticStore.removeByCodeAndPath('EDIT_TILE_OUT_OF_BOUNDS', `/tileLayers/${layerId}`);
            const clampedX = Math.max(0, Math.min(x, layer.width - 1));
            const clampedY = Math.max(0, Math.min(y, layer.height - 1));
            this.addEditorDiagnostic('EDIT_TILE_OUT_OF_BOUNDS', `/tileLayers/${layerId}/tiles`, 'Tile position is outside layer bounds.', {
                label: 'Use in-bounds tile coordinates',
                deterministic: true,
                commandType: 'tile:set',
                commandPayload: {
                    layerId,
                    x: clampedX,
                    y: clampedY,
                    tileId,
                },
            });
            return;
        }
        const event = this.bus.dispatch({
            type: 'tile:set',
            payload: { layerId, x, y, tileId },
        });
        if (!event) {
            this.diagnosticStore.removeByCodeAndPath('EDIT_TILE_SET_FAILED', `/tileLayers/${layerId}`);
            this.addEditorDiagnostic('EDIT_TILE_SET_FAILED', `/tileLayers/${layerId}/tiles`, 'Unable to set tile.');
        }
    }
    /**
     * Begin a grouped paint stroke so multiple tile mutations undo as one command.
     * Mirrors UI-UNDO-001 pointer-down start behavior.
     */
    beginPaintStroke() {
        return this.store.beginUndoBatch();
    }
    /**
     * End a grouped paint stroke.
     * Mirrors UI-UNDO-001 pointer-up end behavior.
     */
    endPaintStroke() {
        return this.store.endUndoBatch();
    }
    /** Erase a tile (set to 0). */
    eraseTile(layerId, x, y) {
        this.paintTile(layerId, x, y, 0);
    }
    /**
     * Apply rule-based tile painting for a set of user-painted cells (TILE-RULE-001).
     *
     * 2-pass algorithm:
     *   Pass A (intent): paint each user cell with ruleSet.fallbackTileId.
     *   Pass B (resolve): for each cell in the 1-ring neighborhood that contains a
     *     matching tile, compute the cardinal adjacency mask and paint the resolved variant.
     *
     * All writes are grouped into one undo unit via beginUndoBatch/endUndoBatch.
     * Iteration order is deterministic: ascending y, then x.
     *
     * @param layerId - Layer to paint on.
     * @param userCells - Cells the user explicitly painted (intent set).
     * @param ruleSet - The active ruleset governing tile variant selection.
     */
    applyRulePaint(layerId, userCells, ruleSet) {
        if (userCells.length === 0)
            return;
        const layer = this.store.tileLayers.find((l) => l.id === layerId);
        if (!layer)
            return;
        this.store.beginUndoBatch();
        // Pass A: set intent tile for all user-painted cells
        for (const { x, y } of userCells) {
            this.paintTile(layerId, x, y, ruleSet.fallbackTileId);
        }
        // Pass B: resolve tile variants for all affected cells
        const neighborhood = collectNeighborhood(userCells, layer.width, layer.height);
        for (const { x, y } of neighborhood) {
            const idx = y * layer.width + x;
            const tile = layer.data[idx];
            // Only resolve cells occupied by a matching tile (non-empty after intent pass)
            if (tile === undefined || tile === 0)
                continue;
            if (!ruleSet.matchTileIds.includes(tile))
                continue;
            const mask = computeMask(layer, x, y, ruleSet.matchTileIds);
            const resolved = resolveTile(mask, ruleSet);
            this.paintTile(layerId, x, y, resolved);
        }
        this.store.endUndoBatch();
    }
    /** Create an entity at a position. */
    createEntity(name, x, y) {
        this.diagnosticStore.removeByCodeAndPath('EDIT_ENTITY_CREATE_FAILED', '/entities');
        const event = this.bus.dispatch({
            type: 'entity:create',
            payload: { name, x, y },
        });
        if (!event) {
            this.addEditorDiagnostic('EDIT_ENTITY_CREATE_FAILED', '/entities', 'Unable to create entity.');
            return;
        }
        this.refreshDuplicateNameDiagnostics();
        // Post-success: check entity bounds
        const created = this.store.entities[this.store.entities.length - 1];
        if (created) {
            this.checkEntityBounds(created.id);
        }
    }
    /** Delete an entity by ID. */
    deleteEntity(entityId) {
        this.diagnosticStore.removeByCodeAndPath('EDIT_ENTITY_MISSING', `/entities/${entityId}`);
        const event = this.bus.dispatch({
            type: 'entity:delete',
            payload: { entityId },
        });
        if (!event) {
            this.addEditorDiagnostic('EDIT_ENTITY_MISSING', `/entities/${entityId}`, 'Entity not found.');
            return;
        }
        // Clear diagnostics for the deleted entity (it's no longer in store.entities, so refresh won't)
        this.diagnosticStore.removeByCodeAndPath('EDIT_DUPLICATE_ENTITY_NAME', `/entities/${entityId}`);
        this.refreshDuplicateNameDiagnostics();
    }
    /** Rename an entity. */
    renameEntity(entityId, name) {
        this.diagnosticStore.removeByCodeAndPath('EDIT_ENTITY_MISSING', `/entities/${entityId}`);
        const event = this.bus.dispatch({
            type: 'entity:rename',
            payload: { entityId, name },
        });
        if (!event) {
            this.addEditorDiagnostic('EDIT_ENTITY_MISSING', `/entities/${entityId}`, 'Entity not found.');
            return;
        }
        this.refreshDuplicateNameDiagnostics();
    }
    /** Move an entity to a new position. */
    moveEntity(entityId, x, y) {
        this.diagnosticStore.removeByCodeAndPath('EDIT_ENTITY_MISSING', `/entities/${entityId}`);
        this.diagnosticStore.removeByCodeAndPath('EDIT_ENTITY_OUT_OF_BOUNDS', `/entities/${entityId}`);
        const event = this.bus.dispatch({
            type: 'entity:move',
            payload: { entityId, x, y },
        });
        if (!event) {
            this.addEditorDiagnostic('EDIT_ENTITY_MISSING', `/entities/${entityId}`, 'Entity not found.');
            return;
        }
        this.checkEntityBounds(entityId);
    }
    /** Update entity visual fields through command path. */
    updateEntityVisual(entityId, visual) {
        this.diagnosticStore.removeByCodeAndPath('EDIT_ASSET_REF_INVALID', `/entities/${entityId}`);
        this.diagnosticStore.removeByCodeAndPath('EDIT_ENTITY_MISSING', `/entities/${entityId}`);
        const current = this.store.entities.find((e) => e.id === entityId);
        if (!current) {
            this.addEditorDiagnostic('EDIT_ENTITY_MISSING', `/entities/${entityId}`, 'Entity not found.');
            return false;
        }
        const normalizedSpriteId = visual.spriteId?.trim() ? visual.spriteId.trim() : undefined;
        const normalizedAnimationClipId = visual.animationClipId?.trim()
            ? visual.animationClipId.trim()
            : undefined;
        const spriteIsValid = this.isValidAssetRef(normalizedSpriteId);
        const animationIsValid = this.isValidAssetRef(normalizedAnimationClipId);
        if (!spriteIsValid) {
            this.addEditorDiagnostic('EDIT_ASSET_REF_INVALID', `/entities/${entityId}/spriteId`, 'Invalid sprite asset reference format.', {
                label: 'Clear invalid sprite reference',
                deterministic: true,
                commandType: 'entity:updateVisual',
                commandPayload: {
                    entityId,
                    solid: visual.solid,
                    spriteId: undefined,
                    animationClipId: animationIsValid ? normalizedAnimationClipId : undefined,
                },
            });
            return false;
        }
        if (!animationIsValid) {
            this.addEditorDiagnostic('EDIT_ASSET_REF_INVALID', `/entities/${entityId}/animationClipId`, 'Invalid animation asset reference format.', {
                label: 'Clear invalid animation reference',
                deterministic: true,
                commandType: 'entity:updateVisual',
                commandPayload: {
                    entityId,
                    solid: visual.solid,
                    spriteId: spriteIsValid ? normalizedSpriteId : undefined,
                    animationClipId: undefined,
                },
            });
            return false;
        }
        const event = this.bus.dispatch({
            type: 'entity:updateVisual',
            payload: {
                entityId,
                solid: visual.solid,
                spriteId: normalizedSpriteId,
                animationClipId: normalizedAnimationClipId,
            },
        });
        if (!event) {
            this.addEditorDiagnostic('EDIT_ENTITY_MISSING', `/entities/${entityId}`, 'Entity not found.');
            return false;
        }
        return true;
    }
    /** Set player entity movement speed through command path (entity:setSpeed). UI-PLAYFLOW-001. */
    setEntitySpeed(entityId, speed) {
        const event = this.bus.dispatch({
            type: 'entity:setSpeed',
            payload: { entityId, speed: Math.max(0, Math.round(speed)) },
        });
        return event !== null;
    }
    /** Dispatch any command through the bus. */
    dispatch(command) {
        this.diagnosticStore.removeByCodeAndPath('EDIT_COMMAND_FAILED', '/commands');
        const event = this.bus.dispatch(command);
        if (!event) {
            this.addEditorDiagnostic('EDIT_COMMAND_FAILED', '/commands', `Command failed: ${command.type}`);
        }
    }
    /** Subscribe to command bus events for shell-level UI refresh logic. */
    subscribe(listener) {
        return this.bus.subscribe(listener);
    }
    /** Undo last action. */
    undo() {
        this.store.undo();
        this.render();
    }
    /** Returns true when there is at least one action to undo. */
    canUndo() {
        return this.store.canUndo();
    }
    /** Redo last undone action. */
    redo() {
        this.store.redo();
        this.render();
    }
    /** Returns true when there is at least one action to redo. */
    canRedo() {
        return this.store.canRedo();
    }
    /** Save project to JSON string. */
    save() {
        return this.store.saveToJson();
    }
    /** Load project from JSON string. Ingests diagnostics into the diagnostic store. */
    load(json) {
        this.store.loadFromJson(json);
        // Ingest validation diagnostics into the unified diagnostic store
        const semanticDiags = this.store.getValidationDiagnostics();
        this.diagnosticStore.ingestSemanticDiagnostics(semanticDiags, 'project-load');
        if (this.canvas) {
            const layer = this.store.tileLayers[0];
            if (layer) {
                this.canvas.width = layer.width * layer.tileSize;
                this.canvas.height = layer.height * layer.tileSize;
            }
        }
        this.render();
    }
    /** Latest diagnostics emitted while loading/validating a project. */
    getLoadDiagnostics() {
        return this.store.getValidationDiagnostics();
    }
    /** All diagnostics from the unified diagnostic store (UI-TASKS-001). */
    getDiagnostics() {
        return this.diagnosticStore.getAll();
    }
    /** Return currently selected entity, if any. */
    getSelectedEntity() {
        if (!this.store.selectedEntityId)
            return null;
        return this.store.entities.find((e) => e.id === this.store.selectedEntityId) ?? null;
    }
    /**
     * Apply runtime render-only entity positions (e.g., from playtest snapshot).
     * Pass `null` to clear and return to authored store positions.
     */
    setPlaytestEntityPositions(entities) {
        if (!entities) {
            this.playtestEntityPositions = null;
            this.render();
            return;
        }
        const next = new Map();
        for (const e of entities) {
            next.set(e.id, { x: e.x, y: e.y });
        }
        this.playtestEntityPositions = next;
        this.render();
    }
    /** Returns the currently rendered position (runtime override when present, otherwise authored). */
    getRenderedEntityPosition(entityId) {
        const entity = this.store.entities.find((e) => e.id === entityId);
        if (!entity)
            return null;
        const live = this.playtestEntityPositions?.get(entityId);
        if (live)
            return { x: live.x, y: live.y };
        return { x: entity.position.x, y: entity.position.y };
    }
    /** Return all quest graph nodes for Story panel workflows. */
    getQuestNodes() {
        return this.store.questGraph.nodes;
    }
    /** Return selected quest node, if any. */
    getSelectedQuestNode() {
        return this.store.getSelectedQuestNode();
    }
    /** Select quest node by ID for Story panel inspector binding. */
    selectQuestNode(nodeId) {
        if (!nodeId) {
            this.store.selectQuestNode(null);
            return null;
        }
        const node = this.store.questGraph.nodes.find((n) => n.nodeId === nodeId) ?? null;
        this.store.selectQuestNode(node?.nodeId ?? null);
        return node;
    }
    /**
     * Apply or clear a map-level effects preset via command bus.
     * Mutations must go through runtime-web ProjectStore for determinism + undo/redo.
     */
    applyEffectPreset(presetId, intensity) {
        this.diagnosticStore.removeByCodeAndPath('EFFECT_PRESET_UNKNOWN', '/effects');
        const event = this.bus.dispatch({
            type: 'effects:applyPreset',
            payload: { presetId, intensity },
        });
        if (!event) {
            this.addEditorDiagnostic('EFFECT_PRESET_UNKNOWN', '/effects/preset', 'Unknown effect preset ID.', undefined, 'warning');
            return false;
        }
        return true;
    }
    /**
     * Link effect intensity to a world field (FX-FIELD-001).
     * Uses command path so coupling config remains undoable and persisted.
     */
    setEffectFieldCoupling(fieldId, influence) {
        this.diagnosticStore.removeByCodeAndPath('EFFECT_FIELD_UNKNOWN', '/effects/fieldLink');
        const event = this.bus.dispatch({
            type: 'effects:setFieldCoupling',
            payload: { fieldId, influence },
        });
        if (!event) {
            this.addEditorDiagnostic('EFFECT_FIELD_UNKNOWN', '/effects/fieldLink', 'Unknown effect field ID.', undefined, 'warning');
            return false;
        }
        return true;
    }
    /** Update editable basics of a quest node from Story inspector. */
    updateQuestNodeBasics(nodeId, fields) {
        const node = this.store.questGraph.nodes.find((n) => n.nodeId === nodeId);
        if (!node)
            return false;
        const trimmedName = fields.name.trim();
        if (!trimmedName)
            return false;
        node.name = trimmedName;
        node.kind = fields.kind;
        return true;
    }
    /** Select entity at canvas-space pixel coordinates. */
    selectEntityAtPoint(px, py) {
        const entity = this.store.entityAtPoint(px, py) ?? null;
        this.store.selectEntity(entity?.id ?? null);
        this.render();
        return entity;
    }
    /** Set hovered tile cell for editor feedback. Pass null to clear. */
    setHoverCell(tx, ty) {
        if (tx === null || ty === undefined) {
            this.hoverCell = null;
            this.render();
            return;
        }
        this.hoverCell = { tx, ty };
        this.render();
    }
    /**
     * Tasks derived from all diagnostics (UI-TASKS-002).
     * Uses the DiagnosticStore's task generation with actionable labels and fix actions.
     */
    getTasks() {
        return this.diagnosticStore.generateTasks();
    }
    /**
     * Apply a fix action from a task (UI-TASKS-003).
     * Deterministic fixes dispatch through the CommandBus.
     * Non-deterministic fixes return false (caller should open the relevant editor surface).
     */
    applyFix(task) {
        if (!task.fixAction)
            return false;
        if (!task.fixAction.deterministic)
            return false;
        const diagnostic = this.diagnosticStore.getAll().find((d) => d.id === task.diagnosticId);
        if (!diagnostic)
            return false;
        if (!task.fixAction.commandType || !task.fixAction.commandPayload)
            return false;
        // Deterministic auto-fix: dispatch command and confirm success before removing
        const event = this.bus.dispatch({
            type: task.fixAction.commandType,
            payload: task.fixAction.commandPayload,
        });
        if (!event)
            return false;
        // Re-validate duplicate-name diagnostics after rename commands.
        if (diagnostic.code === 'EDIT_DUPLICATE_ENTITY_NAME') {
            this.refreshDuplicateNameDiagnostics();
            return true;
        }
        // Remove the fixed diagnostic
        this.diagnosticStore.remove(task.diagnosticId);
        return true;
    }
    /** Render the current project state to canvas. */
    render() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        if (!ctx || !canvas)
            return;
        const tileSize = this.store.manifest.tileSize;
        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= canvas.width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        // Draw tiles (filled tiles get a color based on tile ID)
        for (const layer of this.store.tileLayers) {
            for (let gy = 0; gy < layer.height; gy++) {
                for (let gx = 0; gx < layer.width; gx++) {
                    const tileId = layer.data[gy * layer.width + gx];
                    if (tileId > 0) {
                        const hue = (tileId * 47) % 360;
                        ctx.fillStyle = `hsl(${hue}, 60%, 50%)`;
                        ctx.fillRect(gx * tileSize, gy * tileSize, tileSize, tileSize);
                    }
                }
            }
        }
        // Draw entities
        for (const entity of this.store.entities) {
            const live = this.playtestEntityPositions?.get(entity.id);
            const rx = live?.x ?? entity.position.x;
            const ry = live?.y ?? entity.position.y;
            ctx.fillStyle = entity.solid ? '#e74c3c' : '#3498db';
            ctx.fillRect(rx, ry, entity.size.w, entity.size.h);
            if (entity.id === this.store.selectedEntityId) {
                ctx.strokeStyle = '#f1c40f';
                ctx.lineWidth = 2;
                ctx.strokeRect(rx, ry, entity.size.w, entity.size.h);
            }
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(entity.name, rx + 2, ry + 12);
        }
        // Draw hovered tile cell outline for authoring feedback
        if (this.hoverCell) {
            const layer = this.store.tileLayers[0];
            if (layer) {
                const { tx, ty } = this.hoverCell;
                if (tx >= 0 && ty >= 0 && tx < layer.width && ty < layer.height) {
                    ctx.strokeStyle = '#6bd9ff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(tx * tileSize + 0.5, ty * tileSize + 0.5, tileSize - 1, tileSize - 1);
                }
            }
        }
    }
    /** Emit an editor-time diagnostic with auto-resolved fix actions. */
    addEditorDiagnostic(code, path, message, fixOverride, severity = 'error') {
        const baseAction = fixOverride ?? resolveFixAction(code);
        this.diagnosticStore.add({
            id: `editor:${code}:${path}`,
            code,
            severity,
            source: 'editor',
            path,
            message,
            actions: baseAction ? [baseAction] : [],
        });
    }
    /** Check if an entity extends beyond canvas bounds and emit diagnostic with deterministic fix. */
    checkEntityBounds(entityId) {
        const entity = this.store.entities.find((e) => e.id === entityId);
        if (!entity)
            return;
        const maxX = this.store.manifest.resolution.width - entity.size.w;
        const maxY = this.store.manifest.resolution.height - entity.size.h;
        if (entity.position.x < 0 || entity.position.y < 0 ||
            entity.position.x > maxX || entity.position.y > maxY) {
            const clampedX = Math.max(0, Math.min(entity.position.x, maxX));
            const clampedY = Math.max(0, Math.min(entity.position.y, maxY));
            this.addEditorDiagnostic('EDIT_ENTITY_OUT_OF_BOUNDS', `/entities/${entityId}`, 'Entity extends beyond canvas bounds.', {
                label: 'Clamp entity to canvas bounds',
                deterministic: true,
                commandType: 'entity:move',
                commandPayload: { entityId, x: clampedX, y: clampedY },
            });
        }
    }
    /** Clears and re-emits EDIT_DUPLICATE_ENTITY_NAME diagnostics for all affected entities. */
    refreshDuplicateNameDiagnostics() {
        // Clear all existing duplicate-name diagnostics
        for (const entity of this.store.entities) {
            this.diagnosticStore.removeByCodeAndPath('EDIT_DUPLICATE_ENTITY_NAME', `/entities/${entity.id}`);
        }
        // Count occurrences of each name
        const nameCounts = new Map();
        for (const entity of this.store.entities) {
            nameCounts.set(entity.name, (nameCounts.get(entity.name) ?? 0) + 1);
        }
        // Emit for every entity whose name is duplicated
        for (const entity of this.store.entities) {
            if ((nameCounts.get(entity.name) ?? 0) > 1) {
                const uniqueName = this.suggestUniqueEntityName(entity.id, entity.name);
                this.addEditorDiagnostic('EDIT_DUPLICATE_ENTITY_NAME', `/entities/${entity.id}`, `Duplicate entity name: "${entity.name}".`, {
                    label: `Rename to ${uniqueName}`,
                    deterministic: true,
                    commandType: 'entity:rename',
                    commandPayload: { entityId: entity.id, name: uniqueName },
                }, 'info');
            }
        }
    }
    suggestUniqueEntityName(entityId, baseName) {
        const used = new Set(this.store.entities.filter((e) => e.id !== entityId).map((e) => e.name));
        if (!used.has(baseName))
            return baseName;
        const idSuffix = entityId.replace(/[^A-Za-z0-9]/g, '') || 'id';
        let candidate = `${baseName}_${idSuffix}`;
        let suffix = 2;
        while (used.has(candidate)) {
            candidate = `${baseName}_${idSuffix}_${suffix}`;
            suffix += 1;
        }
        return candidate;
    }
    isValidAssetRef(assetId) {
        if (!assetId)
            return true;
        return /^asset[-_][A-Za-z0-9:_-]{1,126}$/.test(assetId);
    }
    clearExportPreflightDiagnostics() {
        const exportCodes = [
            'EXPORT_PREFLIGHT_LAYER_MISSING',
            'EXPORT_PREFLIGHT_PLAYER_MISSING',
            'EXPORT_PREFLIGHT_MAP_EMPTY',
        ];
        for (const code of exportCodes) {
            this.diagnosticStore.removeByCodeAndPath(code, '/');
        }
    }
}
//# sourceMappingURL=editor-app.js.map