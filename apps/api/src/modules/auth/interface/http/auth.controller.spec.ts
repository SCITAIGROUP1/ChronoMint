import { ROUTES } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { AuthController } from "./auth.controller";

describe("AuthController invite handoff throttle", () => {
  it("exposes invite-handoff on the expected route", () => {
    expect(ROUTES.AUTH.INVITE_HANDOFF).toBe("/auth/invite-handoff");
    expect(typeof AuthController.prototype.inviteHandoff).toBe("function");
  });
});
