"use client";

import { useParams } from "next/navigation";
import { PersonalProjectOverview } from "@/features/projects/personal-project-overview";
import { ProjectOverviewTab } from "@/features/projects/project-overview-tab";
import { resolveProjectDetailExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const session = useSessionStore((state) => state.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";
  if (!session) return null;

  const experience = resolveProjectDetailExperience(session, params.projectId);
  if (experience.mode === "personal") return <PersonalProjectOverview />;

  return <ProjectOverviewTab workspaceId={ws} projectId={params.projectId} />;
}
