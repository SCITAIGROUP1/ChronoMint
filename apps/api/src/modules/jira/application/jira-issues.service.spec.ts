describe("JiraIssuesService syncIssues pagination", () => {
  it("stops pagination when nextPageToken is absent", () => {
    const responses = [{ issues: [{ id: "1" }], nextPageToken: undefined }];
    let page = 0;
    let nextPageToken: string | undefined;
    const pages: string[][] = [];

    while (true) {
      const data = responses[page++] ?? { issues: [], nextPageToken: undefined };
      pages.push(data.issues.map((i) => i.id));
      if (!data.nextPageToken || data.issues.length === 0) break;
      nextPageToken = data.nextPageToken;
    }

    expect(pages).toHaveLength(1);
    expect(nextPageToken).toBeUndefined();
  });

  it("continues pagination while nextPageToken is present", () => {
    const responses = [
      { issues: [{ id: "1" }, { id: "2" }], nextPageToken: "page2" },
      { issues: [{ id: "3" }], nextPageToken: undefined }
    ];
    let page = 0;
    let nextPageToken: string | undefined;
    const allIds: string[] = [];

    while (true) {
      const data = responses[page++] ?? { issues: [], nextPageToken: undefined };
      allIds.push(...data.issues.map((i) => i.id));
      if (!data.nextPageToken || data.issues.length === 0) break;
      nextPageToken = data.nextPageToken;
    }

    expect(allIds).toEqual(["1", "2", "3"]);
    expect(nextPageToken).toBe("page2");
  });

  it("stops when issues array is empty even if nextPageToken exists", () => {
    const responses = [{ issues: [], nextPageToken: "phantom" }];
    let page = 0;
    const allIds: string[] = [];

    while (true) {
      const data = responses[page++] ?? { issues: [], nextPageToken: undefined };
      allIds.push(...data.issues.map((i: { id: string }) => i.id));
      if (!data.nextPageToken || data.issues.length === 0) break;
    }

    expect(allIds).toHaveLength(0);
  });
});
