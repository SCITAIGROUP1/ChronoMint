import { describe, expect, it } from "vitest";
import {
  SEED_EMAIL_DOMAIN,
  SEED_PLANS,
  SEED_TENANT,
  SEED_TENANT_SUBSCRIPTION,
  SEED_USERS,
  SEED_WORKSPACES
} from "./seed-data";

describe("seed-data", () => {
  it("uses kloqra.dev for all demo accounts", () => {
    for (const user of SEED_USERS) {
      expect(user.email.endsWith(`@${SEED_EMAIL_DOMAIN}`)).toBe(true);
    }
  });

  it("defines one demo organization with three workspaces", () => {
    expect(SEED_TENANT.slug).toBe("kloqra-demo");
    expect(SEED_TENANT.status).toBe("active");
    expect(SEED_WORKSPACES.map((ws) => ws.slug)).toEqual(["acme", "meridian", "apex"]);
  });

  it("assigns tenant owner and tenant admin at organization level", () => {
    expect(SEED_TENANT.members.map((m) => m.email)).toEqual(["admin@kloqra.dev", "ops@kloqra.dev"]);
    expect(SEED_TENANT.members[0]?.role).toBe("OWNER");
    expect(SEED_TENANT.members[1]?.role).toBe("ADMIN");
  });

  it("includes Acme Corporation as the primary demo workspace", () => {
    expect(SEED_WORKSPACES[0]?.name).toBe("Acme Corporation");
    expect(SEED_WORKSPACES[0]?.slug).toBe("acme");
  });

  it("defines pilot, starter, and pro catalog plans", () => {
    expect(SEED_PLANS.map((p) => p.slug)).toEqual(["pilot", "starter", "pro"]);
    expect(SEED_TENANT_SUBSCRIPTION.planSlug).toBe("pilot");
    expect(SEED_TENANT_SUBSCRIPTION.status).toBe("active");
  });
});
