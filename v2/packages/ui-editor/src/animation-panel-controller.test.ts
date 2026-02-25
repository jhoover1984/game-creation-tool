import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AnimationClipDef, EntityDef, GameEvent } from '@gcs/contracts';
import { renderAnimationPanel } from './animation-panel.js';
import { AnimationPanelController } from './animation-panel-controller.js';

type Field = { value?: string; checked?: boolean };

function makeContainer(fields: Record<string, Field>) {
  let clickListener: ((event: Event) => void) | null = null;
  const container = {
    innerHTML: '',
    addEventListener(type: string, fn: (event: Event) => void) {
      if (type === 'click') clickListener = fn;
    },
    removeEventListener(type: string, _fn: (event: Event) => void) {
      if (type === 'click') clickListener = null;
    },
    querySelector(selector: string) {
      const match = selector.match(/data-path="([^"]+)"/);
      if (!match) return null;
      const path = match[1];
      const field = fields[path];
      if (!field) return null;
      const isSelect = selector.startsWith('select');
      if (isSelect) {
        return { value: field.value ?? '' };
      }
      return { value: field.value ?? '', checked: field.checked ?? false };
    },
    fireAction(action: string, dataset: Record<string, string> = {}) {
      if (!clickListener) return;
      clickListener({
        target: {
          closest(attr: string) {
            if (attr !== '[data-action]') return null;
            return { dataset: { action, ...dataset } };
          },
        },
      } as unknown as Event);
    },
  };
  return container as unknown as HTMLElement & {
    fireAction(action: string, dataset?: Record<string, string>): void;
  };
}

function makeEntity(): EntityDef {
  return {
    id: 'ent-1',
    name: 'Hero',
    position: { x: 0, y: 0 },
    size: { w: 16, h: 16 },
    solid: false,
    tags: [],
    animationClipId: 'clip-1',
    slots: [],
  };
}

function makeClip(withFrame0 = false): AnimationClipDef {
  return {
    id: 'clip-1',
    name: 'Walk',
    frameCount: 4,
    fps: 12,
    loopMode: 'loop',
    anchors: withFrame0 ? { hand_r: [{ frame: 0, pos: { x: 2, y: 3 } }] } : {},
  };
}

function makeApp(withFrame0 = false) {
  const dispatches: unknown[] = [];
  const listeners: Array<(event: GameEvent) => void> = [];
  const entity = makeEntity();
  return {
    dispatches,
    store: {
      entities: [entity, {
        id: 'ent-2',
        name: 'Sword',
        position: { x: 0, y: 0 },
        size: { w: 16, h: 16 },
        solid: false,
        tags: [],
      }],
      clips: [makeClip(withFrame0)],
      selectedEntityId: entity.id,
    },
    dispatch(cmd: unknown) {
      dispatches.push(cmd);
    },
    subscribe(fn: (event: GameEvent) => void) {
      listeners.push(fn);
      return () => {
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
    emit(type = 'x') {
      for (const fn of listeners) {
        fn({ type, payload: {}, timestamp: Date.now() });
      }
    },
  };
}

test('renderAnimationPanel: shows empty state when no entity selected', () => {
  const html = renderAnimationPanel(null, null, []);
  assert.ok(html.includes('No entity selected'));
});

test('renderAnimationPanel: shows missing clip message when entity clip not found', () => {
  const entity = makeEntity();
  const html = renderAnimationPanel(entity, null, [entity]);
  assert.ok(html.includes('was not found'));
});

test('AnimationPanelController: upsert dispatches animation:anchor:add when frame missing', () => {
  const app = makeApp(false);
  const container = makeContainer({
    anchorName: { value: 'hand_r' },
    anchorFrame: { value: '0' },
    anchorX: { value: '7' },
    anchorY: { value: '9' },
    anchorFlip: { checked: true },
  });
  const ctrl = new AnimationPanelController(app as never, container);
  ctrl.notifyEntitySelected('ent-1');
  container.fireAction('anim:anchor:upsert');
  assert.equal(app.dispatches.length, 1);
  assert.equal((app.dispatches[0] as { type: string }).type, 'animation:anchor:add');
});

test('AnimationPanelController: upsert dispatches animation:anchor:move when frame exists', () => {
  const app = makeApp(true);
  const container = makeContainer({
    anchorName: { value: 'hand_r' },
    anchorFrame: { value: '0' },
    anchorX: { value: '12' },
    anchorY: { value: '13' },
    anchorFlip: { checked: false },
  });
  const ctrl = new AnimationPanelController(app as never, container);
  ctrl.notifyEntitySelected('ent-1');
  container.fireAction('anim:anchor:upsert');
  assert.equal(app.dispatches.length, 1);
  assert.equal((app.dispatches[0] as { type: string }).type, 'animation:anchor:move');
});

test('AnimationPanelController: slot attach dispatches entity:slot:attach', () => {
  const app = makeApp(false);
  const container = makeContainer({
    slotName: { value: 'weapon_main' },
    slotType: { value: 'prop' },
    slotParentId: { value: 'ent-2' },
    slotAnchorName: { value: 'hand_r' },
    slotOcclusionHint: { value: 'auto' },
  });
  const ctrl = new AnimationPanelController(app as never, container);
  ctrl.notifyEntitySelected('ent-1');
  container.fireAction('anim:slot:attach');
  assert.equal(app.dispatches.length, 1);
  assert.equal((app.dispatches[0] as { type: string }).type, 'entity:slot:attach');
});

test('AnimationPanelController: slot occlusion dispatches entity:slot:setOcclusion', () => {
  const app = makeApp(false);
  app.store.entities[0].slots = [{
    slotName: 'weapon_main',
    slotType: 'prop',
    parentEntityId: 'ent-2',
    anchorName: 'hand_r',
    occlusionHint: 'auto',
  }];
  const container = makeContainer({
    'slot-occlusion:weapon_main': { value: 'behind' },
  });
  const ctrl = new AnimationPanelController(app as never, container);
  ctrl.notifyEntitySelected('ent-1');
  container.fireAction('anim:slot:setOcclusion', { slotName: 'weapon_main' });
  assert.equal(app.dispatches.length, 1);
  assert.equal((app.dispatches[0] as { type: string }).type, 'entity:slot:setOcclusion');
});

test('AnimationPanelController: dispose removes click handling', () => {
  const app = makeApp(false);
  const container = makeContainer({
    anchorName: { value: 'hand_r' },
    anchorFrame: { value: '0' },
    anchorX: { value: '1' },
    anchorY: { value: '1' },
  });
  const ctrl = new AnimationPanelController(app as never, container);
  ctrl.notifyEntitySelected('ent-1');
  ctrl.dispose();
  container.fireAction('anim:anchor:upsert');
  assert.equal(app.dispatches.length, 0);
});
