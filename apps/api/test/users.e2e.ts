import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import * as request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";

describe("Users E2E", () => {
  let app: INestApplication;
  let accessToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "member@chronomint.dev", password: "password123" });

    expect(loginRes.status).toBe(201);
    accessToken = loginRes.body.accessToken;
    workspaceId = loginRes.body.workspaceId;
  });

  afterAll(async () => {
    await app.close();
  });

  function authed() {
    return request(app.getHttpServer())
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Workspace-Id", workspaceId);
  }

  it("GET /users/me returns profile", async () => {
    const res = await authed().get("/users/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("member@chronomint.dev");
    expect(res.body.effectiveDailyTargetHours).toBeGreaterThan(0);
  });

  it("PATCH /users/me/preferences updates daily target", async () => {
    const res = await authed().patch("/users/me/preferences").send({ dailyTargetHours: 5.5 });
    expect(res.status).toBe(200);
    expect(res.body.preferences.dailyTargetHours).toBe(5.5);
    expect(res.body.effectiveDailyTargetHours).toBe(5.5);
  });

  it("PATCH /users/me updates display name", async () => {
    const res = await authed().patch("/users/me").send({ name: "Sam Rivera" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Sam Rivera");
  });

  it("POST /users/me/password rejects wrong current password", async () => {
    const res = await authed().post("/users/me/password").send({
      currentPassword: "wrong-password",
      newPassword: "newpassword1"
    });
    expect(res.status).toBe(401);
  });

  it("member cannot PATCH workspace settings", async () => {
    const res = await authed()
      .patch(`/workspaces/${workspaceId}`)
      .send({ settings: { dailyTargetHours: 10 } });
    expect(res.status).toBe(403);
  });
});
