"use client";

import { useParams } from "next/navigation";
import { PersonalProjectTasksTab } from "@/features/projects/personal-project-tasks-tab";
import { ProjectTasksTab } from "@/features/projects/project-tasks-tab";
import { resolveProjectDetailExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

export default function ProjectTasksPage() {
  const params = useParams<{ projectId: string }>();
  const session = useSessionStore((state) => state.session);
  if (!session) return null;
  if (resolveProjectDetailExperience(session, params.projectId).mode === "personal") {
    return <PersonalProjectTasksTab />;
  }
  return <ProjectTasksTab />;
}
