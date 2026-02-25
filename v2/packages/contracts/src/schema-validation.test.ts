import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

type JsonObject = Record<string, unknown>;

function readJson(path: string): JsonObject {
  return JSON.parse(readFileSync(path, 'utf8')) as JsonObject;
}

describe('contracts schemas', () => {
  function buildAjv() {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const schemaDir = resolve(process.cwd(), 'schema');

    const common = readJson(resolve(schemaDir, 'common.v2.json'));
    const assetManifest = readJson(resolve(schemaDir, 'asset.manifest.v2.json'));
    const storyConditions = readJson(resolve(schemaDir, 'story.conditions.v2.json'));
    const storyEffects = readJson(resolve(schemaDir, 'story.effects.v2.json'));
    const questGraph = readJson(resolve(schemaDir, 'story.questGraph.v2.json'));
    const dialogue = readJson(resolve(schemaDir, 'story.dialogueTruth.v2.json'));
    const materialRef = readJson(resolve(schemaDir, 'render.materialRef.v2.json'));
    const entitySprite = readJson(resolve(schemaDir, 'entity.component.spriteRenderer.v2.json'));
    const entityAnimator = readJson(resolve(schemaDir, 'entity.component.animator.v2.json'));
    const entityCollider = readJson(resolve(schemaDir, 'entity.component.collider2d.v2.json'));
    const entityComponent = readJson(resolve(schemaDir, 'entity.component.v2.json'));
    const entityPrefab = readJson(resolve(schemaDir, 'entity.prefabOrInstance.v2.json'));
    const animationClip = readJson(resolve(schemaDir, 'animation.clip.v2.json'));
    const project = readJson(resolve(schemaDir, 'project.v2.json'));
    const map = readJson(resolve(schemaDir, 'map.v2.json'));

    [
      common,
      assetManifest,
      storyConditions,
      storyEffects,
      questGraph,
      dialogue,
      materialRef,
      entitySprite,
      entityAnimator,
      entityCollider,
      entityComponent,
      entityPrefab,
      animationClip,
      project,
      map,
    ].forEach((schema) => {
      ajv.addSchema(schema);
    });

    return ajv;
  }

  it('validates minimal project fixture', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'project_min.v2.json'));
    const validate = ajv.getSchema('https://gcs.dev/schema/project.v2.json');
    assert.ok(validate, 'project schema should be registered');
    assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
  });

  it('validates minimal map fixture', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'map_min.v2.json'));
    const validate = ajv.getSchema('https://gcs.dev/schema/map.v2.json');
    assert.ok(validate, 'map schema should be registered');
    assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
  });

  it('rejects project fixture missing required schemaVersion', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'project_min.v2.json'));
    delete fixture.schemaVersion;

    const validate = ajv.getSchema('https://gcs.dev/schema/project.v2.json');
    assert.ok(validate, 'project schema should be registered');
    assert.equal(validate(fixture), false);
  });

  it('validates animation clip fixture', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'animation_clip_walk.v2.json'));
    const validate = ajv.getSchema('https://gcs.dev/schema/animation.clip.v2.json');
    assert.ok(validate, 'animation clip schema should be registered');
    assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
  });

  it('validates story quest fixture with conditions/effects', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'story_quest_branch.v2.json'));
    const validate = ajv.getSchema('https://gcs.dev/schema/story.questGraph.v2.json');
    assert.ok(validate, 'story quest graph schema should be registered');
    assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
  });

  it('validates entity fixture with components', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'entity_min.v2.json'));
    const validate = ajv.getSchema('https://gcs.dev/schema/entity.prefabOrInstance.v2.json');
    assert.ok(validate, 'entity schema should be registered');
    assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
  });

  it('rejects entity fixture with unknown component type', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'entity_min.v2.json'));
    const components = fixture.components as Array<Record<string, unknown>>;
    components[0].type = 'UnknownComponent';

    const validate = ajv.getSchema('https://gcs.dev/schema/entity.prefabOrInstance.v2.json');
    assert.ok(validate, 'entity schema should be registered');
    assert.equal(validate(fixture), false);
  });

  it('rejects story quest fixture with invalid condition op', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'story_quest_branch.v2.json'));
    const nodes = fixture.nodes as Array<Record<string, unknown>>;
    const branchNode = nodes[1];
    const conditions = branchNode.conditions as Array<Record<string, unknown>>;
    conditions[0].op = 'invalidOp';

    const validate = ajv.getSchema('https://gcs.dev/schema/story.questGraph.v2.json');
    assert.ok(validate, 'story quest graph schema should be registered');
    assert.equal(validate(fixture), false);
  });

  it('validates entity fixture with slots (ANIM-ANCHOR-002)', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'entity_with_slots.v2.json'));
    const validate = ajv.getSchema('https://gcs.dev/schema/entity.prefabOrInstance.v2.json');
    assert.ok(validate, 'entity schema should be registered');
    assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
  });

  it('rejects entity slot with invalid occlusionHint value (ANIM-ANCHOR-002)', () => {
    const ajv = buildAjv();
    const fixture = readJson(resolve(process.cwd(), 'fixtures', 'entity_with_slots.v2.json'));
    const slots = fixture.slots as Array<Record<string, unknown>>;
    slots[0].occlusionHint = 'sideways';

    const validate = ajv.getSchema('https://gcs.dev/schema/entity.prefabOrInstance.v2.json');
    assert.ok(validate, 'entity schema should be registered');
    assert.equal(validate(fixture), false);
  });
});
