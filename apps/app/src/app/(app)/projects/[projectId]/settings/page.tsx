"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProjectSettingsTab } from "@/features/projects/project-settings-tab";
import { resolveProjectDetailExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const canManage =
    session && resolveProjectDetailExperience(session, params.projectId).mode !== "personal";

  useEffect(() => {
    if (session && !canManage) {
      router.replace(`/projects/${params.projectId}/overview`);
    }
  }, [canManage, params.projectId, router, session]);

  if (!canManage) return null;
  return <ProjectSettingsTab />;
}
