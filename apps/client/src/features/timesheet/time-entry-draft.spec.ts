import { describe, expect, it } from "vitest";
import {
  estimateRecurrenceCount,
  applyClassificationToDraft,
  canSaveTaskDraft,
  draftToTimelogBody,
  NON_PROJECT_ENTRY_TYPE_OPTIONS
} from "./time-entry-draft";
import type { TimeEntryDraft } from "./time-entry-draft";

describe("estimateRecurrenceCount", () => {
  it("counts daily entries inclusive", () => {
    expect(estimateRecurrenceCount("2026-06-09", "2026-06-11", "daily")).toBe(3);
  });

  it("skips weekends for weekdays recurrence", () => {
    // Mon Jun 8 through Sun Jun 14, 2026
    expect(estimateRecurrenceCount("2026-06-08", "2026-06-14", "weekdays")).toBe(5);
  });

  it("counts weekly entries on matching weekday only", () => {
    // Tue Jun 9 through Tue Jun 23
    expect(estimateRecurrenceCount("2026-06-09", "2026-06-23", "weekly")).toBe(3);
  });

  it("returns zero when end is before start", () => {
    expect(estimateRecurrenceCount("2026-06-12", "2026-06-10", "daily")).toBe(0);
  });
});

describe("non-project drafts", () => {
  const base: TimeEntryDraft = {
    date: "2026-08-31",
    projectId: "p1",
    taskSelection: "t1",
    startTime: "09:00",
    endTime: "10:00",
    description: "",
    isBillable: true
  };

  it("lets leave drafts save without a project", () => {
    const leave = applyClassificationToDraft(base, "LEAVE_FULL", 8);
    expect(canSaveTaskDraft(leave)).toBe(true);
    expect(leave.projectId).toBe("");
    expect(leave.endTime).toBe("17:00");
  });

  it("requires an activity type for organization activities", () => {
    const activity = applyClassificationToDraft(base, "TENANT_ACTIVITY", 8);
    expect(canSaveTaskDraft(activity)).toBe(false);
    expect(activity.projectId).toBe("");
    expect(canSaveTaskDraft(applyClassificationToDraft(base, "TENANT_ACTIVITY", 8, "act-1"))).toBe(
      true
    );
  });

  it("lists holiday, leave, and activity as the non-project choices", () => {
    expect(NON_PROJECT_ENTRY_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "PUBLIC_HOLIDAY",
      "LEAVE_FULL",
      "LEAVE_HALF",
      "TENANT_ACTIVITY"
    ]);
  });

  it("sends a null taskId when updating holiday or leave", () => {
    const holiday = applyClassificationToDraft(base, "PUBLIC_HOLIDAY", 8);
    const body = draftToTimelogBody(holiday, "UTC");
    expect(body).toMatchObject({
      classification: "PUBLIC_HOLIDAY",
      taskId: null,
      activityTypeId: null,
      holidayId: null,
      isBillable: false
    });
  });

  it("clears holiday and activity ids when switching back to project work", () => {
    const leave = applyClassificationToDraft(
      { ...base, holidayId: "hol-1", activityTypeId: "act-1" },
      "LEAVE_FULL",
      8
    );
    const project = applyClassificationToDraft(leave, "PROJECT", 8);
    expect(project.holidayId).toBe("");
    expect(project.activityTypeId).toBe("");
    expect(draftToTimelogBody({ ...project, taskSelection: "t1" }, "UTC")).toMatchObject({
      classification: "PROJECT",
      taskId: "t1",
      activityTypeId: null,
      holidayId: null
    });
  });
});
