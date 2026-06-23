import { ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "../prisma/generated/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";
import {
  cleanupTenantIsolationFixtures,
  createTenantBFixture,
  TENANT_B_OWNER_EMAIL
} from "./helpers/tenant-isolation-fixture";

type TenantMemberRow = { id: string; userEmail: string };

function tenantDb(prisma: PrismaService): PrismaClient {
  return prisma as unknown as PrismaClient;
}

describe("Tenants E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let opsSession: Awaited<ReturnType<typeof loginAs>>;
  let opsMemberId: string;
  let adminMemberId: string;
  let delegateMemberId: string | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    await cleanupTenantIsolationFixtures(prisma);
    await createTenantBFixture(prisma);

    adminSession = await loginAs(app, "admin@kloqra.dev");
    opsSession = await loginAs(app, "ops@kloqra.dev");

    const membersRes = await authedAgent(app, adminSession).get(ROUTES.TENANTS.MEMBERS);
    expect(membersRes.status).toBe(200);
    const members = membersRes.body as TenantMemberRow[];
    opsMemberId = members.find((member) => member.userEmail === "ops@kloqra.dev")!.id;
    adminMemberId = members.find((member) => member.userEmail === "admin@kloqra.dev")!.id;
  });

  afterAll(async () => {
    if (delegateMemberId) {
      const db = tenantDb(prisma);
      await db.tenantMember.delete({ where: { id: delegateMemberId } }).catch(() => undefined);
      await db.user.deleteMany({ where: { email: "tenant-delegate@kloqra.dev" } });
    }
    await authedAgent(app, adminSession)
      .patch(ROUTES.TENANTS.MEMBER(opsMemberId))
      .send({ isActive: true });
    await cleanupTenantIsolationFixtures(prisma);
    await app.close();
  });

  it("returns current tenant for organization owner", async () => {
    const res = await authedAgent(app, adminSession).get(ROUTES.TENANTS.CURRENT);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("kloqra-demo");
    expect(res.body.id).toBe(adminSession.tenantId);
  });

  it("returns overview with workspace count and pilot subscription", async () => {
    const res = await authedAgent(app, adminSession).get(ROUTES.TENANTS.OVERVIEW);
    expect(res.status).toBe(200);
    expect(res.body.workspaceCount).toBeGreaterThanOrEqual(3);
    expect(res.body.seatCount).toBeGreaterThan(0);
    expect(res.body.subscription).toMatchObject({
      tenantId: adminSession.tenantId,
      status: "active",
      planName: "Pilot",
      limits: { maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 }
    });
  });

  it("returns subscription for tenant owner", async () => {
    const res = await authedAgent(app, adminSession).get(ROUTES.TENANTS.SUBSCRIPTION);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tenantId: adminSession.tenantId,
      planName: "Pilot",
      status: "active"
    });
  });

  it("rejects subscription route for tenant admin", async () => {
    const res = await authedAgent(app, opsSession).get(ROUTES.TENANTS.SUBSCRIPTION);
    expect(res.status).toBe(403);
  });

  it("lists organization members for tenant admin", async () => {
    const res = await authedAgent(app, opsSession).get(ROUTES.TENANTS.MEMBERS);
    expect(res.status).toBe(200);
    const emails = (res.body as Array<{ userEmail: string }>).map((member) => member.userEmail);
    expect(emails).toContain("admin@kloqra.dev");
    expect(emails).toContain("ops@kloqra.dev");
  });

  it("rejects workspace-only users from current tenant route", async () => {
    const memberSession = await loginAs(app, "member@kloqra.dev");
    const res = await authedAgent(app, memberSession).get(ROUTES.TENANTS.CURRENT);
    expect(res.status).toBe(403);
  });

  it("allows owner to invite tenant admin", async () => {
    const res = await authedAgent(app, adminSession).post(ROUTES.TENANTS.MEMBERS).send({
      email: "tenant-delegate@kloqra.dev",
      name: "Tenant Delegate",
      role: "ADMIN"
    });
    expect(res.status).toBe(201);
    expect(res.body.member.userEmail).toBe("tenant-delegate@kloqra.dev");
    expect(res.body.member.role).toBe("ADMIN");
    delegateMemberId = res.body.member.id as string;
  });

  it("rejects tenant admin inviting organization members", async () => {
    const res = await authedAgent(app, opsSession).post(ROUTES.TENANTS.MEMBERS).send({
      email: "another-delegate@kloqra.dev",
      name: "Another Delegate",
      role: "ADMIN"
    });
    expect(res.status).toBe(403);
  });

  it("rejects inviting a user who belongs to another organization", async () => {
    const res = await authedAgent(app, adminSession).post(ROUTES.TENANTS.MEMBERS).send({
      email: TENANT_B_OWNER_EMAIL,
      name: "Owner B",
      role: "ADMIN"
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
  });

  it("allows owner to deactivate tenant admin", async () => {
    const res = await authedAgent(app, adminSession)
      .patch(ROUTES.TENANTS.MEMBER(opsMemberId))
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it("blocks deactivating the last organization owner", async () => {
    const res = await authedAgent(app, adminSession)
      .patch(ROUTES.TENANTS.MEMBER(adminMemberId))
      .send({ isActive: false });
    expect(res.status).toBe(403);
  });
});
