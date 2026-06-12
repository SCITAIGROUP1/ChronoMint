import { JiraApiService } from "./jira-api.service";

describe("JiraApiService.getIssues", () => {
  const mockReq = jest.fn();

  const service = {
    getIssues: JiraApiService.prototype.getIssues,
    req: mockReq
  } as unknown as JiraApiService;

  beforeEach(() => mockReq.mockReset());

  it("calls POST /search/jql with jql and fields in body", async () => {
    mockReq.mockResolvedValue({ issues: [], nextPageToken: undefined });
    await service.getIssues("ws-1", { projectKey: "SCRUM" });
    expect(mockReq).toHaveBeenCalledWith(
      "ws-1",
      "/search/jql",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(mockReq.mock.calls[0][2].body as string);
    expect(body.jql).toBe('project = "SCRUM"');
    expect(Array.isArray(body.fields)).toBe(true);
    expect(body).not.toHaveProperty("startAt");
  });

  it("includes nextPageToken in body when provided", async () => {
    mockReq.mockResolvedValue({ issues: [], nextPageToken: undefined });
    await service.getIssues("ws-1", { nextPageToken: "token-abc" });
    const body = JSON.parse(mockReq.mock.calls[0][2].body as string);
    expect(body.nextPageToken).toBe("token-abc");
  });

  it("omits nextPageToken from body when not provided", async () => {
    mockReq.mockResolvedValue({ issues: [], nextPageToken: undefined });
    await service.getIssues("ws-1", {});
    const body = JSON.parse(mockReq.mock.calls[0][2].body as string);
    expect(body).not.toHaveProperty("nextPageToken");
  });

  it("builds jql with multiple filters joined by AND", async () => {
    mockReq.mockResolvedValue({ issues: [] });
    await service.getIssues("ws-1", {
      projectKey: "SCRUM",
      assigneeAccountId: "user-1",
      status: "In Progress"
    });
    const body = JSON.parse(mockReq.mock.calls[0][2].body as string);
    expect(body.jql).toContain("project");
    expect(body.jql).toContain("assignee");
    expect(body.jql).toContain("status");
    expect(body.jql).toContain(" AND ");
  });

  it("uses default ORDER BY when no filters given", async () => {
    mockReq.mockResolvedValue({ issues: [] });
    await service.getIssues("ws-1", {});
    const body = JSON.parse(mockReq.mock.calls[0][2].body as string);
    expect(body.jql).toBe("ORDER BY updated DESC");
  });

  it("uses maxResults from opts", async () => {
    mockReq.mockResolvedValue({ issues: [] });
    await service.getIssues("ws-1", { maxResults: 25 });
    const body = JSON.parse(mockReq.mock.calls[0][2].body as string);
    expect(body.maxResults).toBe(25);
  });
});
