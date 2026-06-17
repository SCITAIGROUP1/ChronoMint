import { describe, expect, it, vi, beforeEach } from "vitest";
import { JiraService } from "./jira.service";

describe("JiraService", () => {
  let service: JiraService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
      workspace: { findUniqueOrThrow: vi.fn() }
    };
    service = new JiraService(mockPrisma);
  });

  describe("getMyIssues", () => {
    it("returns connected:false when user has no jiraEmail", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ jiraEmail: null });
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
        settings: {
          jiraSiteUrl: "https://company.atlassian.net",
          jiraServiceEmail: "svc@company.com",
          jiraServiceToken: "token"
        }
      });

      const result = await service.getMyIssues("user-1", "ws-1");

      expect(result.connected).toBe(false);
      expect(result.issues).toHaveLength(0);
    });

    it("returns connected:false when workspace has no jiraSiteUrl", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ jiraEmail: "user@company.com" });
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({ settings: {} });

      const result = await service.getMyIssues("user-1", "ws-1");

      expect(result.connected).toBe(false);
      expect(result.issues).toHaveLength(0);
    });

    it("returns connected:false when workspace has no jiraServiceEmail", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ jiraEmail: "user@company.com" });
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
        settings: { jiraSiteUrl: "https://company.atlassian.net", jiraServiceToken: "token" }
      });

      const result = await service.getMyIssues("user-1", "ws-1");

      expect(result.connected).toBe(false);
    });
  });

  describe("updateCredentials", () => {
    it("updates jiraEmail on the user record", async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateCredentials("user-1", { jiraEmail: "new@company.com" });

      expect(result.ok).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ jiraEmail: "new@company.com" })
        })
      );
    });

    it("clears jiraEmail when null is passed", async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateCredentials("user-1", { jiraEmail: null });

      expect(result.ok).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ jiraEmail: null })
        })
      );
    });
  });
});
