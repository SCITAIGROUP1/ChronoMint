"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PersonalProjectTasksTab } from "@/features/projects/personal-project-tasks-tab";
import {
  isMyProjectsListSource,
  resolveProjectListSource
} from "@/features/projects/project-detail-nav";
import { ProjectTasksTab } from "@/features/projects/project-tasks-tab";
import { resolveProjectDetailExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

export default function ProjectTasksPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const fromMyProjects = isMyProjectsListSource(
    resolveProjectListSource(searchParams.get("from"), "projects")
  );

  useEffect(() => {
    if (fromMyProjects) {
      router.replace(`/my-projects/${params.projectId}/tasks`);
    }
  }, [fromMyProjects, params.projectId, router]);

  if (!session) return null;
  if (fromMyProjects) return null;

  if (resolveProjectDetailExperience(session, params.projectId).mode === "personal") {
    return <PersonalProjectTasksTab />;
  }
  return <ProjectTasksTab />;
}
