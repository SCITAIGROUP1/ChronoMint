import { describe, expect, it } from "vitest";
import {
  buildProjectDetailNavItems,
  isMyProjectsListSource,
  projectDetailSectionHref,
  projectListHref,
  projectsListBackHref,
  projectsListBackLabel,
  resolveProjectDetailSection,
  resolveProjectListSource
} from "./project-detail-nav";

describe("project-detail-nav", () => {
  it("builds section hrefs for a project", () => {
    expect(buildProjectDetailNavItems("proj-1")).toEqual([
      expect.objectContaining({ id: "overview", href: "/projects/proj-1/overview" }),
      expect.objectContaining({ id: "tasks", href: "/projects/proj-1/tasks" }),
      expect.objectContaining({ id: "team", href: "/projects/proj-1/team" }),
      expect.objectContaining({ id: "settings", href: "/projects/proj-1/settings" })
    ]);
  });

  it("links project list rows to the overview tab", () => {
    expect(projectListHref("proj-1")).toBe("/projects/proj-1/overview");
    expect(projectListHref("proj-1", { from: "my-projects" })).toBe(
      "/projects/proj-1/overview?from=my-projects"
    );
  });

  it("preserves My Projects source on section links and back navigation", () => {
    expect(projectDetailSectionHref("proj-1", "tasks", "my-projects")).toBe(
      "/projects/proj-1/tasks?from=my-projects"
    );
    expect(resolveProjectListSource("my-projects")).toBe("my-projects");
    expect(resolveProjectListSource(null, "my-projects")).toBe("my-projects");
    expect(resolveProjectListSource(null, "projects")).toBe("projects");
    expect(isMyProjectsListSource("my-projects")).toBe(true);
    expect(isMyProjectsListSource("projects")).toBe(false);
    expect(projectsListBackHref("my-projects")).toBe("/my-projects");
    expect(projectsListBackHref("projects")).toBe("/projects");
    expect(projectsListBackLabel("my-projects")).toBe("My Projects");
    expect(projectsListBackLabel("projects")).toBe("Projects");
  });

  it("omits mutation settings from personal project navigation", () => {
    expect(
      buildProjectDetailNavItems("proj-1", { includeSettings: false }).map((item) => item.id)
    ).toEqual(["overview", "tasks", "team"]);
  });

  it("maps paths to section ids", () => {
    expect(resolveProjectDetailSection("/projects/x/overview")).toBe("overview");
    expect(resolveProjectDetailSection("/projects/x/tasks")).toBe("tasks");
    expect(resolveProjectDetailSection("/projects/x/team")).toBe("team");
    expect(resolveProjectDetailSection("/projects/x/settings")).toBe("settings");
  });
});
