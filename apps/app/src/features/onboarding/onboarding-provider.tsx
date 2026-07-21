"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { OnboardingOverlay } from "./onboarding-overlay";
import { OnboardingTour } from "./onboarding-tour";

type OnboardingContextValue = {
  openOnboarding: (options?: { replay?: boolean; tourOnly?: boolean }) => void;
  openTour: (options?: { replay?: boolean }) => void;
};
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [wizardOpen, setWizardOpen] = useState<boolean | undefined>();
  const [tourOpen, setTourOpen] = useState(false);
  const [replay, setReplay] = useState(false);
  const openTour = useCallback((options?: { replay?: boolean }) => {
    setReplay(Boolean(options?.replay));
    setTourOpen(true);
  }, []);
  const openOnboarding = useCallback((options?: { replay?: boolean; tourOnly?: boolean }) => {
    setReplay(Boolean(options?.replay));
    if (options?.tourOnly) setTourOpen(true);
    else setWizardOpen(true);
  }, []);
  const value = useMemo(() => ({ openOnboarding, openTour }), [openOnboarding, openTour]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <OnboardingOverlay
        forceOpen={wizardOpen}
        replay={replay}
        onOpenChange={setWizardOpen}
        onComplete={({ startTour }) => {
          setWizardOpen(false);
          if (pathname !== "/timer") router.push("/timer");
          if (startTour) window.setTimeout(() => setTourOpen(true), 150);
        }}
      />
      <OnboardingTour
        open={tourOpen}
        replay={replay}
        onOpenChange={setTourOpen}
        onComplete={() => {
          if (!replay && pathname !== "/timer") router.push("/timer");
        }}
      />
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
  return context;
}
