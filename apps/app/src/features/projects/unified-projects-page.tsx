"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProjectsListPage } from "./projects-list-page";
import { resolveProjectsExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

/** Workspace Projects — admin / project-manager team project list. Personal list lives under /my-projects. */
export function UnifiedProjectsPage() {
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const experience = session ? resolveProjectsExperience(session) : null;

  useEffect(() => {
    if (experience?.mode === "personal") {
      router.replace("/my-projects");
    }
  }, [experience?.mode, router]);

  if (!session || !experience) return null;
  if (experience.mode === "personal") return null;

  return (
    <ProjectsListPage
      managedProjectIds={experience.mode === "managed" ? experience.managedProjectIds : undefined}
      canCreate={experience.mode === "workspace"}
    />
  );
}
