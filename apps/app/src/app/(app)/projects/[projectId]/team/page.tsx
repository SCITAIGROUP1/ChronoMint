"use client";

import { useParams } from "next/navigation";
import { PersonalProjectTeamTab } from "@/features/projects/personal-project-team-tab";
import { ProjectTeamTab } from "@/features/projects/project-team-tab";
import { resolveProjectDetailExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

export default function ProjectTeamPage() {
  const params = useParams<{ projectId: string }>();
  const session = useSessionStore((state) => state.session);
  if (!session) return null;
  if (resolveProjectDetailExperience(session, params.projectId).mode === "personal") {
    return <PersonalProjectTeamTab />;
  }
  return <ProjectTeamTab />;
}
