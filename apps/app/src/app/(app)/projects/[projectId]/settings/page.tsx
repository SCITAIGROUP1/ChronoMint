"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  isMyProjectsListSource,
  projectDetailSectionHref,
  resolveProjectListSource
} from "@/features/projects/project-detail-nav";
import { ProjectSettingsTab } from "@/features/projects/project-settings-tab";
import { resolveProjectDetailExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const listSource = resolveProjectListSource(searchParams.get("from"), "projects");
  const forcePersonal = isMyProjectsListSource(listSource);
  const canManage =
    session &&
    resolveProjectDetailExperience(session, params.projectId, { forcePersonal }).mode !==
      "personal";

  useEffect(() => {
    if (session && !canManage) {
      router.replace(projectDetailSectionHref(params.projectId, "overview", listSource));
    }
  }, [canManage, listSource, params.projectId, router, session]);

  if (!canManage) return null;
  return <ProjectSettingsTab />;
}
