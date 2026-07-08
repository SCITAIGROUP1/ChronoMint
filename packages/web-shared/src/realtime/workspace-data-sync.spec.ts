import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLocalTimelogMutationEchoGuards,
  noteLocalTimelogMutation,
  shouldSuppressLocalTimelogMutationEcho
} from "./workspace-data-sync";

describe("local timelog mutation echo suppression", () => {
  const workspaceId = "ws-1";

  beforeEach(() => {
    clearLocalTimelogMutationEchoGuards();
  });

  it("suppresses timelog-derived socket echoes after noteLocalTimelogMutation", () => {
    noteLocalTimelogMutation(workspaceId);
    expect(shouldSuppressLocalTimelogMutationEcho(workspaceId, ["timelogs", "timesheet"])).toBe(
      true
    );
    expect(shouldSuppressLocalTimelogMutationEcho(workspaceId, ["submissions"])).toBe(true);
  });

  it("does not suppress project/approval scopes even during the echo window", () => {
    noteLocalTimelogMutation(workspaceId);
    expect(shouldSuppressLocalTimelogMutationEcho(workspaceId, ["timelogs", "projects"])).toBe(
      false
    );
    expect(shouldSuppressLocalTimelogMutationEcho(workspaceId, ["pending_approvals"])).toBe(false);
  });

  it("does not suppress other workspaces", () => {
    noteLocalTimelogMutation(workspaceId);
    expect(shouldSuppressLocalTimelogMutationEcho("ws-other", ["timelogs"])).toBe(false);
  });
});
