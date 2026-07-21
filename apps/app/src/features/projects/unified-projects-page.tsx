"use client";

import { PersonalProjectsPage } from "./personal-projects-page";
import { ProjectsListPage } from "./projects-list-page";
import { resolveProjectsExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

export function UnifiedProjectsPage() {
  const session = useSessionStore((state) => state.session);
  if (!session) return null;

  const experience = resolveProjectsExperience(session);
  if (experience.mode === "personal") return <PersonalProjectsPage />;

  return (
    <ProjectsListPage
      managedProjectIds={experience.mode === "managed" ? experience.managedProjectIds : undefined}
      canCreate={experience.mode === "workspace"}
    />
  );
}
