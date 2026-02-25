/**
 * Command bus: accepts commands, dispatches to handlers, emits events.
 * All state mutations flow through here.
 */
export class CommandBus {
    handlers = new Map();
    listeners = [];
    /** Register a command handler. */
    on(type, handler) {
        this.handlers.set(type, handler);
    }
    /** Subscribe to all emitted events. */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    /** Dispatch a command. Returns the resulting event, if any. */
    dispatch(command) {
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
//# sourceMappingURL=command-bus.js.map