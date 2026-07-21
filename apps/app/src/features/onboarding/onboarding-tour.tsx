"use client";

import { SpotlightTour, type SpotlightTourStep } from "@kloqra/ui";
import { useOnboardingStatus } from "./use-onboarding-status";

const STEPS: SpotlightTourStep[] = [
  {
    target: '[data-tour="nav-timer"]',
    title: "Your navigation hub",
    body: "The unified sidebar contains personal work and only the management areas you can use.",
    placement: "right"
  },
  {
    target: '[data-tour="nav-timer"]',
    title: "Timer",
    body: "Start and stop live tracking for assigned work.",
    placement: "right"
  },
  {
    target: '[data-tour="nav-time-tracker"]',
    title: "Time Tracker",
    body: "Review, filter, import, and export your own entries.",
    placement: "right"
  },
  {
    target: '[data-tour="nav-projects"]',
    title: "Projects",
    body: "See assigned work and management controls allowed by your capabilities.",
    placement: "right"
  },
  {
    target: '[data-tour="nav-submissions"]',
    title: "Submissions",
    body: "Submit your timesheets for review.",
    placement: "right"
  },
  {
    target: '[data-tour="onboarding-replay"]',
    title: "Replay anytime",
    body: "Open the help menu to replay setup or this tour.",
    placement: "bottom"
  }
];

export function OnboardingTour({
  open,
  replay = false,
  onOpenChange,
  onComplete
}: {
  open: boolean;
  replay?: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}) {
  const { markTourDone } = useOnboardingStatus();
  const finish = () => {
    if (!replay) void markTourDone();
    onOpenChange(false);
    onComplete?.();
  };
  return <SpotlightTour steps={STEPS} open={open} onComplete={finish} onSkip={finish} />;
}
