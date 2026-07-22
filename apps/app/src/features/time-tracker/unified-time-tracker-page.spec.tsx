// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnifiedTimeTrackerPage } from "./unified-time-tracker-page";

vi.mock("./personal-time-tracker-page", () => ({
  PersonalTimeTrackerPage: () => <div>Personal time tracker with entry import export</div>
}));

describe("UnifiedTimeTrackerPage", () => {
  afterEach(cleanup);

  it("always renders the personal tracker with entry and import/export", () => {
    render(<UnifiedTimeTrackerPage />);
    expect(screen.getByText("Personal time tracker with entry import export")).toBeTruthy();
  });
});
