"use client";

import {
  isOnboardingTourDone,
  isOnboardingWizardDone,
  type UserPreferences
} from "@kloqra/contracts";
import { useUserProfile } from "@kloqra/web-shared";
import { useCallback, useEffect, useMemo, useRef } from "react";

const LEGACY_WIZARD_KEY = "kloqra_onboarding_done";
const LEGACY_TOUR_KEY = "kloqra_onboarding_tour_done";

function legacyDone(key: string) {
  return typeof window !== "undefined" && localStorage.getItem(key) === "true";
}
function clearLegacy() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_WIZARD_KEY);
  localStorage.removeItem(LEGACY_TOUR_KEY);
}

export function useOnboardingStatus() {
  const { profile, loading, updatePreferences } = useUserProfile();
  const migrated = useRef(false);
  const preferences = useMemo(
    () => profile?.preferences ?? ({} as UserPreferences),
    [profile?.preferences]
  );
  const wizardDone = isOnboardingWizardDone(preferences) || legacyDone(LEGACY_WIZARD_KEY);
  const tourDone = isOnboardingTourDone(preferences) || legacyDone(LEGACY_TOUR_KEY);

  useEffect(() => {
    if (loading || !profile || migrated.current) return;
    const legacyWizard = legacyDone(LEGACY_WIZARD_KEY);
    const legacyTour = legacyDone(LEGACY_TOUR_KEY);
    if (!legacyWizard && !legacyTour) return;
    migrated.current = true;
    clearLegacy();
    void updatePreferences({
      ...(legacyWizard ? { onboardingWizardDone: true } : {}),
      ...(legacyTour ? { onboardingTourDone: true } : {})
    });
  }, [loading, profile, updatePreferences]);

  const markWizardDone = useCallback(async () => {
    clearLegacy();
    if (!isOnboardingWizardDone(preferences))
      await updatePreferences({ onboardingWizardDone: true });
  }, [preferences, updatePreferences]);
  const markTourDone = useCallback(async () => {
    clearLegacy();
    if (!isOnboardingTourDone(preferences)) await updatePreferences({ onboardingTourDone: true });
  }, [preferences, updatePreferences]);

  return { profileLoading: loading, wizardDone, tourDone, markWizardDone, markTourDone };
}
