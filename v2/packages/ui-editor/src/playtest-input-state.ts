import { mapPlaytestMovementVector } from './playtest-input-map.js';

export interface PlaytestFrameInput {
  moveX: number;
  moveY: number;
}

export class PlaytestInputState {
  private readonly heldKeys = new Set<string>();

  keyDown(key: string): void {
    this.heldKeys.add(key);
  }

  keyUp(key: string): void {
    this.heldKeys.delete(key);
  }

  reset(): void {
    this.heldKeys.clear();
  }

  toFrameInput(): PlaytestFrameInput {
    return mapPlaytestMovementVector(this.heldKeys);
  }
}
