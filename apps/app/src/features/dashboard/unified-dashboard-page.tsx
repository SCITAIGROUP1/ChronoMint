"use client";

import { AppBar } from "@kloqra/ui";
import { type ReactNode, useCallback, useState } from "react";
import { getDashboardComposition } from "./dashboard-composition";
import { ManagementDashboardLazy } from "./management-dashboard-lazy";
import { useSessionStore } from "@/stores/session.store";

export function UnifiedDashboardPage() {
  const session = useSessionStore((state) => state.session);
  const [dashboardActions, setDashboardActions] = useState<ReactNode>(null);
  const [dashboardDescription, setDashboardDescription] = useState<string | null>(null);
  const handleDashboardActionsChange = useCallback((actions: ReactNode | null) => {
    setDashboardActions(actions);
  }, []);
  const handleDashboardDescriptionChange = useCallback((description: string | null) => {
    setDashboardDescription(description);
  }, []);
  if (!session) return null;

  const composition = getDashboardComposition(session);

  return (
    <div className="space-y-10">
      <AppBar
        title="Dashboard"
        description={
          dashboardDescription ??
          (composition.showManagement
            ? "Loading dashboard range…"
            : "Your time, assigned work, and timesheet status.")
        }
        actions={
          dashboardActions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">{dashboardActions}</div>
          ) : null
        }
      />
      {composition.showPersonal || composition.showManagement ? (
        <ManagementDashboardLazy
          capabilities={composition.capabilities}
          showPersonal={composition.showPersonal}
          showManagement={composition.showManagement}
          workspaceWide={composition.workspaceWide}
          projectIds={composition.projectIds}
          onAppBarActionsChange={handleDashboardActionsChange}
          onAppBarDescriptionChange={handleDashboardDescriptionChange}
        />
      ) : null}
    </div>
  );
}
