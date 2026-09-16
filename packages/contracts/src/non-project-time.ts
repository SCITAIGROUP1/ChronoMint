import { z } from "zod";

export const TIME_LOG_CLASSIFICATIONS = [
  "PROJECT",
  "PUBLIC_HOLIDAY",
  "LEAVE_FULL",
  "LEAVE_HALF",
  "TENANT_ACTIVITY"
] as const;

export const timeLogClassificationSchema = z.enum(TIME_LOG_CLASSIFICATIONS);

export type TimeLogClassification = z.infer<typeof timeLogClassificationSchema>;

export const NON_PROJECT_CLASSIFICATIONS = [
  "PUBLIC_HOLIDAY",
  "LEAVE_FULL",
  "LEAVE_HALF",
  "TENANT_ACTIVITY"
] as const;

export type NonProjectClassification = (typeof NON_PROJECT_CLASSIFICATIONS)[number];

export const DAY_BLOCK_CLASSIFICATIONS = ["PUBLIC_HOLIDAY", "LEAVE_FULL", "LEAVE_HALF"] as const;

export type DayBlockClassification = (typeof DAY_BLOCK_CLASSIFICATIONS)[number];

export const TIME_LOG_CLASSIFICATION_LABELS: Record<TimeLogClassification, string> = {
  PROJECT: "Project work",
  PUBLIC_HOLIDAY: "Public holiday",
  LEAVE_FULL: "Full-day leave",
  LEAVE_HALF: "Half-day leave",
  TENANT_ACTIVITY: "Organization activity"
};

export const LEAVE_ENTRY_TYPE_OPTIONS = [
  { value: "PUBLIC_HOLIDAY" as const, label: "Public", hint: "Public holiday" },
  { value: "LEAVE_FULL" as const, label: "Full", hint: "Full day off" },
  { value: "LEAVE_HALF" as const, label: "Half", hint: "Half day off" }
];

export const SYSTEM_TENANT_ACTIVITY_TYPES = [
  { slug: "organizational", name: "Organizational", color: "#0d9488" },
  { slug: "recreational", name: "Recreational", color: "#059669" },
  { slug: "office_event", name: "Office Event", color: "#0d9488" },
  { slug: "office_meeting", name: "Office Meeting", color: "#0891b2" }
] as const;

export const PRIMARY_OTHER_ACTIVITY_SLUGS = ["organizational", "recreational"] as const;

export function groupTenantActivityTypes<T extends { id: string; parentId?: string | null }>(
  types: T[]
): { roots: T[]; childrenByParentId: Map<string, T[]> } {
  const roots: T[] = [];
  const childrenByParentId = new Map<string, T[]>();
  for (const type of types) {
    if (!type.parentId) {
      roots.push(type);
      continue;
    }
    const siblings = childrenByParentId.get(type.parentId) ?? [];
    siblings.push(type);
    childrenByParentId.set(type.parentId, siblings);
  }
  return { roots, childrenByParentId };
}

export function formatNestedActivityName(name: string, parentName?: string | null) {
  return parentName ? `${parentName} : ${name}` : name;
}

export function loggableActivityTypes<T extends { id: string; parentId?: string | null }>(
  types: T[]
): T[] {
  const { childrenByParentId } = groupTenantActivityTypes(types);
  return types.filter((type) => !childrenByParentId.has(type.id));
}

export function activityTypeLabel<T extends { id: string; name: string; parentId?: string | null }>(
  types: T[],
  id: string | undefined
): string | undefined {
  const type = types.find((item) => item.id === id);
  if (!type) return undefined;
  if (!type.parentId) return type.name;
  const parent = types.find((item) => item.id === type.parentId);
  return formatNestedActivityName(type.name, parent?.name);
}

export const nonProjectTimeFilterSchema = z.enum(["include", "exclude", "only"]);

export type NonProjectTimeFilter = z.infer<typeof nonProjectTimeFilterSchema>;

export const halfDaySlotSchema = z.enum(["AM", "PM"]);

export type HalfDaySlot = z.infer<typeof halfDaySlotSchema>;

export function isNonProjectClassification(
  value: string | null | undefined
): value is NonProjectClassification {
  return (
    value === "PUBLIC_HOLIDAY" ||
    value === "LEAVE_FULL" ||
    value === "LEAVE_HALF" ||
    value === "TENANT_ACTIVITY"
  );
}

export function isDayBlockClassification(
  value: string | null | undefined
): value is DayBlockClassification {
  return value === "PUBLIC_HOLIDAY" || value === "LEAVE_FULL" || value === "LEAVE_HALF";
}

/** Duration in seconds from effective daily hours. */
export function nonProjectDurationSec(classification: DayBlockClassification, dayHours: number) {
  const full = Math.round(dayHours * 3600);
  if (classification === "LEAVE_HALF") return Math.round(full / 2);
  return full;
}
