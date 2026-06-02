import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDatetimeSchema = z.string().datetime({ offset: true });
export const emailSchema = z.string().email();
export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const workspaceRoleSchema = z.enum(["ADMIN", "MEMBER"]);
export const timelogSourceSchema = z.enum(["manual", "timer"]);

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type TimelogSource = z.infer<typeof timelogSourceSchema>;
