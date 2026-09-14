import { DEFAULT_MEMBER_EXPORT_COLUMNS, ROUTES, TIMELOG_IMPORT_COLUMNS } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { getContextualPrompts } from "./assistant/assistant-prompts";
import {
  ONBOARDING_STEP_IDS,
  PROJECTS_DASHBOARD_CARDS,
  TRACK_TIME_CARDS,
  getStepTitle
} from "./onboarding/onboarding-steps";

describe("UPS-05C member parity", () => {
  it("keeps assistant prompts aligned with unified routes", () => {
    expect(getContextualPrompts("/timer")).toContain("How do I start a timer?");
    expect(getContextualPrompts("/time-tracker")).toContain("Export my hours");
    expect(getContextualPrompts("/profile")).toEqual([
      "How do I start a timer?",
      "Submit my timesheet",
      "Export my hours"
    ]);
  });

  it("keeps the onboarding wizard and unified route cards", () => {
    expect(ONBOARDING_STEP_IDS).toEqual([
      "welcome",
      "workspace",
      "track-time",
      "projects-dashboard",
      "finish"
    ]);
    expect(getStepTitle("workspace", "Alex", false)).toBe("Your assigned projects");
    expect(TRACK_TIME_CARDS.map((card) => card.route)).toEqual([
      "/timer",
      "/time-tracker",
      "/timesheet"
    ]);
    expect(PROJECTS_DASHBOARD_CARDS.map((card) => card.route)).toEqual(["/projects", "/dashboard"]);
  });

  it("uses only member import and export contracts for personal time tracker", () => {
    expect(ROUTES.TIMELOGS.IMPORT).toBe("/timelogs/import");
    expect(ROUTES.TIMELOGS.IMPORT_TEMPLATE).toBe("/timelogs/import/template");
    expect(ROUTES.EXPORT.ME).toBe("/export/me");
    expect(TIMELOG_IMPORT_COLUMNS).toEqual([
      "project",
      "task",
      "date",
      "start_time",
      "end_time",
      "description",
      "billable"
    ]);
    expect(DEFAULT_MEMBER_EXPORT_COLUMNS.time_entries).toContain("hours");
  });
});
