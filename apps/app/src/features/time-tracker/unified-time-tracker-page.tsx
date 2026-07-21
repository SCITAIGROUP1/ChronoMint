"use client";

import { PersonalTimeTrackerPage } from "./personal-time-tracker-page";
import { AdminTimeTrackerPage } from "./time-tracker-page";
import { resolveTimeTrackerExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

export function UnifiedTimeTrackerPage() {
  const session = useSessionStore((state) => state.session);
  if (!session) return null;
  const experience = resolveTimeTrackerExperience(session);

  if (experience.mode === "personal") {
    return <PersonalTimeTrackerPage />;
  }

  return (
    <AdminTimeTrackerPage
      managedProjectIds={experience.mode === "managed" ? experience.managedProjectIds : undefined}
    />
  );
}
