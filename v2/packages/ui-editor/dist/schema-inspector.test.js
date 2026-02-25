import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITY_DEF_INSPECTOR_SCHEMA } from '@gcs/contracts';
import { renderEntityInspector } from './schema-inspector.js';
const TARGET = {
    id: 'ent_1',
    name: 'Hero',
    position: { x: 12, y: 34 },
    solid: false,
};
describe('renderEntityInspector -- field rendering', () => {
    test('renders schema title', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        assert.match(html, /Entity/);
    });
    test('renders position fields with data-path and step attributes', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        assert.match(html, /data-path="position\.x"/);
        assert.match(html, /data-path="position\.y"/);
        assert.match(html, /step="1"/);
    });
    test('renders id field as readonly', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        assert.match(html, /data-path="id"/);
        assert.match(html, /data-path="id"[^>]*readonly/, 'id field must have readonly attribute');
    });
    test('escapes string values', () => {
        const html = renderEntityInspector({
            id: 'ent_2',
            name: '<script>alert(1)<\/script>',
            position: { x: 1, y: 2 },
            solid: false,
        }, ENTITY_DEF_INSPECTOR_SCHEMA);
        assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
        assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    });
    test('renders apply button', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        assert.match(html, /data-action="apply-entity-inspector"/);
    });
});
describe('renderEntityInspector -- section foldouts', () => {
    test('renders Transform section as open <details>', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        assert.match(html, /<details class="inspector-section" open>/);
        assert.match(html, /Transform/);
    });
    test('renders Visual section as open <details>', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        assert.match(html, /Visual/);
    });
    test('renders Metadata section without open attribute (collapsed by default)', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        assert.match(html, /Metadata/);
        // Metadata section must not have the open attribute
        assert.doesNotMatch(html, /<details class="inspector-section" open>[^<]*<summary[^>]*>Metadata/, 'Metadata section must not be open by default');
    });
    test('position.x is inside Transform section', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        const transformIdx = html.indexOf('Transform');
        const posXIdx = html.indexOf('data-path="position.x"');
        assert.ok(transformIdx !== -1 && posXIdx !== -1);
        assert.ok(transformIdx < posXIdx, 'position.x field must appear after Transform section header');
    });
    test('id field is inside Metadata section', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        const metadataIdx = html.indexOf('Metadata');
        const idIdx = html.indexOf('data-path="id"');
        assert.ok(metadataIdx !== -1 && idIdx !== -1);
        assert.ok(metadataIdx < idIdx, 'id field must appear after Metadata section header');
    });
    test('Transform section appears before Visual section', () => {
        const html = renderEntityInspector(TARGET, ENTITY_DEF_INSPECTOR_SCHEMA);
        const transformIdx = html.indexOf('Transform');
        const visualIdx = html.indexOf('Visual');
        assert.ok(transformIdx !== -1 && visualIdx !== -1);
        assert.ok(transformIdx < visualIdx, 'Transform must appear before Visual');
    });
});
//# sourceMappingURL=schema-inspector.test.js.map