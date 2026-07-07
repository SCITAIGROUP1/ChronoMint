const inflightGetRequests = new Map<string, Promise<unknown>>();

export function getInflightGetRequests(): Map<string, Promise<unknown>> {
  return inflightGetRequests;
}

export function clearInflightGetRequests(): void {
  inflightGetRequests.clear();
}
