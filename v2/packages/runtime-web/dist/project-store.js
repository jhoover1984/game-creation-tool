import { detectCircularAttachment } from './animation-anchor.js';
import { validateProjectJson } from './project-validation.js';
import { isKnownEffectFieldId, isKnownPresetId } from './effect-store.js';
/** In-memory project state. Mirrors Rust Project struct until WASM is wired. */
export class ProjectStore {
    manifest;
    tileLayers;
    entities;
    questGraph;
    behaviors = {};
    clips = [];
    /** Sprite pixel buffers authored in the Sprite Workspace (SPRITE-PERSIST-001). */
    sprites = {};
    effectState = {
        activePresetId: null,
        intensity: 0.5,
        fieldLink: { fieldId: null, influence: 0 },
    };
    selectedEntityId = null;
    selectedQuestNodeId = null;
    undoStack = [];
    redoStack = [];
    activeBatch = null;
    validationDiagnostics = [];
    bus;
    constructor(bus) {
        this.bus = bus;
        this.manifest = {
            id: '',
            name: '',
            version: '0.1.0',
            resolution: { width: 320, height: 240 },
            tileSize: 16,
            createdAt: '',
            updatedAt: '',
        };
        this.tileLayers = [];
        this.entities = [];
        this.questGraph = {
            schemaVersion: '2.0.0',
            nodes: [],
            edges: [],
        };
        this.registerHandlers();
    }
    /** Create a new empty project. */
    createProject(name, width, height, tileSize) {
        const now = new Date().toISOString();
        this.manifest = {
            id: `proj-${Date.now().toString(36)}`,
            name,
            version: '0.1.0',
            resolution: { width: width * tileSize, height: height * tileSize },
            tileSize,
            createdAt: now,
            updatedAt: now,
        };
        this.tileLayers = [
            {
                id: 'layer-0',
                name: 'Ground',
                width,
                height,
                tileSize,
                data: new Array(width * height).fill(0),
            },
        ];
        this.entities = [];
        this.behaviors = {};
        this.clips = [];
        this.sprites = {};
        this.questGraph = {
            schemaVersion: '2.0.0',
            nodes: [
                { nodeId: 'node_start', kind: 'start', name: 'Start' },
                { nodeId: 'node_end', kind: 'end', name: 'End' },
            ],
            edges: [{ from: 'node_start', to: 'node_end' }],
        };
        this.effectState = {
            activePresetId: null,
            intensity: 0.5,
            fieldLink: { fieldId: null, influence: 0 },
        };
        this.selectedEntityId = null;
        this.selectedQuestNodeId = null;
        this.undoStack = [];
        this.redoStack = [];
        this.validationDiagnostics = [];
    }
    /** Save project to JSON string. */
    saveToJson() {
        return JSON.stringify({
            manifest: this.manifest,
            tileLayers: this.tileLayers,
            entities: this.entities,
            story: {
                questGraph: this.questGraph,
            },
            behaviors: this.behaviors,
            effectState: this.effectState,
            clips: this.clips,
            sprites: this.sprites,
        }, null, 2);
    }
    /** Load project from JSON string. */
    loadFromJson(json) {
        const result = validateProjectJson(json);
        this.manifest = result.project.manifest;
        this.tileLayers = result.project.tileLayers;
        this.entities = result.project.entities;
        this.questGraph = result.project.story?.questGraph ?? {
            schemaVersion: '2.0.0',
            nodes: [],
            edges: [],
        };
        this.behaviors = result.project.behaviors ?? {};
        this.clips = result.project.clips ?? [];
        this.sprites = result.project.sprites ?? {};
        const savedEffect = result.project.effectState;
        this.effectState = isValidEffectState(savedEffect)
            ? savedEffect
            : {
                activePresetId: null,
                intensity: 0.5,
                fieldLink: { fieldId: null, influence: 0 },
            };
        this.validationDiagnostics = result.diagnostics;
        this.selectedEntityId = null;
        this.selectedQuestNodeId = null;
        this.undoStack = [];
        this.redoStack = [];
    }
    /** Upsert a sprite asset's pixel data (SPRITE-PERSIST-001). */
    setSpriteAsset(data) {
        this.sprites[data.assetId] = data;
    }
    /** Return all stored sprite assets. */
    getAllSpriteAssets() {
        return this.sprites;
    }
    /** Return latest project load diagnostics (warnings/info). */
    getValidationDiagnostics() {
        return [...this.validationDiagnostics];
    }
    /** Get all behavior rows for an entity. Returns [] if none exist. */
    getBehaviors(entityId) {
        return this.behaviors[entityId] ?? [];
    }
    canUndo() {
        return this.undoStack.length > 0;
    }
    canRedo() {
        return this.redoStack.length > 0;
    }
    beginUndoBatch() {
        if (this.activeBatch)
            return false;
        this.activeBatch = [];
        return true;
    }
    endUndoBatch() {
        if (!this.activeBatch)
            return false;
        const records = this.activeBatch;
        this.activeBatch = null;
        if (records.length === 0)
            return true;
        if (records.length === 1) {
            this.undoStack.push(records[0]);
        }
        else {
            this.undoStack.push({ type: 'group', records });
        }
        this.redoStack = [];
        return true;
    }
    undo() {
        const record = this.undoStack.pop();
        if (!record)
            return;
        this.applyInverse(record);
        this.redoStack.push(record);
    }
    redo() {
        const record = this.redoStack.pop();
        if (!record)
            return;
        this.applyForward(record);
        this.undoStack.push(record);
    }
    /** Select an entity by ID. Pass null to deselect. */
    selectEntity(entityId) {
        this.selectedEntityId = entityId;
    }
    /** Select a quest node by ID. Pass null to deselect. */
    selectQuestNode(nodeId) {
        this.selectedQuestNodeId = nodeId;
    }
    /** Return selected quest node, if any. */
    getSelectedQuestNode() {
        if (!this.selectedQuestNodeId)
            return null;
        return this.questGraph.nodes.find((n) => n.nodeId === this.selectedQuestNodeId) ?? null;
    }
    /** Find entity at a pixel position (for click-to-select). */
    entityAtPoint(px, py) {
        // Search in reverse so topmost entity wins
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            if (px >= e.position.x &&
                px < e.position.x + e.size.w &&
                py >= e.position.y &&
                py < e.position.y + e.size.h) {
                return e;
            }
        }
        return undefined;
    }
    registerHandlers() {
        this.bus.on('tile:set', (cmd) => {
            const layer = this.tileLayers.find((l) => l.id === cmd.payload.layerId);
            if (!layer)
                return null;
            const idx = cmd.payload.y * layer.width + cmd.payload.x;
            if (idx < 0 || idx >= layer.data.length)
                return null;
            const oldTile = layer.data[idx];
            layer.data[idx] = cmd.payload.tileId;
            this.pushUndoRecord({
                type: 'tile:set',
                layerId: cmd.payload.layerId,
                x: cmd.payload.x,
                y: cmd.payload.y,
                oldTile,
                newTile: cmd.payload.tileId,
            });
            return {
                type: 'tile:set:done',
                payload: { ...cmd.payload, oldTile },
                timestamp: Date.now(),
            };
        });
        this.bus.on('entity:create', (cmd) => {
            const entity = {
                id: `ent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                name: cmd.payload.name,
                position: { x: cmd.payload.x, y: cmd.payload.y },
                size: { w: 16, h: 16 },
                solid: false,
                tags: [],
            };
            this.entities.push(entity);
            this.pushUndoRecord({ type: 'entity:create', entity: structuredClone(entity) });
            return {
                type: 'entity:created',
                payload: entity,
                timestamp: Date.now(),
            };
        });
        this.bus.on('entity:delete', (cmd) => {
            const idx = this.entities.findIndex((e) => e.id === cmd.payload.entityId);
            if (idx === -1)
                return null;
            const entity = structuredClone(this.entities[idx]);
            const savedBehaviors = structuredClone(this.behaviors[cmd.payload.entityId] ?? []);
            this.entities.splice(idx, 1);
            delete this.behaviors[cmd.payload.entityId];
            if (this.selectedEntityId === cmd.payload.entityId) {
                this.selectedEntityId = null;
            }
            this.pushUndoRecord({ type: 'entity:delete', entity, savedBehaviors });
            return {
                type: 'entity:deleted',
                payload: cmd.payload,
                timestamp: Date.now(),
            };
        });
        this.bus.on('entity:move', (cmd) => {
            const entity = this.entities.find((e) => e.id === cmd.payload.entityId);
            if (!entity)
                return null;
            const oldX = entity.position.x;
            const oldY = entity.position.y;
            entity.position = { x: cmd.payload.x, y: cmd.payload.y };
            this.pushUndoRecord({
                type: 'entity:move',
                entityId: cmd.payload.entityId,
                oldX,
                oldY,
                newX: cmd.payload.x,
                newY: cmd.payload.y,
            });
            return {
                type: 'entity:moved',
                payload: cmd.payload,
                timestamp: Date.now(),
            };
        });
        this.bus.on('entity:updateVisual', (cmd) => {
            const entity = this.entities.find((e) => e.id === cmd.payload.entityId);
            if (!entity)
                return null;
            const oldSolid = entity.solid;
            const oldSpriteId = entity.spriteId;
            const oldAnimationClipId = entity.animationClipId;
            entity.solid = cmd.payload.solid;
            entity.spriteId = cmd.payload.spriteId;
            entity.animationClipId = cmd.payload.animationClipId;
            this.pushUndoRecord({
                type: 'entity:updateVisual',
                entityId: cmd.payload.entityId,
                oldSolid,
                oldSpriteId,
                oldAnimationClipId,
                newSolid: cmd.payload.solid,
                newSpriteId: cmd.payload.spriteId,
                newAnimationClipId: cmd.payload.animationClipId,
            });
            return {
                type: 'entity:visualUpdated',
                payload: cmd.payload,
                timestamp: Date.now(),
            };
        });
        this.bus.on('entity:setSpeed', (cmd) => {
            const entity = this.entities.find((e) => e.id === cmd.payload.entityId);
            if (!entity)
                return null;
            const oldSpeed = entity.speed;
            const newSpeed = Math.max(0, Math.round(cmd.payload.speed));
            entity.speed = newSpeed;
            // Skip undo push when speed is unchanged (prevents no-op history entries).
            const effectiveOld = oldSpeed ?? 120;
            if (newSpeed !== effectiveOld) {
                this.pushUndoRecord({
                    type: 'entity:setSpeed',
                    entityId: cmd.payload.entityId,
                    oldSpeed,
                    newSpeed,
                });
            }
            return {
                type: 'entity:speedSet',
                payload: { entityId: cmd.payload.entityId, speed: newSpeed },
                timestamp: Date.now(),
            };
        });
        this.bus.on('entity:rename', (cmd) => {
            const entity = this.entities.find((e) => e.id === cmd.payload.entityId);
            if (!entity)
                return null;
            const oldName = entity.name;
            entity.name = cmd.payload.name;
            this.pushUndoRecord({
                type: 'entity:rename',
                entityId: entity.id,
                oldName,
                newName: cmd.payload.name,
            });
            return {
                type: 'entity:renamed',
                payload: cmd.payload,
                timestamp: Date.now(),
            };
        });
        this.bus.on('behavior:row:add', (cmd) => {
            const { entityId, row } = cmd.payload;
            if (!this.behaviors[entityId]) {
                this.behaviors[entityId] = [];
            }
            this.behaviors[entityId].push(structuredClone(row));
            this.pushUndoRecord({ type: 'behavior:row:add', entityId, row: structuredClone(row) });
            return {
                type: 'behavior:row:added',
                payload: { entityId, rowId: row.id },
                timestamp: Date.now(),
            };
        });
        this.bus.on('behavior:row:remove', (cmd) => {
            const { entityId, rowId } = cmd.payload;
            const rows = this.behaviors[entityId];
            if (!rows)
                return null;
            const idx = rows.findIndex((r) => r.id === rowId);
            if (idx === -1)
                return null;
            const row = structuredClone(rows[idx]);
            rows.splice(idx, 1);
            this.pushUndoRecord({ type: 'behavior:row:remove', entityId, row });
            return {
                type: 'behavior:row:removed',
                payload: { entityId, rowId },
                timestamp: Date.now(),
            };
        });
        this.bus.on('behavior:row:update', (cmd) => {
            const { entityId, rowId, patch } = cmd.payload;
            const rows = this.behaviors[entityId];
            if (!rows)
                return null;
            const row = rows.find((r) => r.id === rowId);
            if (!row)
                return null;
            const before = structuredClone(row);
            Object.assign(row, patch);
            const after = structuredClone(row);
            this.pushUndoRecord({ type: 'behavior:row:update', entityId, before, after });
            return {
                type: 'behavior:row:updated',
                payload: { entityId, rowId },
                timestamp: Date.now(),
            };
        });
        this.bus.on('effects:applyPreset', (cmd) => {
            if (cmd.payload.presetId !== null && !isKnownPresetId(cmd.payload.presetId)) {
                return null; // unknown preset ID -- caller should emit diagnostic
            }
            const clampedIntensity = Math.max(0, Math.min(1, cmd.payload.intensity));
            const before = {
                ...this.effectState,
                fieldLink: { ...this.effectState.fieldLink },
            };
            const after = {
                activePresetId: cmd.payload.presetId,
                intensity: clampedIntensity,
                fieldLink: { ...this.effectState.fieldLink },
            };
            this.effectState = after;
            this.pushUndoRecord({ type: 'effects:applyPreset', before, after });
            return {
                type: 'effects:presetApplied',
                payload: { presetId: after.activePresetId, intensity: after.intensity },
                timestamp: Date.now(),
            };
        });
        this.bus.on('effects:setFieldCoupling', (cmd) => {
            if (cmd.payload.fieldId !== null && !isKnownEffectFieldId(cmd.payload.fieldId)) {
                return null;
            }
            const clampedInfluence = Math.max(0, Math.min(1, cmd.payload.influence));
            const before = {
                ...this.effectState,
                fieldLink: { ...this.effectState.fieldLink },
            };
            const after = {
                ...this.effectState,
                fieldLink: {
                    fieldId: cmd.payload.fieldId,
                    influence: clampedInfluence,
                },
            };
            this.effectState = after;
            this.pushUndoRecord({ type: 'effects:setFieldCoupling', before, after });
            return {
                type: 'effects:fieldCouplingSet',
                payload: { ...after.fieldLink },
                timestamp: Date.now(),
            };
        });
        // -- Animation anchor handlers (ANIM-ANCHOR-001) --
        this.bus.on('animation:anchor:add', (cmd) => {
            const clip = this.clips.find((c) => c.id === cmd.payload.clipId);
            if (!clip)
                return null;
            if (!clip.anchors)
                clip.anchors = {};
            if (!clip.anchors[cmd.payload.anchorName])
                clip.anchors[cmd.payload.anchorName] = [];
            if (clip.anchors[cmd.payload.anchorName].some((k) => k.frame === cmd.payload.keyframe.frame)) {
                return null;
            }
            const keyframe = structuredClone(cmd.payload.keyframe);
            clip.anchors[cmd.payload.anchorName].push(keyframe);
            this.pushUndoRecord({
                type: 'animation:anchor:add',
                clipId: cmd.payload.clipId,
                anchorName: cmd.payload.anchorName,
                keyframe: structuredClone(keyframe),
            });
            return {
                type: 'animation:anchor:added',
                payload: { clipId: cmd.payload.clipId, anchorName: cmd.payload.anchorName, frame: keyframe.frame },
                timestamp: Date.now(),
            };
        });
        this.bus.on('animation:anchor:move', (cmd) => {
            const clip = this.clips.find((c) => c.id === cmd.payload.clipId);
            if (!clip)
                return null;
            const keyframes = clip.anchors?.[cmd.payload.anchorName];
            if (!keyframes)
                return null;
            const kf = keyframes.find((k) => k.frame === cmd.payload.frame);
            if (!kf)
                return null;
            const oldKeyframe = structuredClone(kf);
            kf.pos = { ...cmd.payload.pos };
            if (cmd.payload.rot !== undefined)
                kf.rot = cmd.payload.rot;
            if (cmd.payload.flip !== undefined)
                kf.flip = cmd.payload.flip;
            const newKeyframe = structuredClone(kf);
            this.pushUndoRecord({
                type: 'animation:anchor:move',
                clipId: cmd.payload.clipId,
                anchorName: cmd.payload.anchorName,
                oldKeyframe,
                newKeyframe,
            });
            return {
                type: 'animation:anchor:moved',
                payload: { clipId: cmd.payload.clipId, anchorName: cmd.payload.anchorName, frame: cmd.payload.frame },
                timestamp: Date.now(),
            };
        });
        this.bus.on('animation:anchor:remove', (cmd) => {
            const clip = this.clips.find((c) => c.id === cmd.payload.clipId);
            if (!clip)
                return null;
            const keyframes = clip.anchors?.[cmd.payload.anchorName];
            if (!keyframes)
                return null;
            const idx = keyframes.findIndex((k) => k.frame === cmd.payload.frame);
            if (idx === -1)
                return null;
            const keyframe = structuredClone(keyframes[idx]);
            keyframes.splice(idx, 1);
            this.pushUndoRecord({
                type: 'animation:anchor:remove',
                clipId: cmd.payload.clipId,
                anchorName: cmd.payload.anchorName,
                keyframe,
            });
            return {
                type: 'animation:anchor:removed',
                payload: { clipId: cmd.payload.clipId, anchorName: cmd.payload.anchorName, frame: cmd.payload.frame },
                timestamp: Date.now(),
            };
        });
        // -- Entity slot handlers (ANIM-ANCHOR-002/003) --
        this.bus.on('entity:slot:attach', (cmd) => {
            const entity = this.entities.find((e) => e.id === cmd.payload.entityId);
            if (!entity)
                return null;
            if (detectCircularAttachment(this.entities, cmd.payload.entityId, cmd.payload.parentEntityId)) {
                return null;
            }
            const attachment = {
                slotName: cmd.payload.slotName,
                slotType: cmd.payload.slotType,
                parentEntityId: cmd.payload.parentEntityId,
                anchorName: cmd.payload.anchorName,
                occlusionHint: cmd.payload.occlusionHint,
            };
            if (!entity.slots)
                entity.slots = [];
            if (entity.slots.some((s) => s.slotName === attachment.slotName)) {
                return null;
            }
            entity.slots.push(structuredClone(attachment));
            this.pushUndoRecord({
                type: 'entity:slot:attach',
                entityId: cmd.payload.entityId,
                attachment: structuredClone(attachment),
            });
            return {
                type: 'entity:slot:attached',
                payload: { entityId: cmd.payload.entityId, slotName: cmd.payload.slotName },
                timestamp: Date.now(),
            };
        });
        this.bus.on('entity:slot:detach', (cmd) => {
            const entity = this.entities.find((e) => e.id === cmd.payload.entityId);
            if (!entity || !entity.slots)
                return null;
            const idx = entity.slots.findIndex((s) => s.slotName === cmd.payload.slotName);
            if (idx === -1)
                return null;
            const attachment = structuredClone(entity.slots[idx]);
            entity.slots.splice(idx, 1);
            this.pushUndoRecord({
                type: 'entity:slot:detach',
                entityId: cmd.payload.entityId,
                attachment,
            });
            return {
                type: 'entity:slot:detached',
                payload: { entityId: cmd.payload.entityId, slotName: cmd.payload.slotName },
                timestamp: Date.now(),
            };
        });
        this.bus.on('entity:slot:setOcclusion', (cmd) => {
            const entity = this.entities.find((e) => e.id === cmd.payload.entityId);
            if (!entity || !entity.slots)
                return null;
            const slot = entity.slots.find((s) => s.slotName === cmd.payload.slotName);
            if (!slot)
                return null;
            const oldHint = slot.occlusionHint;
            slot.occlusionHint = cmd.payload.occlusionHint;
            this.pushUndoRecord({
                type: 'entity:slot:setOcclusion',
                entityId: cmd.payload.entityId,
                slotName: cmd.payload.slotName,
                oldHint,
                newHint: cmd.payload.occlusionHint,
            });
            return {
                type: 'entity:slot:occlusionSet',
                payload: { entityId: cmd.payload.entityId, slotName: cmd.payload.slotName, occlusionHint: cmd.payload.occlusionHint },
                timestamp: Date.now(),
            };
        });
    }
    /** Apply an undo record in reverse. */
    applyInverse(record) {
        switch (record.type) {
            case 'group': {
                for (let i = record.records.length - 1; i >= 0; i--) {
                    this.applyInverse(record.records[i]);
                }
                break;
            }
            case 'tile:set': {
                const layer = this.tileLayers.find((l) => l.id === record.layerId);
                if (layer) {
                    layer.data[record.y * layer.width + record.x] = record.oldTile;
                }
                break;
            }
            case 'entity:create': {
                const idx = this.entities.findIndex((e) => e.id === record.entity.id);
                if (idx !== -1)
                    this.entities.splice(idx, 1);
                delete this.behaviors[record.entity.id];
                break;
            }
            case 'entity:delete': {
                this.entities.push(structuredClone(record.entity));
                this.behaviors[record.entity.id] = structuredClone(record.savedBehaviors);
                break;
            }
            case 'entity:move': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent)
                    ent.position = { x: record.oldX, y: record.oldY };
                break;
            }
            case 'entity:updateVisual': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent) {
                    ent.solid = record.oldSolid;
                    ent.spriteId = record.oldSpriteId;
                    ent.animationClipId = record.oldAnimationClipId;
                }
                break;
            }
            case 'entity:rename': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent)
                    ent.name = record.oldName;
                break;
            }
            case 'entity:setSpeed': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent)
                    ent.speed = record.oldSpeed;
                break;
            }
            case 'behavior:row:add': {
                const rows = this.behaviors[record.entityId];
                if (rows) {
                    const idx = rows.findIndex((r) => r.id === record.row.id);
                    if (idx !== -1)
                        rows.splice(idx, 1);
                }
                break;
            }
            case 'behavior:row:remove': {
                if (!this.behaviors[record.entityId]) {
                    this.behaviors[record.entityId] = [];
                }
                this.behaviors[record.entityId].push(structuredClone(record.row));
                break;
            }
            case 'behavior:row:update': {
                const rows = this.behaviors[record.entityId];
                if (rows) {
                    const idx = rows.findIndex((r) => r.id === record.before.id);
                    if (idx !== -1)
                        rows[idx] = structuredClone(record.before);
                }
                break;
            }
            case 'effects:applyPreset': {
                this.effectState = {
                    ...record.before,
                    fieldLink: { ...record.before.fieldLink },
                };
                break;
            }
            case 'effects:setFieldCoupling': {
                this.effectState = {
                    ...record.before,
                    fieldLink: { ...record.before.fieldLink },
                };
                break;
            }
            case 'animation:anchor:add': {
                const clip = this.clips.find((c) => c.id === record.clipId);
                if (clip?.anchors?.[record.anchorName]) {
                    const kfs = clip.anchors[record.anchorName];
                    const idx = kfs.findIndex((k) => k.frame === record.keyframe.frame);
                    if (idx !== -1)
                        kfs.splice(idx, 1);
                }
                break;
            }
            case 'animation:anchor:move': {
                const clip = this.clips.find((c) => c.id === record.clipId);
                if (clip?.anchors?.[record.anchorName]) {
                    const kf = clip.anchors[record.anchorName].find((k) => k.frame === record.oldKeyframe.frame);
                    if (kf)
                        Object.assign(kf, record.oldKeyframe);
                }
                break;
            }
            case 'animation:anchor:remove': {
                const clip = this.clips.find((c) => c.id === record.clipId);
                if (clip) {
                    if (!clip.anchors)
                        clip.anchors = {};
                    if (!clip.anchors[record.anchorName])
                        clip.anchors[record.anchorName] = [];
                    clip.anchors[record.anchorName].push(structuredClone(record.keyframe));
                }
                break;
            }
            case 'entity:slot:attach': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent?.slots) {
                    const idx = ent.slots.findIndex((s) => s.slotName === record.attachment.slotName);
                    if (idx !== -1)
                        ent.slots.splice(idx, 1);
                }
                break;
            }
            case 'entity:slot:detach': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent) {
                    if (!ent.slots)
                        ent.slots = [];
                    ent.slots.push(structuredClone(record.attachment));
                }
                break;
            }
            case 'entity:slot:setOcclusion': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                const slot = ent?.slots?.find((s) => s.slotName === record.slotName);
                if (slot)
                    slot.occlusionHint = record.oldHint;
                break;
            }
        }
    }
    /** Apply an undo record forward (for redo). */
    applyForward(record) {
        switch (record.type) {
            case 'group': {
                for (const item of record.records) {
                    this.applyForward(item);
                }
                break;
            }
            case 'tile:set': {
                const layer = this.tileLayers.find((l) => l.id === record.layerId);
                if (layer) {
                    layer.data[record.y * layer.width + record.x] = record.newTile;
                }
                break;
            }
            case 'entity:create': {
                this.entities.push(structuredClone(record.entity));
                break;
            }
            case 'entity:delete': {
                const idx = this.entities.findIndex((e) => e.id === record.entity.id);
                if (idx !== -1)
                    this.entities.splice(idx, 1);
                delete this.behaviors[record.entity.id];
                break;
            }
            case 'entity:move': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent)
                    ent.position = { x: record.newX, y: record.newY };
                break;
            }
            case 'entity:updateVisual': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent) {
                    ent.solid = record.newSolid;
                    ent.spriteId = record.newSpriteId;
                    ent.animationClipId = record.newAnimationClipId;
                }
                break;
            }
            case 'entity:rename': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent)
                    ent.name = record.newName;
                break;
            }
            case 'entity:setSpeed': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent)
                    ent.speed = record.newSpeed;
                break;
            }
            case 'behavior:row:add': {
                if (!this.behaviors[record.entityId]) {
                    this.behaviors[record.entityId] = [];
                }
                this.behaviors[record.entityId].push(structuredClone(record.row));
                break;
            }
            case 'behavior:row:remove': {
                const rows = this.behaviors[record.entityId];
                if (rows) {
                    const idx = rows.findIndex((r) => r.id === record.row.id);
                    if (idx !== -1)
                        rows.splice(idx, 1);
                }
                break;
            }
            case 'behavior:row:update': {
                const rows = this.behaviors[record.entityId];
                if (rows) {
                    const idx = rows.findIndex((r) => r.id === record.after.id);
                    if (idx !== -1)
                        rows[idx] = structuredClone(record.after);
                }
                break;
            }
            case 'effects:applyPreset': {
                this.effectState = {
                    ...record.after,
                    fieldLink: { ...record.after.fieldLink },
                };
                break;
            }
            case 'effects:setFieldCoupling': {
                this.effectState = {
                    ...record.after,
                    fieldLink: { ...record.after.fieldLink },
                };
                break;
            }
            case 'animation:anchor:add': {
                const clip = this.clips.find((c) => c.id === record.clipId);
                if (clip) {
                    if (!clip.anchors)
                        clip.anchors = {};
                    if (!clip.anchors[record.anchorName])
                        clip.anchors[record.anchorName] = [];
                    clip.anchors[record.anchorName].push(structuredClone(record.keyframe));
                }
                break;
            }
            case 'animation:anchor:move': {
                const clip = this.clips.find((c) => c.id === record.clipId);
                if (clip?.anchors?.[record.anchorName]) {
                    const kf = clip.anchors[record.anchorName].find((k) => k.frame === record.newKeyframe.frame);
                    if (kf)
                        Object.assign(kf, record.newKeyframe);
                }
                break;
            }
            case 'animation:anchor:remove': {
                const clip = this.clips.find((c) => c.id === record.clipId);
                if (clip?.anchors?.[record.anchorName]) {
                    const kfs = clip.anchors[record.anchorName];
                    const idx = kfs.findIndex((k) => k.frame === record.keyframe.frame);
                    if (idx !== -1)
                        kfs.splice(idx, 1);
                }
                break;
            }
            case 'entity:slot:attach': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent) {
                    if (!ent.slots)
                        ent.slots = [];
                    ent.slots.push(structuredClone(record.attachment));
                }
                break;
            }
            case 'entity:slot:detach': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                if (ent?.slots) {
                    const idx = ent.slots.findIndex((s) => s.slotName === record.attachment.slotName);
                    if (idx !== -1)
                        ent.slots.splice(idx, 1);
                }
                break;
            }
            case 'entity:slot:setOcclusion': {
                const ent = this.entities.find((e) => e.id === record.entityId);
                const slot = ent?.slots?.find((s) => s.slotName === record.slotName);
                if (slot)
                    slot.occlusionHint = record.newHint;
                break;
            }
        }
    }
    pushUndoRecord(record) {
        if (this.activeBatch) {
            this.activeBatch.push(record);
            return;
        }
        this.undoStack.push(record);
        this.redoStack = [];
    }
}
/** Validate that a deserialized value is a well-formed MapEffectState. */
function isValidEffectState(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    const obj = v;
    if (typeof obj['intensity'] !== 'number')
        return false;
    const pid = obj['activePresetId'];
    if (pid !== null && !isKnownPresetId(pid))
        return false;
    const fieldLink = obj['fieldLink'];
    if (typeof fieldLink !== 'object' || fieldLink === null)
        return false;
    const link = fieldLink;
    const fieldId = link['fieldId'];
    if (fieldId !== null && !isKnownEffectFieldId(fieldId))
        return false;
    if (typeof link['influence'] !== 'number')
        return false;
    return true;
}
//# sourceMappingURL=project-store.js.map