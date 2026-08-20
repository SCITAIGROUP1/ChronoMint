import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubmitCascadeDialog } from "./submit-cascade-dialog.js";

describe("SubmitCascadeDialog", () => {
  it("renders blocked reason when cascade is blocked", () => {
    render(
      <SubmitCascadeDialog
        open
        onOpenChange={() => {}}
        preview={{
          targetPeriod: {
            id: "p1",
            userId: "u1",
            workspaceId: "w1",
            projectId: "proj1",
            projectName: "Project",
            periodStart: "2025-06-02T00:00:00.000Z",
            periodEnd: "2025-06-08T23:59:59.999Z",
            approvalPeriod: "weekly",
            status: "DRAFT",
            note: null,
            reviewNote: null,
            reviewedBy: null,
            submittedAt: null,
            reviewedAt: null
          },
          cascadedPeriods: [],
          blockedReason: "Resolve the rejected period first."
        }}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Resolve the rejected period first.")).toBeInTheDocument();
  });

  it("renders single-period submit preview", () => {
    render(
      <SubmitCascadeDialog
        open
        onOpenChange={() => {}}
        preview={{
          targetPeriod: {
            id: "p1",
            userId: "u1",
            workspaceId: "w1",
            projectId: "proj1",
            projectName: "Website",
            periodStart: "2025-06-02T00:00:00.000Z",
            periodEnd: "2025-06-08T23:59:59.999Z",
            approvalPeriod: "weekly",
            status: "DRAFT",
            note: null,
            reviewNote: null,
            reviewedBy: null,
            submittedAt: null,
            reviewedAt: null
          },
          cascadedPeriods: []
        }}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeEnabled();
  });

  it("warns when submitting a week that has not ended", () => {
    const futureEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <SubmitCascadeDialog
        open
        onOpenChange={() => {}}
        preview={{
          targetPeriod: {
            id: "p1",
            userId: "u1",
            workspaceId: "w1",
            projectId: "proj1",
            projectName: "Brand Campaign Q2",
            periodStart: "2026-08-16T18:30:00.000Z",
            periodEnd: futureEnd,
            approvalPeriod: "weekly",
            status: "DRAFT",
            note: null,
            reviewNote: null,
            reviewedBy: null,
            submittedAt: null,
            reviewedAt: null
          },
          cascadedPeriods: []
        }}
        timezone="Asia/Colombo"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Submit this week early?")).toBeInTheDocument();
    expect(screen.getByText(/has not ended yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit early" })).toBeEnabled();
  });

  it("warns when submitting a day or month that has not ended", () => {
    const futureEnd = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const { rerender } = render(
      <SubmitCascadeDialog
        open
        onOpenChange={() => {}}
        preview={{
          targetPeriod: {
            id: "p1",
            userId: "u1",
            workspaceId: "w1",
            projectId: "proj1",
            projectName: "Daily Project",
            periodStart: new Date().toISOString(),
            periodEnd: futureEnd,
            approvalPeriod: "daily",
            status: "DRAFT",
            note: null,
            reviewNote: null,
            reviewedBy: null,
            submittedAt: null,
            reviewedAt: null
          },
          cascadedPeriods: []
        }}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText("Submit this day early?")).toBeInTheDocument();

    rerender(
      <SubmitCascadeDialog
        open
        onOpenChange={() => {}}
        preview={{
          targetPeriod: {
            id: "p1",
            userId: "u1",
            workspaceId: "w1",
            projectId: "proj1",
            projectName: "Monthly Project",
            periodStart: new Date().toISOString(),
            periodEnd: futureEnd,
            approvalPeriod: "monthly",
            status: "DRAFT",
            note: null,
            reviewNote: null,
            reviewedBy: null,
            submittedAt: null,
            reviewedAt: null
          },
          cascadedPeriods: []
        }}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText("Submit this month early?")).toBeInTheDocument();
  });
});
