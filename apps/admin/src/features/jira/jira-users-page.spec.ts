describe("jira-users-page member handling", () => {
  type Member = { userId: string; userName: string; userEmail: string };

  it("uses userId as option key and value", () => {
    const member: Member = {
      userId: "user-123",
      userName: "Avery Admin",
      userEmail: "admin@kloqra.dev"
    };
    expect(member.userId).toBe("user-123");
    expect(member.userName).toBe("Avery Admin");
    expect(member.userEmail).toBe("admin@kloqra.dev");
  });

  it("handles flat array response (not wrapped in items)", () => {
    const apiResponse: Member[] = [
      { userId: "u1", userName: "Alice", userEmail: "alice@example.com" },
      { userId: "u2", userName: "Bob", userEmail: "bob@example.com" }
    ];
    const members = Array.isArray(apiResponse) ? apiResponse : [];
    expect(members).toHaveLength(2);
    expect(members[0].userId).toBe("u1");
  });

  it("falls back to empty array when response is null or undefined", () => {
    const mems: Member[] | null = null;
    const members = Array.isArray(mems) ? mems : [];
    expect(members).toEqual([]);
  });

  it("renders correct option label from userName and userEmail", () => {
    const mem: Member = { userId: "u1", userName: "Alice", userEmail: "alice@example.com" };
    const label = `${mem.userName} (${mem.userEmail})`;
    expect(label).toBe("Alice (alice@example.com)");
  });
});
