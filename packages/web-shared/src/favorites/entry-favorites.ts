import { MAX_FAVORITE_PROJECTS, MAX_FAVORITE_TASKS } from "@kloqra/contracts";
import { readScopedJSON, scopedStorageKey, writeScopedJSON } from "../storage/scoped-storage";

export { MAX_FAVORITE_PROJECTS, MAX_FAVORITE_TASKS };

export const ENTRY_FAVORITES_VERSION = 2 as const;
export const LEGACY_FAVORITES_KEY = "kloqra_favorites";

export type FavoriteTaskItem = {
  projectId: string;
  taskId: string;
  projectName?: string;
  taskName?: string;
  projectColor?: string;
};

export type EntryFavorites = {
  version: typeof ENTRY_FAVORITES_VERSION;
  projects: string[];
  tasks: FavoriteTaskItem[];
};

export function emptyEntryFavorites(): EntryFavorites {
  return { version: ENTRY_FAVORITES_VERSION, projects: [], tasks: [] };
}

function isFavoriteTaskItem(value: unknown): value is FavoriteTaskItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.projectId === "string" && typeof item.taskId === "string";
}

/** Normalize v1 array or v2 object into EntryFavorites. Derives project ids from task pairs on v1. */
export function normalizeEntryFavorites(raw: unknown): EntryFavorites {
  if (Array.isArray(raw)) {
    const tasks = raw.filter(isFavoriteTaskItem).slice(-MAX_FAVORITE_TASKS);
    const projects = [...new Set(tasks.map((t) => t.projectId))].slice(-MAX_FAVORITE_PROJECTS);
    return { version: ENTRY_FAVORITES_VERSION, projects, tasks };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const projects = Array.isArray(obj.projects)
      ? obj.projects
          .filter((id): id is string => typeof id === "string")
          .slice(-MAX_FAVORITE_PROJECTS)
      : [];
    const tasks = Array.isArray(obj.tasks)
      ? obj.tasks.filter(isFavoriteTaskItem).slice(-MAX_FAVORITE_TASKS)
      : [];
    return { version: ENTRY_FAVORITES_VERSION, projects, tasks };
  }

  return emptyEntryFavorites();
}

export function entryFavoritesStorageKey(userId: string): string {
  return scopedStorageKey("favorites", { userId });
}

export function entryFavoritesMigratedKey(userId: string, workspaceId: string): string {
  return scopedStorageKey("favorites-migrated", { userId, workspaceId }, true);
}

export function readEntryFavorites(userId: string): EntryFavorites {
  if (typeof window === "undefined") return emptyEntryFavorites();
  try {
    const key = entryFavoritesStorageKey(userId);
    const legacy = localStorage.getItem(LEGACY_FAVORITES_KEY);
    if (legacy && !localStorage.getItem(key)) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(LEGACY_FAVORITES_KEY);
    }
    const stored = readScopedJSON<unknown>(key);
    if (stored == null) return emptyEntryFavorites();
    const normalized = normalizeEntryFavorites(stored);
    if (
      Array.isArray(stored) ||
      (stored as { version?: number }).version !== ENTRY_FAVORITES_VERSION
    ) {
      writeScopedJSON(key, normalized);
      localStorage.removeItem(LEGACY_FAVORITES_KEY);
    }
    return normalized;
  } catch {
    return emptyEntryFavorites();
  }
}

