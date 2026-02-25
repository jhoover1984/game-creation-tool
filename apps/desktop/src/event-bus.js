export function createEventBus() {
  const listeners = new Map();

  function on(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
  }

  function emit(event, payload) {
    const handlers = listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        if (typeof console !== "undefined" && typeof console.error === "function") {
          console.error(`[event-bus] handler failed for '${event}'`, error);
        }
      }
    });
  }

  return { on, emit };
}
