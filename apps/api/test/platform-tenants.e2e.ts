import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { loginAs } from "./helpers/auth";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

describe("Platform tenants E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /platform/tenants requires platform auth", async () => {
    const res = await platformAuthedAgent(app, { accessToken: "invalid" }).get("/platform/tenants");
    expect(res.status).toBe(401);
  });

  it("GET /platform/tenants lists seeded tenant", async () => {
    const session = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, session).get("/platform/tenants");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    const demo = res.body.items.find((item: { slug: string }) => item.slug === "kloqra-demo");
    expect(demo).toBeTruthy();
    expect(res.body.total).toBeGreaterThan(0);
  });

  it("GET /platform/tenants/:id returns tenant detail", async () => {
    const session = await loginAsPlatform(app);
    const listRes = await platformAuthedAgent(app, session).get("/platform/tenants");
    const tenantId =
      listRes.body.items.find((item: { slug: string }) => item.slug === "kloqra-demo")?.id ??
      listRes.body.items[0].id;
    const detailRes = await platformAuthedAgent(app, session).get(`/platform/tenants/${tenantId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.slug).toBe("kloqra-demo");
    expect(detailRes.body.ownerEmail).toBeTruthy();
    expect(detailRes.body.subscription).toBeTruthy();
  });

  it("tenant admin token is rejected on platform tenants", async () => {
    const tenantSession = await loginAs(app, "admin@kloqra.dev");
    const res = await platformAuthedAgent(app, tenantSession).get("/platform/tenants");
    expect(res.status).toBe(401);
  });
});
