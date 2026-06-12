import { z } from "zod";

export const userProjectColorHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #236bfe");

export const setUserProjectColorSchema = z.object({
  color: userProjectColorHexSchema
});

export type SetUserProjectColorDto = z.infer<typeof setUserProjectColorSchema>;

export type UserProjectColorParams = {
  projectId: string;
};
