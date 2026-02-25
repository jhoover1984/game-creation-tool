import type { EntityDef } from './entity.js';
export interface UiWidgetHint {
    widget: 'number' | 'toggle' | 'text' | 'assetRef';
    step?: number;
    placeholder?: string;
}
export interface InspectorFieldSchema {
    path: string;
    label: string;
    type: 'number' | 'boolean' | 'string';
    readOnly?: boolean;
    min?: number;
    max?: number;
    xUi?: UiWidgetHint;
}
export interface InspectorObjectSchema {
    schemaId: string;
    title: string;
    fields: InspectorFieldSchema[];
}
/**
 * First schema-driven inspector slice used by UI editor.
 * This mirrors editable fields for EntityDef in the current runtime model.
 */
export declare const ENTITY_DEF_INSPECTOR_SCHEMA: InspectorObjectSchema;
export type EntityInspectorTarget = Pick<EntityDef, 'id' | 'name' | 'position' | 'solid' | 'spriteId' | 'animationClipId'>;
//# sourceMappingURL=inspector-schema.d.ts.map