const handlers = new Set<() => void>();

export function registerTimelogRefreshHandler(handler: () => void): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function triggerTimelogRefresh(): void {
  for (const handler of handlers) {
    handler();
  }
}
