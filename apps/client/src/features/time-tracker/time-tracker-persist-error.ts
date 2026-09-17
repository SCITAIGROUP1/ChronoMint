export type TimeTrackerPersistSurface = "dialog" | "quickadd";

/** Dialog creates (duplicate / log time) must not leak errors into the flush add bar. */
export function persistErrorSurface(
  surface: TimeTrackerPersistSurface
): "entryError" | "quickAddError" {
  return surface === "dialog" ? "entryError" : "quickAddError";
}

export function persistTaskDraftHint(surface: TimeTrackerPersistSurface): string {
  return persistErrorSurface(surface) === "quickAddError"
    ? "Select a project and a task."
    : "Select a project and a task, or an organization time type.";
}
