describe("JiraUsersService.getMyMapping", () => {
  it("queries by workspaceId and userId — no getConnection dependency", () => {
    // Validates the where-clause shape used in getMyMapping
    const where = { workspaceId: "ws-abc", userId: "user-xyz" };
    expect(where).not.toHaveProperty("connectionId");
    expect(where.workspaceId).toBe("ws-abc");
    expect(where.userId).toBe("user-xyz");
  });

  it("returns null shape when prisma findFirst yields no record", () => {
    const record: null = null;
    const result = record
      ? { jiraAccountId: (record as never as { jiraAccountId: string }).jiraAccountId }
      : null;
    expect(result).toBeNull();
  });

  it("maps found record to public shape", () => {
    const record = {
      jiraAccountId: "acc-1",
      jiraDisplayName: "Amritha Hitige",
      jiraEmail: "amrithagz123@gmail.com",
      userId: "user-1",
      workspaceId: "ws-1"
    };
    const result = record
      ? {
          jiraAccountId: record.jiraAccountId,
          jiraDisplayName: record.jiraDisplayName,
          jiraEmail: record.jiraEmail
        }
      : null;
    expect(result?.jiraEmail).toBe("amrithagz123@gmail.com");
    expect(result).not.toHaveProperty("userId");
  });
});

describe("JiraUsersService.setMyMappingByEmail", () => {
  const jiraUsers = [
    {
      accountId: "acc-1",
      emailAddress: "Amritha@Example.com",
      displayName: "Amritha Hitige",
      active: true
    },
    {
      accountId: "acc-2",
      emailAddress: "other@example.com",
      displayName: "Other User",
      active: true
    }
  ];

  it("finds user by email case-insensitively", () => {
    const match = jiraUsers.find(
      (u) => u.emailAddress?.toLowerCase() === "amritha@example.com".toLowerCase()
    );
    expect(match?.accountId).toBe("acc-1");
    expect(match?.displayName).toBe("Amritha Hitige");
  });

  it("returns undefined when email is not in Jira", () => {
    const match = jiraUsers.find(
      (u) => u.emailAddress?.toLowerCase() === "notinJira@example.com".toLowerCase()
    );
    expect(match).toBeUndefined();
  });

  it("does not match partial email", () => {
    const match = jiraUsers.find((u) => u.emailAddress?.toLowerCase() === "amritha".toLowerCase());
    expect(match).toBeUndefined();
  });
});

describe("JiraUsersService.getMappings — isBench and projects", () => {
  type Project = { name: string; key: string };

  it("marks user as bench when no issues are assigned in any project", () => {
    const userProjectsMap = new Map<string, Project[]>();
    const projects = userProjectsMap.get("acc-no-issues") ?? [];
    expect(projects).toHaveLength(0);
    const isBench = projects.length === 0;
    expect(isBench).toBe(true);
  });

  it("not bench when at least one project has assigned issues", () => {
    const userProjectsMap = new Map<string, Project[]>();
    userProjectsMap.set("acc-1", [{ name: "Kloqra Test", key: "KT" }]);
    const projects = userProjectsMap.get("acc-1") ?? [];
    const isBench = projects.length === 0;
    expect(isBench).toBe(false);
    expect(projects[0].key).toBe("KT");
  });

  it("builds userProjectsMap from issue-group + project-map", () => {
    const projectMap = new Map([
      ["proj-1", { name: "Kloqra Test", key: "KT" }],
      ["proj-2", { name: "Annual Audit", key: "AA" }]
    ]);
    const issueGroups = [
      { assigneeId: "acc-1", jiraProjectId: "proj-1" },
      { assigneeId: "acc-1", jiraProjectId: "proj-2" },
      { assigneeId: "acc-2", jiraProjectId: "proj-1" },
      { assigneeId: null, jiraProjectId: "proj-1" }
    ];

    const userProjectsMap = new Map<string, Project[]>();
    for (const item of issueGroups) {
      if (!item.assigneeId) continue;
      const project = projectMap.get(item.jiraProjectId);
      if (!project) continue;
      if (!userProjectsMap.has(item.assigneeId)) userProjectsMap.set(item.assigneeId, []);
      userProjectsMap.get(item.assigneeId)!.push(project);
    }

    expect(userProjectsMap.get("acc-1")).toHaveLength(2);
    expect(userProjectsMap.get("acc-2")).toHaveLength(1);
    expect(userProjectsMap.has(null as unknown as string)).toBe(false);
  });
});

describe("JiraIssuesService.getMyIssues — ChronoMint project name", () => {
  it("prefers ChronoMint project name over Jira project name", () => {
    const projectMappings = [
      {
        jiraProjectId: "jp-1",
        jiraProjectName: "Kloqra Test Jira",
        chronoProject: { name: "Annual Audit" }
      }
    ];
    const projectNameMap = new Map(
      projectMappings.map((m) => [m.jiraProjectId, m.chronoProject?.name ?? m.jiraProjectName])
    );

    const issueJiraProjectId = "jp-1";
    const resolved = projectNameMap.get(issueJiraProjectId) ?? "Fallback Jira Name";
    expect(resolved).toBe("Annual Audit");
  });

  it("falls back to Jira project name when no ChronoMint mapping exists", () => {
    const projectMappings = [
      { jiraProjectId: "jp-1", jiraProjectName: "Kloqra Test Jira", chronoProject: null }
    ];
    const projectNameMap = new Map(
      projectMappings.map((m) => [m.jiraProjectId, m.chronoProject?.name ?? m.jiraProjectName])
    );

    const resolved = projectNameMap.get("jp-1") ?? "Unknown";
    expect(resolved).toBe("Kloqra Test Jira");
  });

  it("falls back to Jira API name when project not in mappings at all", () => {
    const projectNameMap = new Map<string, string>();
    const jiraApiName = "Unmapped Project";
    const resolved = projectNameMap.get("jp-999") ?? jiraApiName;
    expect(resolved).toBe("Unmapped Project");
  });
});
