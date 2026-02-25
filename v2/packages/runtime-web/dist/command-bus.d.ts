import type { AnyCommand, GameEvent } from '@gcs/contracts';
type EventHandler = (event: GameEvent) => void;
/**
 * Command bus: accepts commands, dispatches to handlers, emits events.
 * All state mutations flow through here.
 */
export declare class CommandBus {
    private handlers;
    private listeners;
    /** Register a command handler. */
    on<T extends AnyCommand['type']>(type: T, handler: (cmd: Extract<AnyCommand, {
        type: T;
    }>) => GameEvent | null): void;
    /** Subscribe to all emitted events. */
    subscribe(listener: EventHandler): () => void;
    /** Dispatch a command. Returns the resulting event, if any. */
    dispatch(command: AnyCommand): GameEvent | null;
}
export {};
//# sourceMappingURL=command-bus.d.ts.map