"use client";

import { ROUTES, type EntryFavoritesResponse } from "@kloqra/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import {
  emptyEntryFavorites,
  fromApiFavoritesResponse,
  hasMigratedEntryFavorites,
  markEntryFavoritesMigrated,
  readEntryFavorites,
  toImportFavoritesPayload,
  toggleFavoriteProject,
  toggleFavoriteTask,
  writeEntryFavorites,
  type EntryFavorites,
  type FavoriteTaskItem
} from "./entry-favorites";

function applyServerResponse(
  userId: string | undefined,
  data: EntryFavoritesResponse
): EntryFavorites {
  const next = fromApiFavoritesResponse(data);
  if (userId) writeEntryFavorites(userId, next);
  return next;
}

export function useEntryFavorites(userId: string | undefined, workspaceId: string | undefined) {
  const [favorites, setFavorites] = useState<EntryFavorites>(emptyEntryFavorites);
  const [loading, setLoading] = useState(false);
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  useEffect(() => {
    if (!userId || !workspaceId) {
      setFavorites(emptyEntryFavorites());
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      // Paint from local cache while the server round-trip completes.
      setFavorites(readEntryFavorites(userId!));

      try {
        if (!hasMigratedEntryFavorites(userId!, workspaceId!)) {
          const local = readEntryFavorites(userId!);
          const payload = toImportFavoritesPayload(local);
          if (payload.projects.length > 0 || payload.tasks.length > 0) {
            const imported = await api<EntryFavoritesResponse>(ROUTES.FAVORITES.IMPORT, {
              method: "POST",
              body: JSON.stringify(payload),
              workspaceId
            });
            markEntryFavoritesMigrated(userId!, workspaceId!);
            if (!cancelled) setFavorites(applyServerResponse(userId, imported));
            return;
          }
          markEntryFavoritesMigrated(userId!, workspaceId!);
        }

        const data = await api<EntryFavoritesResponse>(ROUTES.FAVORITES.LIST, {
          workspaceId
        });
        if (!cancelled) setFavorites(applyServerResponse(userId, data));
      } catch {
        // Keep local cache on network/API failure.
        if (!cancelled) setFavorites(readEntryFavorites(userId!));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, workspaceId]);

  const toggleProject = useCallback(
    async (projectId: string) => {
      if (!userId || !workspaceId) return;
      const previous = favoritesRef.current;
      const optimistic = toggleFavoriteProject(previous, projectId);
      setFavorites(optimistic);
      writeEntryFavorites(userId, optimistic);

      const removing = previous.projects.includes(projectId);
      try {
        const data = await api<EntryFavoritesResponse>(ROUTES.FAVORITES.PROJECT(projectId), {
          method: removing ? "DELETE" : "PUT",
          workspaceId
        });
        setFavorites(applyServerResponse(userId, data));
      } catch {
        setFavorites(previous);
        writeEntryFavorites(userId, previous);
      }
    },
    [userId, workspaceId]
  );

  const toggleTask = useCallback(
    async (item: FavoriteTaskItem) => {
      if (!userId || !workspaceId) return;
      const previous = favoritesRef.current;
      const optimistic = toggleFavoriteTask(previous, item);
      setFavorites(optimistic);
      writeEntryFavorites(userId, optimistic);

      const removing = previous.tasks.some((t) => t.taskId === item.taskId);
      try {
        const data = await api<EntryFavoritesResponse>(ROUTES.FAVORITES.TASK(item.taskId), {
          method: removing ? "DELETE" : "PUT",
          workspaceId
        });
        setFavorites(applyServerResponse(userId, data));
      } catch {
        setFavorites(previous);
        writeEntryFavorites(userId, previous);
      }
    },
    [userId, workspaceId]
  );

  const favoriteProjectIds = favorites.projects;
  const favoriteTaskIds = useMemo(() => favorites.tasks.map((t) => t.taskId), [favorites.tasks]);

  return {
    favorites,
    favoriteProjectIds,
    favoriteTaskIds,
    toggleProject,
    toggleTask,
    loading
  };
}
