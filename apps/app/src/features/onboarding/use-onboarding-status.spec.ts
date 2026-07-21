/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboardingStatus } from "./use-onboarding-status";

const updatePreferences = vi.fn();
const profile = { preferences: {} as Record<string, unknown> };
vi.mock("@kloqra/web-shared", () => ({
  useUserProfile: () => ({ profile, loading: false, updatePreferences })
}));

describe("useOnboardingStatus", () => {
  beforeEach(() => {
    localStorage.clear();
    profile.preferences = {};
    updatePreferences.mockReset();
    updatePreferences.mockResolvedValue(undefined);
  });

  it("persists completion in self-scoped user preferences", async () => {
    const { result } = renderHook(() => useOnboardingStatus());
    await result.current.markWizardDone();
    expect(updatePreferences).toHaveBeenCalledWith({ onboardingWizardDone: true });
  });

  it("migrates the legacy browser completion flag", async () => {
    localStorage.setItem("kloqra_onboarding_done", "true");
    renderHook(() => useOnboardingStatus());
    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith({ onboardingWizardDone: true })
    );
    expect(localStorage.getItem("kloqra_onboarding_done")).toBeNull();
  });
});
