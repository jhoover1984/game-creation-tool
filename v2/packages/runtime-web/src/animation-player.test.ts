import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AnimationPlayer } from './animation-player.js';
import type { AnimationClipDef, AnimationTransitionDef } from '@gcs/contracts';

function idleClip(): AnimationClipDef {
  return { id: 'idle', name: 'idle', frameCount: 2, fps: 10, loopMode: 'loop' };
}

function walkClip(): AnimationClipDef {
  return { id: 'walk', name: 'walk', frameCount: 4, fps: 10, loopMode: 'loop' };
}

function attackClip(): AnimationClipDef {
  return { id: 'attack', name: 'attack', frameCount: 3, fps: 10, loopMode: 'once' };
}

function pingpongClip(): AnimationClipDef {
  return { id: 'pp', name: 'pingpong', frameCount: 4, fps: 10, loopMode: 'pingpong' };
}

describe('AnimationPlayer', () => {
  // --- Clip playback ---

  it('starts on first clip at frame 0', () => {
    const player = new AnimationPlayer([idleClip(), walkClip()], []);
    assert.equal(player.currentClip(), 'idle');
    assert.equal(player.currentFrame(), 0);
  });

  it('tick advances frames', () => {
    const player = new AnimationPlayer([idleClip()], []);
    player.tick(0.1); // 1 frame at 10fps
    assert.equal(player.currentFrame(), 1);
  });

  it('loop mode wraps around', () => {
    const player = new AnimationPlayer([idleClip()], []); // 2 frames
    for (let i = 0; i < 4; i++) player.tick(0.1);
    assert.ok(player.currentFrame() < 2);
    assert.equal(player.isFinished(), false);
  });

  it('once mode finishes at last frame', () => {
    const player = new AnimationPlayer([attackClip()], []); // 3 frames
    for (let i = 0; i < 10; i++) player.tick(0.1);
    assert.equal(player.isFinished(), true);
    assert.equal(player.currentFrame(), 2); // last frame
  });

  it('pingpong mode reverses direction', () => {
    const player = new AnimationPlayer([pingpongClip()], []); // 4 frames
    const frames: number[] = [player.currentFrame()];
    for (let i = 0; i < 8; i++) {
      player.tick(0.1);
      frames.push(player.currentFrame());
    }
    assert.equal(player.isFinished(), false);
    // Should reverse at some point
    const hasReverse = frames.some((f, i) => i > 0 && f < frames[i - 1]);
    assert.ok(hasReverse, `should reverse: ${frames}`);
  });

  // --- Transitions ---

  it('trigger transitions to new clip', () => {
    const player = new AnimationPlayer(
      [idleClip(), attackClip()],
      [{ fromClip: 'idle', toClip: 'attack', condition: { type: 'onTrigger', trigger: 'attack' } }],
    );
    assert.equal(player.currentClip(), 'idle');
    player.setTrigger('attack');
    player.tick(0.01);
    assert.equal(player.currentClip(), 'attack');
  });

  it('onComplete transitions when clip finishes', () => {
    const player = new AnimationPlayer(
      [attackClip(), idleClip()],
      [{ fromClip: 'attack', toClip: 'idle', condition: { type: 'onComplete' } }],
    );
    assert.equal(player.currentClip(), 'attack');
    for (let i = 0; i < 5; i++) player.tick(0.1);
    assert.equal(player.currentClip(), 'idle');
  });

  it('threshold transitions on param value', () => {
    const player = new AnimationPlayer(
      [idleClip(), walkClip()],
      [{
        fromClip: 'idle',
        toClip: 'walk',
        condition: { type: 'onThreshold', param: 'speed', above: 0.1 },
      }],
    );

    player.setParam('speed', 0.0);
    player.tick(0.01);
    assert.equal(player.currentClip(), 'idle');

    player.setParam('speed', 0.5);
    player.tick(0.01);
    assert.equal(player.currentClip(), 'walk');
  });

  it('triggers are consumed after one tick', () => {
    const player = new AnimationPlayer(
      [idleClip(), attackClip()],
      [{ fromClip: 'idle', toClip: 'attack', condition: { type: 'onTrigger', trigger: 'attack' } }],
    );

    player.setTrigger('attack');
    player.tick(0.01);
    assert.equal(player.currentClip(), 'attack');

    // Without new trigger, should stay on attack
    player.tick(0.01);
    assert.equal(player.currentClip(), 'attack');
  });

  it('setClip resets playback', () => {
    const player = new AnimationPlayer([idleClip(), walkClip()], []);
    player.tick(0.1);
    assert.equal(player.currentFrame(), 1);

    player.setClip('walk');
    assert.equal(player.currentClip(), 'walk');
    assert.equal(player.currentFrame(), 0);
  });
});
