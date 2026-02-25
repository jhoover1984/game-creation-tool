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
export const ENTITY_DEF_INSPECTOR_SCHEMA: InspectorObjectSchema = {
  schemaId: 'entity.def.v2.inspector',
  title: 'Entity',
  fields: [
    {
      path: 'id',
      label: 'ID',
      type: 'string',
      readOnly: true,
      xUi: { widget: 'text' },
    },
    {
      path: 'name',
      label: 'Name',
      type: 'string',
      xUi: { widget: 'text' },
    },
    {
      path: 'position.x',
      label: 'X',
      type: 'number',
      min: 0,
      xUi: { widget: 'number', step: 1 },
    },
    {
      path: 'position.y',
      label: 'Y',
      type: 'number',
      min: 0,
      xUi: { widget: 'number', step: 1 },
    },
    {
      path: 'solid',
      label: 'Solid',
      type: 'boolean',
      xUi: { widget: 'toggle' },
    },
    {
      path: 'spriteId',
      label: 'Sprite Asset',
      type: 'string',
      xUi: { widget: 'assetRef', placeholder: 'asset_...' },
    },
    {
      path: 'animationClipId',
      label: 'Animation Clip',
      type: 'string',
      xUi: { widget: 'assetRef', placeholder: 'asset_...' },
    },
  ],
};

export type EntityInspectorTarget = Pick<
  EntityDef,
  'id' | 'name' | 'position' | 'solid' | 'spriteId' | 'animationClipId'
>;
