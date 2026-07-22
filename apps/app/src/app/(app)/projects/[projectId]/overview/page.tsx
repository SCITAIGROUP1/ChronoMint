"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { myProjectDetailHref } from "@/features/projects/member-project-detail-nav";
import { PersonalProjectOverview } from "@/features/projects/personal-project-overview";
import {
  isMyProjectsListSource,
  resolveProjectListSource
} from "@/features/projects/project-detail-nav";
import { ProjectOverviewTab } from "@/features/projects/project-overview-tab";
import { resolveProjectDetailExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";
  const fromMyProjects = isMyProjectsListSource(
    resolveProjectListSource(searchParams.get("from"), "projects")
  );

  useEffect(() => {
    if (fromMyProjects) {
      router.replace(myProjectDetailHref(params.projectId));
    }
  }, [fromMyProjects, params.projectId, router]);

  if (!session) return null;
  if (fromMyProjects) return null;

  const experience = resolveProjectDetailExperience(session, params.projectId);
  if (experience.mode === "personal") return <PersonalProjectOverview />;

  return <ProjectOverviewTab workspaceId={ws} projectId={params.projectId} />;
}
