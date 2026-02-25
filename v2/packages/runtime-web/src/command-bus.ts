import type { AnyCommand, GameEvent } from '@gcs/contracts';

type EventHandler = (event: GameEvent) => void;

/**
 * Command bus: accepts commands, dispatches to handlers, emits events.
 * All state mutations flow through here.
 */
export class CommandBus {
  private handlers = new Map<string, (cmd: AnyCommand) => GameEvent | null>();
  private listeners: EventHandler[] = [];

  /** Register a command handler. */
  on<T extends AnyCommand['type']>(
    type: T,
    handler: (cmd: Extract<AnyCommand, { type: T }>) => GameEvent | null,
  ): void {
    this.handlers.set(type, handler as (cmd: AnyCommand) => GameEvent | null);
  }

  /** Subscribe to all emitted events. */
  subscribe(listener: EventHandler): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Dispatch a command. Returns the resulting event, if any. */
  dispatch(command: AnyCommand): GameEvent | null {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      console.warn(`No handler for command: ${command.type}`);
      return null;
    }

    const event = handler(command);
    if (event) {
      for (const listener of this.listeners) {
        listener(event);
      }
    }
    return event;
  }
}
