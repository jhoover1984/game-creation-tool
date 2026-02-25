import { validateQuestGraphSemantics } from '@gcs/contracts';
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function requireObject(value, path) {
    if (!isRecord(value)) {
        throw new Error(`Invalid project JSON: ${path} must be an object`);
    }
    return value;
}
function requireString(value, path) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Invalid project JSON: ${path} must be a non-empty string`);
    }
    return value;
}
function requireNumber(value, path, min) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new Error(`Invalid project JSON: ${path} must be a number`);
    }
    if (min !== undefined && value < min) {
        throw new Error(`Invalid project JSON: ${path} must be >= ${min}`);
    }
    return value;
}
function requireBoolean(value, path) {
    if (typeof value !== 'boolean') {
        throw new Error(`Invalid project JSON: ${path} must be a boolean`);
    }
    return value;
}
function requireStringArray(value, path) {
    if (!Array.isArray(value)) {
        throw new Error(`Invalid project JSON: ${path} must be an array`);
    }
    for (let i = 0; i < value.length; i += 1) {
        if (typeof value[i] !== 'string') {
            throw new Error(`Invalid project JSON: ${path}/${i} must be a string`);
        }
    }
    return value;
}
function requireNumberArray(value, path) {
    if (!Array.isArray(value)) {
        throw new Error(`Invalid project JSON: ${path} must be an array`);
    }
    for (let i = 0; i < value.length; i += 1) {
        if (typeof value[i] !== 'number' || Number.isNaN(value[i])) {
            throw new Error(`Invalid project JSON: ${path}/${i} must be a number`);
        }
    }
    return value;
}
function parseManifest(value) {
    const obj = requireObject(value, '/manifest');
    const resolution = requireObject(obj.resolution, '/manifest/resolution');
    return {
        id: requireString(obj.id, '/manifest/id'),
        name: requireString(obj.name, '/manifest/name'),
        version: requireString(obj.version, '/manifest/version'),
        resolution: {
            width: requireNumber(resolution.width, '/manifest/resolution/width', 1),
            height: requireNumber(resolution.height, '/manifest/resolution/height', 1),
        },
        tileSize: requireNumber(obj.tileSize, '/manifest/tileSize', 1),
        createdAt: requireString(obj.createdAt, '/manifest/createdAt'),
        updatedAt: requireString(obj.updatedAt, '/manifest/updatedAt'),
    };
}
function parseTileLayers(value) {
    if (!Array.isArray(value)) {
        throw new Error('Invalid project JSON: /tileLayers must be an array');
    }
    return value.map((raw, index) => {
        const path = `/tileLayers/${index}`;
        const obj = requireObject(raw, path);
        const width = requireNumber(obj.width, `${path}/width`, 1);
        const height = requireNumber(obj.height, `${path}/height`, 1);
        return {
            id: requireString(obj.id, `${path}/id`),
            name: requireString(obj.name, `${path}/name`),
            width,
            height,
            tileSize: requireNumber(obj.tileSize, `${path}/tileSize`, 1),
            data: requireNumberArray(obj.data, `${path}/data`),
        };
    });
}
function parseEntities(value) {
    if (!Array.isArray(value)) {
        throw new Error('Invalid project JSON: /entities must be an array');
    }
    return value.map((raw, index) => {
        const path = `/entities/${index}`;
        const obj = requireObject(raw, path);
        const position = requireObject(obj.position, `${path}/position`);
        const size = requireObject(obj.size, `${path}/size`);
        const entity = {
            id: requireString(obj.id, `${path}/id`),
            name: requireString(obj.name, `${path}/name`),
            position: {
                x: requireNumber(position.x, `${path}/position/x`),
                y: requireNumber(position.y, `${path}/position/y`),
            },
            size: {
                w: requireNumber(size.w, `${path}/size/w`, 0),
                h: requireNumber(size.h, `${path}/size/h`, 0),
            },
            solid: requireBoolean(obj.solid, `${path}/solid`),
            tags: requireStringArray(obj.tags, `${path}/tags`),
        };
        if (obj.spriteId !== undefined) {
            entity.spriteId = requireString(obj.spriteId, `${path}/spriteId`);
        }
        if (obj.animationClipId !== undefined) {
            entity.animationClipId = requireString(obj.animationClipId, `${path}/animationClipId`);
        }
        if (obj.slots !== undefined) {
            if (!Array.isArray(obj.slots)) {
                throw new Error(`Invalid project JSON: ${path}/slots must be an array`);
            }
            entity.slots = obj.slots.map((rawSlot, slotIndex) => {
                const slotPath = `${path}/slots/${slotIndex}`;
                const slotObj = requireObject(rawSlot, slotPath);
                const slotType = requireString(slotObj.slotType, `${slotPath}/slotType`);
                if (slotType !== 'socket' && slotType !== 'prop') {
                    throw new Error(`Invalid project JSON: ${slotPath}/slotType must be socket|prop`);
                }
                const occlusionHint = requireString(slotObj.occlusionHint, `${slotPath}/occlusionHint`);
                if (occlusionHint !== 'in-front' && occlusionHint !== 'behind' && occlusionHint !== 'auto') {
                    throw new Error(`Invalid project JSON: ${slotPath}/occlusionHint must be in-front|behind|auto`);
                }
                return {
                    slotName: requireString(slotObj.slotName, `${slotPath}/slotName`),
                    slotType,
                    parentEntityId: requireString(slotObj.parentEntityId, `${slotPath}/parentEntityId`),
                    anchorName: requireString(slotObj.anchorName, `${slotPath}/anchorName`),
                    occlusionHint,
                };
            });
        }
        if (typeof obj.speed === 'number' && !Number.isNaN(obj.speed)) {
            entity.speed = Math.max(0, obj.speed);
        }
        return entity;
    });
}
/**
 * Sanitize the behaviors field from stored JSON.
 * Accepts only plain objects whose values are arrays of valid-shaped rows.
 * Drops malformed entries and emits non-fatal diagnostics; never throws.
 */
function sanitizeBehaviors(value, diagnostics) {
    if (value === undefined)
        return {};
    if (!isRecord(value)) {
        diagnostics.push({
            severity: 'warning',
            code: 'BEHAV-LOAD-001',
            path: '/behaviors',
            message: 'behaviors field is not an object; resetting to empty',
        });
        return {};
    }
    const result = {};
    for (const [entityId, rows] of Object.entries(value)) {
        if (!Array.isArray(rows)) {
            diagnostics.push({
                severity: 'warning',
                code: 'BEHAV-LOAD-001',
                path: `/behaviors/${entityId}`,
                message: `behaviors for entity "${entityId}" is not an array; skipping`,
            });
            continue;
        }
        const validRows = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (isRecord(row) &&
                typeof row['id'] === 'string' &&
                isRecord(row['trigger']) &&
                typeof row['trigger']['type'] === 'string' &&
                Array.isArray(row['conditions']) &&
                Array.isArray(row['actions'])) {
                validRows.push(row);
            }
            else {
                diagnostics.push({
                    severity: 'warning',
                    code: 'BEHAV-LOAD-001',
                    path: `/behaviors/${entityId}/${i}`,
                    message: `behavior row at index ${i} has invalid shape; skipping`,
                });
            }
        }
        result[entityId] = validRows;
    }
    return result;
}
function parseStory(value) {
    if (value === undefined)
        return undefined;
    const storyObj = requireObject(value, '/story');
    if (storyObj.questGraph === undefined)
        return {};
    const graph = storyObj.questGraph;
    const graphObj = requireObject(graph, '/story/questGraph');
    const schemaVersion = requireString(graphObj.schemaVersion, '/story/questGraph/schemaVersion');
    if (schemaVersion !== '2.0.0') {
        throw new Error('Invalid project JSON: /story/questGraph/schemaVersion must be 2.0.0');
    }
    if (!Array.isArray(graphObj.nodes) || !Array.isArray(graphObj.edges)) {
        throw new Error('Invalid project JSON: /story/questGraph nodes and edges must be arrays');
    }
    return { questGraph: graph };
}
/**
 * Load sprite pixel buffers from stored JSON.
 * Accepts only well-formed entries (correct pixel array length). Silently drops
 * malformed entries and emits non-fatal diagnostics; never throws.
 */
function parseSpriteAssets(value, diagnostics) {
    if (value === undefined)
        return {};
    if (!isRecord(value)) {
        diagnostics.push({
            severity: 'warning',
            code: 'SPRITE-LOAD-001',
            path: '/sprites',
            message: 'sprites field is not an object; resetting to empty',
        });
        return {};
    }
    const result = {};
    for (const [assetId, raw] of Object.entries(value)) {
        if (!isRecord(raw))
            continue;
        const w = raw['width'];
        const h = raw['height'];
        const pixelsRaw = raw['pixels'];
        if (typeof w !== 'number' || typeof h !== 'number' || !Array.isArray(pixelsRaw)) {
            diagnostics.push({
                severity: 'warning',
                code: 'SPRITE-LOAD-001',
                path: `/sprites/${assetId}`,
                message: `sprite "${assetId}" has invalid shape; skipping`,
            });
            continue;
        }
        const expected = w * h * 4;
        if (pixelsRaw.length !== expected) {
            diagnostics.push({
                severity: 'warning',
                code: 'SPRITE-LOAD-001',
                path: `/sprites/${assetId}/pixels`,
                message: `sprite "${assetId}" has wrong pixel array length (expected ${expected}, got ${pixelsRaw.length}); skipping`,
            });
            continue;
        }
        result[assetId] = {
            assetId,
            width: w,
            height: h,
            pixels: pixelsRaw,
        };
    }
    return result;
}
function parseEffectState(value) {
    if (value === undefined)
        return undefined;
    const obj = requireObject(value, '/effectState');
    const activePresetIdRaw = obj.activePresetId;
    const intensity = requireNumber(obj.intensity, '/effectState/intensity');
    if (activePresetIdRaw !== null && typeof activePresetIdRaw !== 'string') {
        throw new Error('Invalid project JSON: /effectState/activePresetId must be string or null');
    }
    if (activePresetIdRaw !== null &&
        activePresetIdRaw !== 'rain' &&
        activePresetIdRaw !== 'fog' &&
        activePresetIdRaw !== 'night_tint') {
        throw new Error('Invalid project JSON: /effectState/activePresetId is unknown preset');
    }
    let fieldId = null;
    let influence = 0;
    if (obj.fieldLink !== undefined) {
        const fieldLink = requireObject(obj.fieldLink, '/effectState/fieldLink');
        const rawFieldId = fieldLink.fieldId;
        if (rawFieldId !== null && typeof rawFieldId !== 'string') {
            throw new Error('Invalid project JSON: /effectState/fieldLink/fieldId must be string or null');
        }
        if (rawFieldId !== null && rawFieldId !== 'wind.global') {
            throw new Error('Invalid project JSON: /effectState/fieldLink/fieldId is unknown field');
        }
        fieldId = rawFieldId;
        influence = requireNumber(fieldLink.influence, '/effectState/fieldLink/influence');
    }
    return {
        activePresetId: activePresetIdRaw,
        intensity,
        fieldLink: { fieldId, influence },
    };
}
export function validateProjectJson(json) {
    const data = JSON.parse(json);
    const root = requireObject(data, '/');
    const manifest = parseManifest(root.manifest);
    const tileLayers = parseTileLayers(root.tileLayers);
    const entities = parseEntities(root.entities);
    const story = parseStory(root.story);
    const diagnostics = [];
    const behaviors = sanitizeBehaviors(root.behaviors, diagnostics);
    const effectState = parseEffectState(root.effectState);
    const clips = Array.isArray(root.clips) ? root.clips : undefined;
    const sprites = parseSpriteAssets(root.sprites, diagnostics);
    const parsed = {
        manifest,
        tileLayers,
        entities,
        story,
        behaviors,
        effectState,
        clips,
        sprites,
    };
    const questGraph = parsed.story?.questGraph;
    if (questGraph) {
        const semantic = validateQuestGraphSemantics(questGraph);
        diagnostics.push(...semantic.diagnostics);
        if (!semantic.ok) {
            const details = semantic.diagnostics
                .filter((d) => d.severity === 'error')
                .map((d) => `${d.code} ${d.path} ${d.message}`)
                .join('; ');
            throw new Error(`Invalid project JSON (semantic): ${details}`);
        }
    }
    return { project: parsed, diagnostics };
}
export function parseAndValidateProjectJson(json) {
    return validateProjectJson(json).project;
}
//# sourceMappingURL=project-validation.js.map