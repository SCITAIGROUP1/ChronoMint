"use client";

import { scopedStorageKey, useSessionStore, writeScopedJSON } from "@kloqra/web-shared";

export const ONBOARDING_WIZARD_DONE_KEY = "onboarding_done";
export const ONBOARDING_TOUR_DONE_KEY = "onboarding_tour_done";
const LEGACY_WIZARD_KEY = "kloqra_onboarding_done";
const LEGACY_TOUR_KEY = "kloqra_onboarding_tour_done";

function wizardKey(userId: string): string {
  return scopedStorageKey(ONBOARDING_WIZARD_DONE_KEY, { userId });
}

function tourKey(userId: string): string {
  return scopedStorageKey(ONBOARDING_TOUR_DONE_KEY, { userId });
}

function readLegacyFlag(key: string, scopedKey: string): boolean {
  const scoped = localStorage.getItem(scopedKey);
  if (scoped === "true") return true;
  const legacy = localStorage.getItem(key);
  if (legacy === "true") {
    localStorage.setItem(scopedKey, "true");
    localStorage.removeItem(key);
    return true;
  }
  return false;
}

export function isWizardDone(): boolean {
  if (typeof window === "undefined") return true;
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) return localStorage.getItem(LEGACY_WIZARD_KEY) === "true";
  return readLegacyFlag(LEGACY_WIZARD_KEY, wizardKey(userId));
}

export function markWizardDone(): void {
  if (typeof window === "undefined") return;
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) {
    localStorage.setItem(LEGACY_WIZARD_KEY, "true");
    return;
  }
  writeScopedJSON(wizardKey(userId), "true");
}

export function markTourDone(): void {
  if (typeof window === "undefined") return;
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) {
    localStorage.setItem(LEGACY_TOUR_KEY, "true");
    return;
  }
  writeScopedJSON(tourKey(userId), "true");
}
