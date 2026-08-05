"use client";

import { TasksPage } from "@/features/tasks/tasks-page";
import { resolveProjectsExperience } from "@/features/unified-routes/route-composition";
import { useSessionStore } from "@/stores/session.store";

export default function Page() {
  const session = useSessionStore((state) => state.session);
  if (!session) return null;
  const experience = resolveProjectsExperience(session);
  const canManage = experience.mode === "workspace" || experience.mode === "managed";
  return (
    <TasksPage
      managedProjectIds={experience.mode === "managed" ? experience.managedProjectIds : undefined}
      canManage={canManage}
    />
  );
}
