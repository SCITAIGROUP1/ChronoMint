import { describe, expect, it } from "vitest";
import {
  applyTenantHolidayResponseSchema,
  createTenantActivityTypeSchema,
  createTenantHolidaySchema,
  createTimeLogSchema,
  updateTimeLogSchema,
  listTenantHolidaysResponseSchema,
  nonProjectDurationSec,
  SYSTEM_TENANT_ACTIVITY_TYPES,
  LEAVE_ENTRY_TYPE_OPTIONS,
  tenantActivityTypeSchema,
  tenantHolidaySchema,
  TIME_LOG_CLASSIFICATION_LABELS
} from "./index";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("non-project time contracts", () => {
  it("computes full and half duration from daily hours", () => {
    expect(nonProjectDurationSec("PUBLIC_HOLIDAY", 8)).toBe(8 * 3600);
    expect(nonProjectDurationSec("LEAVE_FULL", 7.5)).toBe(Math.round(7.5 * 3600));
    expect(nonProjectDurationSec("LEAVE_HALF", 8)).toBe(4 * 3600);
  });

  it("seeds organizational and recreational system types plus office defaults", () => {
    expect(SYSTEM_TENANT_ACTIVITY_TYPES.map((t) => t.slug)).toEqual([
      "organizational",
      "recreational",
      "office_event",
      "office_meeting"
    ]);
  });

  it("labels leave choices as public, full, and half", () => {
    expect(LEAVE_ENTRY_TYPE_OPTIONS.map((option) => option.hint)).toEqual([
      "Public holiday",
      "Full day off",
      "Half day off"
    ]);
  });

  it("labels classifications for export and UI", () => {
    expect(TIME_LOG_CLASSIFICATION_LABELS.PUBLIC_HOLIDAY).toBe("Public holiday");
    expect(TIME_LOG_CLASSIFICATION_LABELS.TENANT_ACTIVITY).toBe("Organization activity");
  });

  it("accepts legacy project create without classification", () => {
    const r = createTimeLogSchema.safeParse({
      taskId: UUID,
      startTime: "2026-08-31T09:00:00.000Z",
      endTime: "2026-08-31T17:00:00.000Z"
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.classification).toBe("PROJECT");
  });

  it("requires taskId for project time and activityTypeId for activities", () => {
    expect(
      createTimeLogSchema.safeParse({
        classification: "PROJECT",
        startTime: "2026-08-31T09:00:00.000Z",
        endTime: "2026-08-31T17:00:00.000Z"
      }).success
    ).toBe(false);

    expect(
      createTimeLogSchema.safeParse({
        classification: "TENANT_ACTIVITY",
        startTime: "2026-08-31T09:00:00.000Z",
        endTime: "2026-08-31T10:00:00.000Z"
      }).success
    ).toBe(false);

    expect(
      createTimeLogSchema.safeParse({
        classification: "LEAVE_FULL",
        startTime: "2026-08-31T09:00:00.000Z"
      }).success
    ).toBe(true);

    expect(
      createTimeLogSchema.safeParse({
        classification: "LEAVE_FULL",
        taskId: null,
        startTime: "2026-08-31T09:00:00.000Z",
        endTime: "2026-08-31T17:00:00.000Z"
      }).success
    ).toBe(true);
  });

  it("accepts classification changes on update including clearing taskId", () => {
    expect(
      updateTimeLogSchema.safeParse({
        classification: "LEAVE_FULL",
        taskId: null,
        activityTypeId: null,
        holidayId: null,
        startTime: "2026-08-25T13:00:00.000Z",
        endTime: "2026-08-25T21:00:00.000Z"
      }).success
    ).toBe(true);

    expect(
      updateTimeLogSchema.safeParse({
        classification: "PROJECT",
        taskId: UUID,
        activityTypeId: null,
        holidayId: null
      }).success
    ).toBe(true);
  });

  it("validates holiday and activity-type DTOs", () => {
    expect(
      tenantHolidaySchema.safeParse({
        id: UUID,
        tenantId: UUID,
        date: "2026-12-25",
        name: "Christmas",
        isActive: true
      }).success
    ).toBe(true);

    expect(createTenantHolidaySchema.safeParse({ date: "12/25/2026", name: "Xmas" }).success).toBe(
      false
    );

    expect(
      tenantActivityTypeSchema.safeParse({
        id: UUID,
        tenantId: UUID,
        name: "Office Event",
        slug: "office_event",
        color: "#0d9488",
        isSystem: true,
        isActive: true
      }).success
    ).toBe(true);

    expect(createTenantActivityTypeSchema.safeParse({ name: "Town hall" }).success).toBe(true);

    expect(listTenantHolidaysResponseSchema.safeParse({ items: [] }).success).toBe(true);
    expect(
      applyTenantHolidayResponseSchema.safeParse({
        createdCount: 3,
        skippedCount: 1,
        skipped: [{ userId: UUID, reason: "overlap" }]
      }).success
    ).toBe(true);
  });
});
