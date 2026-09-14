import {
  CalendarDays,
  ClipboardCheck,
  Clock,
  FolderKanban,
  LayoutGrid,
  Sparkles,
  Timer,
  type LucideIcon
} from "lucide-react";

export type OnboardingStepId =
  | "welcome"
  | "workspace"
  | "track-time"
  | "projects-dashboard"
  | "finish";
export type OnboardingFeatureCardData = {
  icon: LucideIcon;
  title: string;
  description: string;
  route?: string;
};

export const ONBOARDING_STEP_IDS: OnboardingStepId[] = [
  "welcome",
  "workspace",
  "track-time",
  "projects-dashboard",
  "finish"
];
export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEP_IDS.length;
export const getStepNumber = (stepId: OnboardingStepId) => ONBOARDING_STEP_IDS.indexOf(stepId) + 1;

export function getStepTitle(stepId: OnboardingStepId, userName: string, isAdmin: boolean) {
  if (stepId === "welcome") return `Welcome to Kloqra, ${userName}!`;
  if (stepId === "workspace")
    return isAdmin ? "Manage your workspace projects" : "Your assigned projects";
  if (stepId === "track-time") return "Three ways to track time";
  if (stepId === "projects-dashboard") return "Projects & dashboard";
  return "You're almost ready!";
}

export const TRACK_TIME_CARDS: OnboardingFeatureCardData[] = [
  { icon: Timer, title: "Timer", description: "Track active work live.", route: "/timer" },
  {
    icon: Clock,
    title: "Time Tracker",
    description: "Review, filter, import, and export your entries.",
    route: "/time-tracker"
  },
  {
    icon: CalendarDays,
    title: "Timesheet",
    description: "Plan and edit entries in a calendar.",
    route: "/timesheet"
  }
];
export const PROJECTS_DASHBOARD_CARDS: OnboardingFeatureCardData[] = [
  {
    icon: FolderKanban,
    title: "My projects",
    description: "Open work assigned to you or projects you manage.",
    route: "/projects"
  },
  {
    icon: LayoutGrid,
    title: "Dashboard",
    description: "See a personalized view based on your capabilities.",
    route: "/dashboard"
  }
];
export const FINISH_HIGHLIGHTS = [
  { icon: ClipboardCheck, text: "Submit timesheets when your workspace requires approval." },
  { icon: Sparkles, text: "Replay this guide from the help menu at any time." }
];
