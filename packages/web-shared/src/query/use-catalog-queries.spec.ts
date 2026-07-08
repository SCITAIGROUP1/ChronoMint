/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { catalogQueryKeys } from "./catalog-query-keys";

describe("catalogQueryKeys", () => {
  it("builds distinct keys per workspace and catalog type", () => {
    const ws = "ws-1";
    expect(catalogQueryKeys.projects(ws)).toEqual(["catalog", ws, "projects"]);
    expect(catalogQueryKeys.categories(ws)).toEqual(["catalog", ws, "categories"]);
    expect(catalogQueryKeys.tasks(ws)).toEqual(["catalog", ws, "tasks", ""]);
    expect(catalogQueryKeys.tasks(ws, "projectId=p-1")).toEqual([
      "catalog",
      ws,
      "tasks",
      "projectId=p-1"
    ]);
    expect(catalogQueryKeys.projects(ws)).not.toEqual(catalogQueryKeys.categories(ws));
  });
});
