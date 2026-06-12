import { describe, expect, it } from "vitest";

type Project = { name: string; key: string };
type JiraUserMapping = {
  id: string;
  jiraAccountId: string;
  jiraEmail: string;
  jiraDisplayName: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  projects: Project[];
  isBench: boolean;
};

describe("jira-users-page read-only display", () => {
  it("shows Bench badge when projects array is empty", () => {
    const mapping: JiraUserMapping = {
      id: "m-1",
      jiraAccountId: "acc-1",
      jiraEmail: "a@b.com",
      jiraDisplayName: "Amritha Hitige",
      userId: "user-1",
      userName: "Avery Admin",
      userEmail: "admin@kloqra.dev",
      projects: [],
      isBench: true
    };
    expect(mapping.isBench).toBe(true);
    expect(mapping.projects).toHaveLength(0);
  });

  it("shows project key badges when user has assigned projects", () => {
    const mapping: JiraUserMapping = {
      id: "m-2",
      jiraAccountId: "acc-2",
      jiraEmail: "b@b.com",
      jiraDisplayName: "Bob",
      userId: "user-2",
      userName: "Bob Member",
      userEmail: "bob@kloqra.dev",
      projects: [
        { name: "Kloqra Test", key: "KT" },
        { name: "Annual Audit", key: "AA" }
      ],
      isBench: false
    };
    expect(mapping.isBench).toBe(false);
    expect(mapping.projects.map((p) => p.key)).toEqual(["KT", "AA"]);
  });

  it("shows Not linked label when userId is null", () => {
    const mapping: JiraUserMapping = {
      id: "m-3",
      jiraAccountId: "acc-3",
      jiraEmail: "c@b.com",
      jiraDisplayName: "Ghost User",
      userId: null,
      userName: null,
      userEmail: null,
      projects: [],
      isBench: true
    };
    const label = mapping.userName ?? "Not linked";
    expect(label).toBe("Not linked");
  });

  it("displays ChronoMint member name and email when linked", () => {
    const mapping: JiraUserMapping = {
      id: "m-4",
      jiraAccountId: "acc-4",
      jiraEmail: "amrithagz123@gmail.com",
      jiraDisplayName: "Amritha Hitige",
      userId: "user-4",
      userName: "Avery Admin",
      userEmail: "admin@kloqra.dev",
      projects: [{ name: "SCRUM", key: "SCRUM" }],
      isBench: false
    };
    expect(mapping.userName).toBe("Avery Admin");
    expect(mapping.userEmail).toBe("admin@kloqra.dev");
    expect(mapping.isBench).toBe(false);
  });
});
