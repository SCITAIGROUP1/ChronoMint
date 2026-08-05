import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthRevocationService } from "./auth-revocation.service";

describe("AuthRevocationService", () => {
  let service: AuthRevocationService;
  const redis = {
    setex: vi.fn(),
    get: vi.fn()
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    service = new AuthRevocationService({ getClient: () => redis } as never);
  });

  it("revokeFamily stores redis key with ttl", async () => {
    await service.revokeFamily("family-1");
    expect(redis.setex).toHaveBeenCalledWith(
      "auth:revoked-family:family-1",
      expect.any(Number),
      "1"
    );
  });

  it("assertNotRevoked throws when family revoked", async () => {
    redis.get.mockImplementation(async (key: string) => (key.includes("family-1") ? "1" : null));
    await expect(service.assertNotRevoked("user-1", "family-1")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("rejects tokens issued before a user revocation and allows a fresh login", async () => {
    redis.get.mockResolvedValue("2000");

    await expect(service.assertNotRevoked("user-1", undefined, 1999)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    await expect(service.assertNotRevoked("user-1", undefined, 2001)).resolves.toBeUndefined();
  });

  it("stores a timestamp when revoking all user sessions", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);

    await service.revokeUser("user-1");

    expect(redis.setex).toHaveBeenCalledWith(
      "auth:revoked-user:user-1",
      expect.any(Number),
      "1234"
    );
  });

  it("keeps legacy boolean user revocations fail-closed", async () => {
    redis.get.mockResolvedValue("1");

    await expect(service.assertNotRevoked("user-1", undefined, Date.now())).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