export function writeEntryFavorites(userId: string, favorites: EntryFavorites): void {
  if (typeof window === "undefined") return;
  try {
    writeScopedJSON(entryFavoritesStorageKey(userId), {
      version: ENTRY_FAVORITES_VERSION,
      projects: favorites.projects.slice(-MAX_FAVORITE_PROJECTS),
      tasks: favorites.tasks.slice(-MAX_FAVORITE_TASKS)
    });
    localStorage.removeItem(LEGACY_FAVORITES_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function markEntryFavoritesMigrated(userId: string, workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(entryFavoritesMigratedKey(userId, workspaceId), "1");
  } catch {
    // ignore
  }
}

export function hasMigratedEntryFavorites(userId: string, workspaceId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(entryFavoritesMigratedKey(userId, workspaceId)) === "1";
  } catch {
    return false;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFavoritesUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function toImportFavoritesPayload(favorites: EntryFavorites): {
  projects: string[];
  tasks: Array<{ projectId: string; taskId: string }>;
} {
  return {
    projects: favorites.projects.filter(isFavoritesUuid).slice(-MAX_FAVORITE_PROJECTS),
    tasks: favorites.tasks
      .filter((t) => isFavoritesUuid(t.projectId) && isFavoritesUuid(t.taskId))
      .slice(-MAX_FAVORITE_TASKS)
      .map((t) => ({ projectId: t.projectId, taskId: t.taskId }))
  };
}

export function fromApiFavoritesResponse(data: {
  projects: string[];
  tasks: FavoriteTaskItem[];
}): EntryFavorites {
  return {
    version: ENTRY_FAVORITES_VERSION,
    projects: data.projects,
    tasks: data.tasks
  };
}

export function toggleFavoriteProject(
  favorites: EntryFavorites,
  projectId: string
): EntryFavorites {
  const existingIndex = favorites.projects.indexOf(projectId);
  if (existingIndex > -1) {
    return {
      ...favorites,
      projects: favorites.projects.filter((_, i) => i !== existingIndex)
    };
  }
  const next = [...favorites.projects, projectId];
  return {
    ...favorites,
    projects: next.length > MAX_FAVORITE_PROJECTS ? next.slice(1) : next
  };
}

export function toggleFavoriteTask(
  favorites: EntryFavorites,
  item: FavoriteTaskItem
): EntryFavorites {
  const existingIndex = favorites.tasks.findIndex((t) => t.taskId === item.taskId);
  if (existingIndex > -1) {
    return {
      ...favorites,
      tasks: favorites.tasks.filter((_, i) => i !== existingIndex)
    };
  }
  const next = [...favorites.tasks, item];
  return {
    ...favorites,
    tasks: next.length > MAX_FAVORITE_TASKS ? next.slice(1) : next
  };
}

/** Stable favorite-first order: favorited ids keep favorite list order, then remaining items. */
export function prioritizeByFavoriteIds<T extends { id: string }>(
  items: T[],
  favoriteIds: readonly string[]
): T[] {
  if (favoriteIds.length === 0 || items.length === 0) return items;
  const order = new Map(favoriteIds.map((id, index) => [id, index]));
  const favorites: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (order.has(item.id)) favorites.push(item);
    else rest.push(item);
  }
  favorites.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return [...favorites, ...rest];
}

export type TaskSelectGroupOption = { value: string; label: string };

export type TaskSelectGroup = {
  label: string;
  options: TaskSelectGroupOption[];
};

type GroupableTask = {
  id: string;
  taskName: string;
  categoryName?: string | null;
};

/**
 * Leading "Favorites" group (when any), then category groups for non-favorites.
 * Within Favorites, order follows favoriteTaskIds.
 */
export function buildTaskSelectGroups(
  tasks: GroupableTask[],
  favoriteTaskIds: readonly string[]
): TaskSelectGroup[] {
  const favSet = new Set(favoriteTaskIds);
  const favorited = prioritizeByFavoriteIds(
    tasks.filter((t) => favSet.has(t.id)),
    favoriteTaskIds
  );
  const rest = tasks.filter((t) => !favSet.has(t.id));

  const groups: TaskSelectGroup[] = [];
  if (favorited.length > 0) {
    groups.push({
      label: "Favorites",
      options: favorited.map((t) => ({ value: t.id, label: t.taskName }))
    });
  }

  const byCategory = new Map<string, GroupableTask[]>();
  for (const task of rest) {
    const key = task.categoryName ?? "Other";
    const list = byCategory.get(key) ?? [];
    list.push(task);
    byCategory.set(key, list);
  }
  for (const [categoryName, list] of [...byCategory.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    groups.push({
      label: categoryName,
      options: list.map((t) => ({ value: t.id, label: t.taskName }))
    });
  }
  return groups;
}
