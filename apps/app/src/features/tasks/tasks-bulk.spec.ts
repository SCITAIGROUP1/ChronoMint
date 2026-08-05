import { ROUTES } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { notifyTaskImportResult } from "./tasks-import-modal";

describe("Tasks bulk routes", () => {
  it("exposes task bulk template, upload, and export endpoints", () => {
    expect(ROUTES.TASKS.BULK_TEMPLATE).toBe("/tasks/bulk/template");
    expect(ROUTES.TASKS.BULK_UPLOAD).toBe("/tasks/bulk/upload");
    expect(ROUTES.TASKS.EXPORT).toBe("/tasks/export");
  });
});

describe("notifyTaskImportResult", () => {
  it("is exported for import modal result toasts", () => {
    expect(typeof notifyTaskImportResult).toBe("function");
  });
});
