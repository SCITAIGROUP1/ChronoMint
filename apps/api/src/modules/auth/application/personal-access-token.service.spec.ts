import { ErrorCodes } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { PersonalAccessTokenService } from "./personal-access-token.service";

describe("PersonalAccessTokenService", () => {
  let prisma: {
    personalAccessToken: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let service: PersonalAccessTokenService;

  beforeEach(() => {
    prisma = {
      personalAccessToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn()
      }
    };
    service = new PersonalAccessTokenService(prisma as unknown as PrismaService);
  });

  it("creates a token with klo_pat_ prefix", async () => {
    prisma.personalAccessToken.create.mockResolvedValue({
      id: "tok-1",
      name: "Forge",
      createdAt: new Date("2026-06-11T00:00:00.000Z"),
      lastUsedAt: null,
      expiresAt: null
    });

    const result = await service.create("user-1", "ws-1", { name: "Forge" });

    expect(result.token.startsWith("klo_pat_")).toBe(true);
    expect(result.item.name).toBe("Forge");
  });

  it("rejects unknown personal access tokens", async () => {
    prisma.personalAccessToken.findUnique.mockResolvedValue(null);

    await expect(service.authenticate("klo_pat_invalid")).rejects.toMatchObject({
      code: ErrorCodes.PERSONAL_ACCESS_TOKEN_INVALID
    });
  });
});
