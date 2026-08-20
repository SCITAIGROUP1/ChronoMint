import type { ProjectDto } from "@kloqra/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SubmissionsTable } from "./submissions-table";

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useTimelogListQuery: () => ({
      data: { items: [] },
      refetch: vi.fn(),
      isLoading: false,
      error: null
    }),
    useTimelogMutations: () => ({
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      createBatch: vi.fn(),
      commitUpsert: vi.fn(),
      invalidateAll: vi.fn()
    })
  };
});

const draftSubmission = {
  id: "period-1",
  userId: "user-1",
  workspaceId: "ws-1",
  projectId: "proj-1",
  projectName: "Support Retainer",
  periodStart: "2025-06-02T00:00:00.000Z",
  periodEnd: "2025-06-08T23:59:59.999Z",
  approvalPeriod: "weekly" as const,
  status: "DRAFT" as const,
  note: null,
  reviewNote: null,
  reviewedBy: null,
  submittedAt: null,
  reviewedAt: null
};

describe("SubmissionsTable", () => {
  it("renders table headers and submit action for draft rows", () => {
    const html = renderToStaticMarkup(
      <SubmissionsTable
        submissions={[draftSubmission]}
        projects={[
          {
            id: "proj-1",
            name: "Support Retainer",
            workspaceId: "ws-1",
            color: "#236bfe",
            clientName: null,
            budgetHours: null,
            isActive: true,
            timesheetApprovalEnabled: true,
            timesheetApprovalPeriod: "weekly"
          } satisfies ProjectDto
        ]}
        tasks={[]}
        onSubmitted={() => {}}
        workspaceId="ws-1"
        timezone="UTC"
      />
    );

    expect(html).toContain("Period");
    expect(html).toContain("Project");
    expect(html).toContain("Support Retainer");
    expect(html).toContain("Submit");
    expect(html).toContain("date=2025-06-02");
  });

  it("marks an in-progress week as early submit, not a due draft", () => {
    const html = renderToStaticMarkup(
      <SubmissionsTable
        submissions={[
          {
            ...draftSubmission,
            periodStart: "2026-08-16T18:30:00.000Z",
            periodEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]}
        projects={[
          {
            id: "proj-1",
            name: "Support Retainer",
            workspaceId: "ws-1",
            color: "#236bfe",
            clientName: null,
            budgetHours: null,
            isActive: true,
            timesheetApprovalEnabled: true,
            timesheetApprovalPeriod: "weekly"
          } satisfies ProjectDto
        ]}
        tasks={[]}
        onSubmitted={() => {}}
        workspaceId="ws-1"
        timezone="Asia/Colombo"
      />
    );

    expect(html).toContain("In progress");
    expect(html).toContain("Submit early");
    expect(html).toContain("This week is still in progress");
    expect(html).not.toContain(">Submit<");
  });

  it("uses day and month early-submit copy for open daily and monthly drafts", () => {
    const futureEnd = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const dailyHtml = renderToStaticMarkup(
      <SubmissionsTable
        submissions={[
          {
            ...draftSubmission,
            approvalPeriod: "daily",
            periodEnd: futureEnd
          }
        ]}
        projects={[]}
        tasks={[]}
        onSubmitted={() => {}}
        workspaceId="ws-1"
        timezone="UTC"
      />
    );
    expect(dailyHtml).toContain("Submit day early");
    expect(dailyHtml).toContain("This day is still in progress");

    const monthlyHtml = renderToStaticMarkup(
      <SubmissionsTable
        submissions={[
          {
            ...draftSubmission,
            approvalPeriod: "monthly",
            periodEnd: futureEnd
          }
        ]}
        projects={[]}
        tasks={[]}
        onSubmitted={() => {}}
        workspaceId="ws-1"
        timezone="UTC"
      />
    );
    expect(monthlyHtml).toContain("Submit month early");
    expect(monthlyHtml).toContain("This month is still in progress");
  });
});
