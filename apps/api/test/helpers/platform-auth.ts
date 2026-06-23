import type { INestApplication } from "@nestjs/common";
import request from "supertest";

export interface PlatformLoginSession {
  accessToken: string;
  userId: string;
  platformRole: "SUPERADMIN";
  user: { id: string; email: string; name: string };
}

export async function loginAsPlatform(
  app: INestApplication,
  email = "platform@kloqra.dev",
  password = "password123"
): Promise<PlatformLoginSession> {
  const res = await request(app.getHttpServer())
    .post("/auth/login")
    .set("X-Auth-Scope", "platform")
    .send({ email, password });
  if (res.status !== 201) {
    throw new Error(
      `Platform login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`
    );
  }
  return {
    accessToken: res.body.accessToken,
    userId: res.body.user.id,
    platformRole: res.body.platformRole,
    user: res.body.user
  };
}

export function platformAuthedAgent(
  app: INestApplication,
  session: Pick<PlatformLoginSession, "accessToken">
) {
  const server = app.getHttpServer();
  return {
    get: (url: string) =>
      request(server)
        .get(url)
        .set("Authorization", `Bearer ${session.accessToken}`)
        .set("X-Auth-Scope", "platform"),
    post: (url: string) =>
      request(server)
        .post(url)
        .set("Authorization", `Bearer ${session.accessToken}`)
        .set("X-Auth-Scope", "platform"),
    patch: (url: string) =>
      request(server)
        .patch(url)
        .set("Authorization", `Bearer ${session.accessToken}`)
        .set("X-Auth-Scope", "platform"),
    delete: (url: string) =>
      request(server)
        .delete(url)
        .set("Authorization", `Bearer ${session.accessToken}`)
        .set("X-Auth-Scope", "platform")
  };
}
