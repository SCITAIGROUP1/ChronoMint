import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DailyGoalWidget } from "./daily-goal-widget";

vi.mock("@kloqra/web-shared", () => ({
  useUserProfile: () => ({
    profile: {
      effectiveDailyTargetHours: 8,
      preferences: { dailyTargetHours: 8 }
    },
    updatePreferences: vi.fn()
  }),
  toDateKeyInZone: () => "2026-09-10"
}));

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (s: { session: null }) => unknown) => selector({ session: null }),
  getWorkspaceId: () => "ws-1"
}));

vi.mock("./gamification-utils", () => ({
  calculateDailyStreak: () => 0,
  checkMilestones: () => [],
  getDailyTotals: () => ({})
}));

describe("DailyGoalWidget", () => {
  it("scales to the container instead of using a fixed ring size when cardless", () => {
    const html = renderToStaticMarkup(
      <DailyGoalWidget totalSeconds={0} cardless logs={[]} timezone="UTC" />
    );
    expect(html).toContain("viewBox");
    expect(html).toContain("h-full");
    expect(html).toContain("overflow-hidden");
    expect(html).not.toContain('width="110"');
    expect(html).not.toContain('height="110"');
  });
});
