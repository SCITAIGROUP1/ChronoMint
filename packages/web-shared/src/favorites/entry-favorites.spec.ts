/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  buildTaskSelectGroups,
  emptyEntryFavorites,
  MAX_FAVORITE_PROJECTS,
  MAX_FAVORITE_TASKS,
  normalizeEntryFavorites,
  prioritizeByFavoriteIds,
  readEntryFavorites,
  toggleFavoriteProject,
  toggleFavoriteTask,
  writeEntryFavorites
} from "./entry-favorites";

afterEach(() => {
  localStorage.clear();
});

describe("normalizeEntryFavorites", () => {
  it("migrates v1 task-pair array and derives project ids", () => {
    const normalized = normalizeEntryFavorites([
      {
        projectId: "p1",
        taskId: "t1",
        projectName: "Alpha",
        taskName: "Design",
        projectColor: "#111"
      },
      {
        projectId: "p2",
        taskId: "t2",
        projectName: "Beta",
        taskName: "Build",
        projectColor: "#222"
      }
    ]);

    expect(normalized.version).toBe(2);
    expect(normalized.tasks.map((t) => t.taskId)).toEqual(["t1", "t2"]);
    expect(normalized.projects).toEqual(["p1", "p2"]);
  });

  it("reads v2 objects", () => {
    const normalized = normalizeEntryFavorites({
      version: 2,
      projects: ["p9"],
      tasks: [{ projectId: "p9", taskId: "t9" }]
    });
    expect(normalized.projects).toEqual(["p9"]);
    expect(normalized.tasks).toEqual([{ projectId: "p9", taskId: "t9" }]);
  });

  it("returns empty for invalid input", () => {
    expect(normalizeEntryFavorites(null)).toEqual(emptyEntryFavorites());
    expect(normalizeEntryFavorites("nope")).toEqual(emptyEntryFavorites());
  });
});

describe("toggleFavoriteProject / toggleFavoriteTask", () => {
  it("adds and removes projects with FIFO cap", () => {
    let favs = emptyEntryFavorites();
    for (let i = 1; i <= MAX_FAVORITE_PROJECTS + 1; i++) {
      favs = toggleFavoriteProject(favs, `p${i}`);
    }
    expect(favs.projects).toHaveLength(MAX_FAVORITE_PROJECTS);
    expect(favs.projects[0]).toBe("p2");
    expect(favs.projects.at(-1)).toBe(`p${MAX_FAVORITE_PROJECTS + 1}`);

    favs = toggleFavoriteProject(favs, "p2");
    expect(favs.projects).not.toContain("p2");
  });

  it("adds and removes tasks with FIFO cap", () => {
    let favs = emptyEntryFavorites();
    for (let i = 1; i <= MAX_FAVORITE_TASKS + 1; i++) {
      favs = toggleFavoriteTask(favs, { projectId: "p1", taskId: `t${i}`, taskName: `Task ${i}` });
    }
    expect(favs.tasks).toHaveLength(MAX_FAVORITE_TASKS);
    expect(favs.tasks[0]?.taskId).toBe("t2");
    expect(favs.tasks.at(-1)?.taskId).toBe(`t${MAX_FAVORITE_TASKS + 1}`);

    favs = toggleFavoriteTask(favs, { projectId: "p1", taskId: "t2" });
    expect(favs.tasks.map((t) => t.taskId)).not.toContain("t2");
  });
});

describe("prioritizeByFavoriteIds", () => {
  it("moves favorites to the front in favorite order", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    expect(prioritizeByFavoriteIds(items, ["c", "a"]).map((i) => i.id)).toEqual([
      "c",
      "a",
      "b",
      "d"
    ]);
  });
});

describe("buildTaskSelectGroups", () => {
  it("prepends a Favorites group then category groups for the rest", () => {
    const tasks = [
      { id: "t1", taskName: "Alpha", categoryName: "Dev" },
      { id: "t2", taskName: "Beta", categoryName: "Design" },
      { id: "t3", taskName: "Gamma", categoryName: "Dev" }
    ];
    const groups = buildTaskSelectGroups(tasks, ["t3", "t2"]);
    expect(groups[0]).toEqual({
      label: "Favorites",
      options: [
        { value: "t3", label: "Gamma" },
        { value: "t2", label: "Beta" }
      ]
    });
    expect(groups.slice(1).map((g) => g.label)).toEqual(["Dev"]);
    expect(groups[1]?.options).toEqual([{ value: "t1", label: "Alpha" }]);
  });

  it("omits Favorites group when none apply", () => {
    const groups = buildTaskSelectGroups(
      [{ id: "t1", taskName: "Alpha", categoryName: "Dev" }],
      ["missing"]
    );
    expect(groups.map((g) => g.label)).toEqual(["Dev"]);
  });
});

describe("readEntryFavorites / writeEntryFavorites", () => {
  it("migrates legacy v1 storage on read and persists v2", () => {
    localStorage.setItem(
      "kloqra:app:user-1:favorites",
      JSON.stringify([{ projectId: "p1", taskId: "t1", projectName: "P", taskName: "T" }])
    );

    const favs = readEntryFavorites("user-1");
    expect(favs.version).toBe(2);
    expect(favs.tasks[0]?.taskId).toBe("t1");
    expect(favs.projects).toEqual(["p1"]);

    const stored = JSON.parse(localStorage.getItem("kloqra:app:user-1:favorites")!);
    expect(stored.version).toBe(2);
  });

  it("round-trips v2 writes", () => {
    writeEntryFavorites("user-2", {
      version: 2,
      projects: ["p1"],
      tasks: [{ projectId: "p1", taskId: "t1", taskName: "T" }]
    });
    expect(readEntryFavorites("user-2")).toEqual({
      version: 2,
      projects: ["p1"],
      tasks: [{ projectId: "p1", taskId: "t1", taskName: "T" }]
    });
  });
});

describe("toImportFavoritesPayload", () => {
  it("filters non-uuid ids before import", async () => {
    const { toImportFavoritesPayload } = await import("./entry-favorites");
    const payload = toImportFavoritesPayload({
      version: 2,
      projects: ["proj-local", "550e8400-e29b-41d4-a716-446655440000"],
      tasks: [
        { projectId: "proj-local", taskId: "task-local" },
        {
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          taskId: "550e8400-e29b-41d4-a716-446655440001"
        }
      ]
    });
    expect(payload.projects).toEqual(["550e8400-e29b-41d4-a716-446655440000"]);
    expect(payload.tasks).toEqual([
      {
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        taskId: "550e8400-e29b-41d4-a716-446655440001"
      }
    ]);
  });
});
