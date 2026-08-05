"use client";

import { EmptyState, Button } from "@kloqra/ui";
import Link from "next/link";
import { AdminTimeTrackerPage } from "./time-tracker-page";
import { resolveTimeTrackerExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

/** Workspace-side team reporting Time Tracker (admin / project manager). */
export function TeamTimeTrackerPage() {
  const session = useSessionStore((state) => state.session);
  if (!session) return null;

  const experience = resolveTimeTrackerExperience(session);
  if (experience.mode === "personal") {
    return (
      <EmptyState
        title="No team time reporting here"
        description="Your personal entries live under Time Tracker in My time."
        action={
          <Button asChild size="sm">
            <Link href="/time-tracker">Go to Time Tracker</Link>
          </Button>
        }
      />
    );
  }

  return (
    <AdminTimeTrackerPage
      managedProjectIds={experience.mode === "managed" ? experience.managedProjectIds : undefined}
    />
  );
}
