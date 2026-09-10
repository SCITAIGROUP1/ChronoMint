import type { AuthSessionDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveClientPostAuthPath } from "./resolve-client-post-auth-path";

const { hasMultipleMock, fetchProfileMock } = vi.hoisted(() => ({
  hasMultipleMock: vi.fn(),
  fetchProfileMock: vi.fn()
}));

vi.mock("./workspace-check", () => ({
  hasMultipleWorkspaces: (...args: unknown[]) => hasMultipleMock(...args)
}));

vi.mock("../stores/user-profile.store", () => ({
  fetchUserProfile: (...args: unknown[]) => fetchProfileMock(...args)
}));

const memberSession = {
  workspaceId: "ws-1",
  workspaceRole: "MEMBER",
  user: { id: "u-1", email: "m@example.com", name: "Member" }
} as AuthSessionDto;

describe("resolveClientPostAuthPath", () => {
  beforeEach(() => {
    hasMultipleMock.mockReset();
    fetchProfileMock.mockReset();
  });

  it("routes multi-workspace members to select-workspace", async () => {
    hasMultipleMock.mockResolvedValue(true);
    await expect(resolveClientPostAuthPath(memberSession, "/timer")).resolves.toBe(
      "/select-workspace?next=%2Ftimer"
    );
  });

  it("skips the picker when a default workspace is set", async () => {
    hasMultipleMock.mockResolvedValue(true);
    fetchProfileMock.mockResolvedValue({
      preferences: { startupPage: "timer" }
    });
    await expect(
      resolveClientPostAuthPath({
        ...memberSession,
        defaultWorkspaceId: "ws-1"
      })
    ).resolves.toBe("/timer");
  });

  it("uses startup preference when a single workspace", async () => {
    hasMultipleMock.mockResolvedValue(false);
    fetchProfileMock.mockResolvedValue({
      preferences: { startupPage: "timer" }
    });
    await expect(resolveClientPostAuthPath(memberSession)).resolves.toBe("/timer");
  });

  it("maps a saved dashboard preference to overview for members", async () => {
    hasMultipleMock.mockResolvedValue(false);
    fetchProfileMock.mockResolvedValue({
      preferences: { startupPage: "dashboard" }
    });
    await expect(resolveClientPostAuthPath(memberSession)).resolves.toBe("/overview");
  });

  it("falls back to overview when a member profile load fails", async () => {
    hasMultipleMock.mockRejectedValue(new Error("offline"));
    await expect(resolveClientPostAuthPath(memberSession)).resolves.toBe("/overview");
  });
});
