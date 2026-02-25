import { isPlaytestMovementKey } from './playtest-input-map.js';
import { type PlaytestFrameInput, PlaytestInputState } from './playtest-input-state.js';

export interface PlaytestInputTarget {
  addEventListener(type: string, fn: (e: Event) => void): void;
  removeEventListener(type: string, fn: (e: Event) => void): void;
}

export interface PlaytestInputControllerOptions {
  target: PlaytestInputTarget | null | undefined;
  isRunning: () => boolean;
  onChange?: (input: PlaytestFrameInput) => void;
}

export class PlaytestInputController {
  private readonly state = new PlaytestInputState();
  private readonly target: PlaytestInputTarget | null;
  private readonly isRunning: () => boolean;
  private readonly onChange?: (input: PlaytestFrameInput) => void;
  private readonly keydownHandler: (e: Event) => void;
  private readonly keyupHandler: (e: Event) => void;

  constructor(options: PlaytestInputControllerOptions) {
    this.target = options.target ?? null;
    this.isRunning = options.isRunning;
    this.onChange = options.onChange;

    this.keydownHandler = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (!this.isRunning()) return;
      if (!isPlaytestMovementKey(ke.key)) return;
      this.state.keyDown(ke.key);
      ke.preventDefault();
      this.emitChange();
    };

    this.keyupHandler = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (!isPlaytestMovementKey(ke.key)) return;
      this.state.keyUp(ke.key);
      if (this.isRunning()) ke.preventDefault();
      this.emitChange();
    };

    this.target?.addEventListener('keydown', this.keydownHandler);
    this.target?.addEventListener('keyup', this.keyupHandler);
    this.emitChange();
  }

  getInput(): PlaytestFrameInput {
    return this.state.toFrameInput();
  }

  reset(): void {
    this.state.reset();
    this.emitChange();
  }

  dispose(): void {
    this.target?.removeEventListener('keydown', this.keydownHandler);
    this.target?.removeEventListener('keyup', this.keyupHandler);
  }

  private emitChange(): void {
    this.onChange?.(this.state.toFrameInput());
  }
}
