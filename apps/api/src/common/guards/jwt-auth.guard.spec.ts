import { ForbiddenException, HttpStatus, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthRevocationService } from "../auth/auth-revocation.service";
import { JwtTokenService } from "../auth/jwt-token.service";
import { TENANT_SCOPED_KEY } from "../decorators/tenant-scoped.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let jwtTokens: {
    isTokenExpired: ReturnType<typeof vi.fn>;
    verifyAccessToken: ReturnType<typeof vi.fn>;
    toRequestUser: ReturnType<typeof vi.fn>;
  };
  let authRevocation: { assertNotRevoked: ReturnType<typeof vi.fn> };
  let prisma: { workspace: { findUnique: ReturnType<typeof vi.fn> } };
  let projectAccess: { managedProjectIds: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jwtTokens = {
      isTokenExpired: vi.fn(),
      verifyAccessToken: vi.fn(),
      toRequestUser: vi.fn()
    };
    authRevocation = { assertNotRevoked: vi.fn().mockResolvedValue(undefined) };
    prisma = {
      workspace: {
        findUnique: vi.fn().mockResolvedValue({ tenantId: "t1" })
      }
    };
    projectAccess = { managedProjectIds: vi.fn().mockResolvedValue([]) };
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(
      jwtTokens as unknown as JwtTokenService,
      authRevocation as unknown as AuthRevocationService,
      prisma as unknown as PrismaService,
      projectAccess as never,
      reflector as unknown as Reflector
    );
  });

  function contextWithReq(req: Record<string, unknown>) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req
      })
    };
  }

  it("throws token_expired when bearer is expired and no valid cookie", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(true);
    const req = {
      headers: { authorization: "Bearer expired-bearer", "x-auth-scope": "app" },
      cookies: {}
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).rejects.toThrow(
      UnauthorizedException
    );
    try {
      await guard.canActivate(contextWithReq(req) as never);
    } catch (e) {
      expect((e as UnauthorizedException).getResponse()).toMatchObject({
        details: { reason: "token_expired" }
      });
    }
  });

  it("uses valid cookie when bearer is expired", async () => {
    jwtTokens.isTokenExpired.mockImplementation((t: string) => t === "expired-bearer");
    jwtTokens.verifyAccessToken.mockReturnValue({
      sub: "u1",
      userId: "u1",
      tenantId: "t1",
      workspaceId: "ws1",
      role: "MEMBER",
      family: "fam-1",
      issuedAtMs: 1234
    });
    jwtTokens.toRequestUser.mockReturnValue({
      userId: "u1",
      tenantId: "t1",
      workspaceId: "ws1",
      role: "MEMBER"
    });
    const req = {
      headers: { authorization: "Bearer expired-bearer", "x-auth-scope": "app" },
      cookies: { access_token: "valid-cookie" }
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).resolves.toBe(true);
    expect(jwtTokens.verifyAccessToken).toHaveBeenCalledWith("valid-cookie", "app");
    expect(authRevocation.assertNotRevoked).toHaveBeenCalledWith("u1", "fam-1", 1234);
  });

  it("rejects revoked sessions", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(false);
    jwtTokens.verifyAccessToken.mockReturnValue({
      sub: "u1",
      tenantId: "t1",
      workspaceId: "ws1",
      family: "fam-1"
    });
    authRevocation.assertNotRevoked.mockRejectedValue(
      new UnauthorizedException({
        details: { reason: "session_revoked" }
      })
    );
    const req = {
      headers: { authorization: "Bearer valid", "x-auth-scope": "app" },
      cookies: {}
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("rejects when workspace tenant does not match JWT tenant", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(false);
    jwtTokens.verifyAccessToken.mockReturnValue({
      sub: "u1",
      tenantId: "t1",
      workspaceId: "ws1",
      role: "MEMBER"
    });
    prisma.workspace.findUnique.mockResolvedValue({ tenantId: "t-other" });
    const req = {
      headers: { authorization: "Bearer valid", "x-auth-scope": "app" },
      cookies: {}
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN
    });
  });

  it("rejects workspace header mismatch before tenant check", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(false);
    jwtTokens.verifyAccessToken.mockReturnValue({
      sub: "u1",
      tenantId: "t1",
      workspaceId: "ws1",
      role: "MEMBER"
    });
    const req = {
      headers: {
        authorization: "Bearer valid",
        "x-auth-scope": "app",
        "x-workspace-id": "ws-other"
      },
      cookies: {}
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).rejects.toThrow(
      ForbiddenException
    );
    expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
  });

  it("requires workspace on non-tenant-scoped routes", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(false);
    jwtTokens.verifyAccessToken.mockReturnValue({
      sub: "u1",
      tenantId: "t1",
      tenantRole: "OWNER"
    });
    reflector.getAllAndOverride.mockReturnValue(false);
    const req = {
      headers: { authorization: "Bearer valid", "x-auth-scope": "app" },
      cookies: {}
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).rejects.toMatchObject({
      response: { code: "WORKSPACE_REQUIRED" }
    });
  });

  it("allows tenant-scoped routes without workspace", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(false);
    jwtTokens.verifyAccessToken.mockReturnValue({
      sub: "u1",
      tenantId: "t1",
      tenantRole: "OWNER"
    });
    jwtTokens.toRequestUser.mockReturnValue({
      userId: "u1",
      tenantId: "t1"
    });
    reflector.getAllAndOverride.mockImplementation((key: string) => key === TENANT_SCOPED_KEY);
    const req = {
      headers: { authorization: "Bearer valid", "x-auth-scope": "app" },
      cookies: {}
    };
    await expect(guard.canActivate(contextWithReq(req) as never)).resolves.toBe(true);
    expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
  });
});
