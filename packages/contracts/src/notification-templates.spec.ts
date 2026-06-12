import { describe, expect, it } from "vitest";
import {
  buildNotificationTemplate,
  formatTimesheetPeriodLabel,
  getIsoWeekNumber,
  parseNotificationTemplateId,
  parseNotificationType
} from "./notification-templates";

const UUID = "00000000-0000-4000-8000-000000000001";

describe("notification templates", () => {
  it("formats daily and monthly period labels", () => {
    const date = new Date("2026-06-09T12:00:00.000Z");
    expect(formatTimesheetPeriodLabel(date, "daily")).toContain("Jun");
    expect(formatTimesheetPeriodLabel(date, "monthly")).toContain("2026");
  });

  it("formats weekly period labels as Week N", () => {
    const label = formatTimesheetPeriodLabel(new Date("2026-06-09T12:00:00.000Z"), "weekly");
    expect(label).toMatch(/^Week \d+$/);
    expect(getIsoWeekNumber(new Date("2026-06-09T12:00:00.000Z"))).toBeGreaterThan(0);
  });

  it("parses template ids and notification types", () => {
    expect(parseNotificationTemplateId("timesheet.approved")).toBe("timesheet.approved");
    expect(parseNotificationType("APPROVAL_REQUEST")).toBe("APPROVAL_REQUEST");
  });

  it("rejects invalid notification template context", () => {
    expect(() =>
      buildNotificationTemplate("project.assigned", { projectName: "", projectId: UUID })
    ).toThrow(/Invalid context/);
  });

  it("renders project assigned template with and without inviter", () => {
    const withInviter = buildNotificationTemplate("project.assigned", {
      projectName: "Website Redesign",
      projectId: UUID,
      addedByName: "Alex Admin"
    });
    expect(withInviter.body).toContain("Alex Admin added you to");

    const withoutInviter = buildNotificationTemplate("project.assigned", {
      projectName: "Website Redesign",
      projectId: UUID
    });
    expect(withoutInviter.body).toContain("You were added to");
  });

  it("renders task assigned template", () => {
    const rendered = buildNotificationTemplate("task.assigned", {
      taskName: "Implement auth",
      projectName: "Website Redesign",
      taskId: UUID,
      projectId: UUID
    });
    expect(rendered.title).toBe("Task assigned");
    expect(rendered.metadata.taskId).toBe(UUID);
  });

  it("renders timesheet approved template with success variant", () => {
    const rendered = buildNotificationTemplate("timesheet.approved", {
      projectName: "Website Redesign",
      periodLabel: "Week 23",
      periodId: UUID,
      projectId: UUID,
      reviewerName: "Alex Admin"
    });
    expect(rendered.title).toBe("Timesheet approved");
    expect(rendered.metadata.variant).toBe("success");
    expect(rendered.metadata.ctaLabel).toBe("View timesheet");
    expect(rendered.emailSubject).toContain("Timesheet approved");
  });

  it("renders timesheet submitted template for admins", () => {
    const rendered = buildNotificationTemplate("timesheet.submitted", {
      submitterName: "Sam Rivera",
      projectName: "Website Redesign",
      periodLabel: "Week 23",
      periodId: UUID,
      projectId: UUID,
      totalHours: 38.5
    });
    expect(rendered.preferenceKey).toBe("approvalRequest");
    expect(rendered.metadata.href).toBe("/approvals");
    expect(rendered.metadata.variant).toBe("attention");
    expect(rendered.metadata.details?.some((d) => d.label === "Hours")).toBe(true);
  });

  it("renders timesheet reminder template with period metadata", () => {
    const rendered = buildNotificationTemplate("timesheet.reminder", {
      periodLabel: "Week 23",
      dueLabel: "Friday, Jun 13",
      periodStart: "2026-06-09T00:00:00.000Z"
    });
    expect(rendered.title).toBe("Submit your timesheet");
    expect(rendered.metadata.variant).toBe("attention");
    expect(rendered.metadata.periodStart).toBe("2026-06-09T00:00:00.000Z");
    expect(rendered.body).toContain("Friday, Jun 13");

    const withoutDue = buildNotificationTemplate("timesheet.reminder", {
      periodLabel: "Week 23",
      periodStart: "2026-06-09T00:00:00.000Z"
    });
    expect(withoutDue.body).not.toContain("by ");
  });

  it("renders timesheet rejected template with review note", () => {
    const rendered = buildNotificationTemplate("timesheet.rejected", {
      projectName: "Website Redesign",
      periodLabel: "Week 23",
      periodId: UUID,
      projectId: UUID,
      reviewerName: "Alex Admin",
      reviewNote: "Missing Friday hours"
    });
    expect(rendered.metadata.variant).toBe("warning");
    expect(rendered.body).toContain("Missing Friday hours");
  });

  it("renders timer auto-stopped template", () => {
    const rendered = buildNotificationTemplate("timer.autostopped", {
      hours: 14,
      taskName: "Implement auth",
      taskId: UUID
    });
    expect(rendered.body).toContain("Implement auth");
    expect(rendered.metadata.taskId).toBe(UUID);

    const withoutTask = buildNotificationTemplate("timer.autostopped", { hours: 8 });
    expect(withoutTask.body).not.toContain('"');
  });

  it("renders member and workspace templates", () => {
    const joined = buildNotificationTemplate("member.joined", {
      memberName: "Sam Rivera",
      workspaceName: "Acme",
      inviterName: "Alex Admin"
    });
    expect(joined.body).toContain("Invited by Alex Admin");

    const removed = buildNotificationTemplate("member.removed", {
      memberName: "Sam Rivera",
      workspaceName: "Acme",
      actorName: "Alex Admin"
    });
    expect(removed.body).toContain("Removed by Alex Admin");

    const workspace = buildNotificationTemplate("workspace.added", {
      workspaceName: "Acme"
    });
    expect(workspace.body).toContain("You have been added to Acme");
  });

  it("renders export and budget templates", () => {
    const ready = buildNotificationTemplate("export.ready", { scheduleName: "Weekly rollup" });
    expect(ready.metadata.variant).toBe("success");

    const failed = buildNotificationTemplate("export.failed", {
      scheduleName: "Weekly rollup",
      errorMessage: "SMTP timeout"
    });
    expect(failed.metadata.variant).toBe("warning");
    expect(failed.body).toContain("Weekly rollup");
    expect(failed.metadata.details?.some((d) => d.label === "Error")).toBe(true);

    const near = buildNotificationTemplate("budget.near", {
      projectName: "Website Redesign",
      projectId: UUID,
      percentUsed: 90,
      budgetHours: 100
    });
    expect(near.title).toBe("Budget threshold reached");

    const over = buildNotificationTemplate("budget.over", {
      projectName: "Website Redesign",
      projectId: UUID,
      percentUsed: 110,
      budgetHours: 100
    });
    expect(over.title).toBe("Budget exceeded");
  });

  it("renders jira sync template", () => {
    const rendered = buildNotificationTemplate("jira.synced", {
      projectName: "Website Redesign",
      syncSummary: "Synced 5 issues"
    });
    expect(rendered.body).toBe("Synced 5 issues");
    expect(rendered.metadata.details?.[0]?.value).toBe("Website Redesign");
  });
});
