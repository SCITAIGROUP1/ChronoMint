"use client";

import { AppBar } from "@kloqra/ui";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { getDashboardComposition } from "./dashboard-composition";
import { ManagementDashboardLazy } from "./management-dashboard-lazy";
import { useSessionStore } from "@/stores/session.store";

export function UnifiedDashboardPage() {
  const session = useSessionStore((state) => state.session);
  const router = useRouter();
  const [dashboardActions, setDashboardActions] = useState<ReactNode>(null);
  const [dashboardDescription, setDashboardDescription] = useState<string | null>(null);
  const handleDashboardActionsChange = useCallback((actions: ReactNode | null) => {
    setDashboardActions(actions);
  }, []);
  const handleDashboardDescriptionChange = useCallback((description: string | null) => {
    setDashboardDescription(description);
  }, []);
  const composition = session ? getDashboardComposition(session) : null;
  const showManagement = composition?.showManagement ?? false;

  useEffect(() => {
    if (!session || showManagement) return;
    router.replace("/overview");
  }, [session, showManagement, router]);

  if (!session || !composition || !showManagement) return null;

  return (
    <div className="space-y-10">
      <AppBar
        title="Dashboard"
        description={dashboardDescription ?? "Loading dashboard range…"}
        actions={
          dashboardActions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">{dashboardActions}</div>
          ) : null
        }
      />
      <ManagementDashboardLazy
        capabilities={composition.capabilities}
        showPersonal={false}
        showManagement
        workspaceWide={composition.workspaceWide}
        projectIds={composition.projectIds}
        onAppBarActionsChange={handleDashboardActionsChange}
        onAppBarDescriptionChange={handleDashboardDescriptionChange}
      />
    </div>
  );
}
