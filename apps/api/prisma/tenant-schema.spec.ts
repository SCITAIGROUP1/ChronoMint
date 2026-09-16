import { describe, expect, it } from "vitest";
import { Prisma } from "./generated/client";

describe("tenant prisma schema", () => {
  it("includes Tenant and TenantMember models", () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);
    expect(modelNames).toContain("Tenant");
    expect(modelNames).toContain("TenantMember");
  });

  it("Workspace model includes required tenantId FK", () => {
    const workspace = Prisma.dmmf.datamodel.models.find((m) => m.name === "Workspace");
    const tenantId = workspace?.fields.find((f) => f.name === "tenantId");
    expect(tenantId).toBeDefined();
    expect(tenantId?.isRequired).toBe(true);
  });

  it("TenantMember enforces one row per user", () => {
    const tenantMember = Prisma.dmmf.datamodel.models.find((m) => m.name === "TenantMember");
    const userIdField = tenantMember?.fields.find((f) => f.name === "userId");
    expect(userIdField?.isUnique).toBe(true);
  });

  it("includes Plan and TenantSubscription models", () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);
    expect(modelNames).toContain("Plan");
    expect(modelNames).toContain("TenantSubscription");
  });

  it("includes TenantHoliday and TenantActivityType models", () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);
    expect(modelNames).toContain("TenantHoliday");
    expect(modelNames).toContain("TenantActivityType");
  });

  it("TenantActivityType can nest under a parent activity", () => {
    const activityType = Prisma.dmmf.datamodel.models.find((m) => m.name === "TenantActivityType");
    const parentId = activityType?.fields.find((f) => f.name === "parentId");
    expect(parentId?.isRequired).toBe(false);
  });

  it("TimeLog allows nullable taskId and classification for non-project time", () => {
    const timeLog = Prisma.dmmf.datamodel.models.find((m) => m.name === "TimeLog");
    const taskId = timeLog?.fields.find((f) => f.name === "taskId");
    const classification = timeLog?.fields.find((f) => f.name === "classification");
    const tenantId = timeLog?.fields.find((f) => f.name === "tenantId");
    expect(taskId?.isRequired).toBe(false);
    expect(classification?.isRequired).toBe(true);
    expect(tenantId?.isRequired).toBe(false);
  });
});
