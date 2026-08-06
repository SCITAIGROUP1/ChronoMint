import { z } from "zod";
import { uuidSchema } from "./common.dto";

export const MAX_FAVORITE_PROJECTS = 5;
export const MAX_FAVORITE_TASKS = 10;

export const favoriteTaskItemSchema = z.object({
  projectId: uuidSchema,
  taskId: uuidSchema,
  projectName: z.string().min(1).max(200).optional(),
  taskName: z.string().min(1).max(200).optional(),
  projectColor: z.string().optional()
});

export const entryFavoritesResponseSchema = z.object({
  projects: z.array(uuidSchema),
  tasks: z.array(favoriteTaskItemSchema)
});

export const importEntryFavoritesSchema = z.object({
  projects: z.array(uuidSchema).max(MAX_FAVORITE_PROJECTS).default([]),
  tasks: z
    .array(
      z.object({
        projectId: uuidSchema,
        taskId: uuidSchema
      })
    )
    .max(MAX_FAVORITE_TASKS)
    .default([])
});

export type FavoriteTaskItemDto = z.infer<typeof favoriteTaskItemSchema>;
export type EntryFavoritesResponse = z.infer<typeof entryFavoritesResponseSchema>;
export type ImportEntryFavoritesDto = z.infer<typeof importEntryFavoritesSchema>;
