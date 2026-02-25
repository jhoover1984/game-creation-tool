/**
 * First schema-driven inspector slice used by UI editor.
 * This mirrors editable fields for EntityDef in the current runtime model.
 */
export const ENTITY_DEF_INSPECTOR_SCHEMA = {
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
//# sourceMappingURL=inspector-schema.js.map