import type { ProjectListItemDto } from "@kloqra/contracts";
import { reportingApiKeyHeaders } from "@kloqra/contracts";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";
import { setTenantLimitsOverride } from "./helpers/plan-limits";

function reportingDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString(), to: to.toISOString() };
}

describe("Public reporting API E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let projectId: string;
  let apiKey: string;
  let secret: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    adminSession = await loginAs(app, "admin@kloqra.dev");
    await setTenantLimitsOverride(prisma, adminSession.tenantId, { maxReportingApiKeys: 100 });

    const projectsRes = await authedAgent(app, adminSession).get("/projects");
    projectId = listItems<ProjectListItemDto>(projectsRes.body)[0]!.id;

    const createRes = await authedAgent(app, adminSession)
      .post("/reporting-api-keys")
      .send({ name: "E2E public reporting", projectIds: [projectId] });

    expect(createRes.status).toBe(201);
    apiKey = createRes.body.apiKey;
    secret = createRes.body.secret;
  });

  afterAll(async () => {
    if (adminSession?.tenantId) {
      await setTenantLimitsOverride(prisma, adminSession.tenantId, null);
    }
    await app.close();
  });

  it("rejects public reporting without API credentials", async () => {
    const { from, to } = reportingDateRange();
    const res = await request(app.getHttpServer()).get(
      `/public/reporting/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    expect(res.status).toBe(401);
  });

  it("returns dashboard data with valid API key and secret", async () => {
    const { from, to } = reportingDateRange();
    const res = await request(app.getHttpServer())
      .get(
        `/public/reporting/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      )
      .set(reportingApiKeyHeaders.API_KEY, apiKey)
      .set(reportingApiKeyHeaders.API_SECRET, secret);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("workspace");
    expect(res.body).toHaveProperty("timeByProject");
  });

  it("admin can list reporting API keys", async () => {
    const res = await authedAgent(app, adminSession).get("/reporting-api-keys");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).not.toHaveProperty("secret");
  });
});
