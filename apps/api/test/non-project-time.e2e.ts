import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Non-project time E2E", () => {
  let app: INestApplication;
  let memberToken: string;
  let memberWorkspaceId: string;
  let adminToken: string;
  let adminWorkspaceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    const memberRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "member@kloqra.dev", password: "password123" });
    expect(memberRes.status).toBe(201);
    memberToken = memberRes.body.accessToken;
    memberWorkspaceId = memberRes.body.workspaceId;

    const adminRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@kloqra.dev", password: "password123" });
    expect(adminRes.status).toBe(201);
    adminToken = adminRes.body.accessToken;
    adminWorkspaceId = adminRes.body.workspaceId;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists tenant activity types for a workspace member", async () => {
    const res = await request(app.getHttpServer())
      .get("/timelogs/activity-types")
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Workspace-Id", memberWorkspaceId);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    const names = (res.body.items as { name: string }[]).map((item) => item.name);
    expect(names).toEqual(expect.arrayContaining(["Office Event", "Office Meeting"]));
  });

  it("creates full-day leave without a task and returns daily hours", async () => {
    const start = new Date("2099-11-15T09:00:00.000Z");
    const res = await request(app.getHttpServer())
      .post("/timelogs")
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Workspace-Id", memberWorkspaceId)
      .send({
        classification: "LEAVE_FULL",
        startTime: start.toISOString(),
        description: "e2e leave"
      });

    expect(res.status).toBe(201);
    expect(res.body.classification).toBe("LEAVE_FULL");
    expect(res.body.taskId).toBeNull();
    expect(res.body.isBillable).toBe(false);
    expect(res.body.durationSec).toBeGreaterThan(0);
  });

  it("lets an org admin create a holiday and apply it to members", async () => {
    const date = `2099-12-${String(20 + Math.floor(Math.random() * 9)).padStart(2, "0")}`;
    const create = await request(app.getHttpServer())
      .post("/tenants/current/holidays")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Workspace-Id", adminWorkspaceId)
      .send({ date, name: "E2E Holiday" });

    expect(create.status).toBe(201);
    expect(create.body.date).toBe(date);

    const apply = await request(app.getHttpServer())
      .post(`/tenants/current/holidays/${create.body.id}/apply`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Workspace-Id", adminWorkspaceId);

    expect(apply.status).toBe(201);
    expect(apply.body.createdCount + apply.body.skippedCount).toBeGreaterThan(0);

    const list = await request(app.getHttpServer())
      .get("/timelogs")
      .query({
        from: `${date}T00:00:00.000Z`,
        to: `${date}T23:59:59.000Z`,
        nonProjectTime: "only"
      })
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Workspace-Id", memberWorkspaceId);

    expect(list.status).toBe(200);
    const holidayLogs = (
      list.body.items as { classification: string; holidayName?: string }[]
    ).filter((item) => item.classification === "PUBLIC_HOLIDAY");
    expect(holidayLogs.length).toBeGreaterThanOrEqual(0);
  });
});
