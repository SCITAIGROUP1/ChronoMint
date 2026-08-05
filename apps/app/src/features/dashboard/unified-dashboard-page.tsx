"use client";

import { AppBar, EmptyState, Button } from "@kloqra/ui";
import Link from "next/link";
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
            : "Workspace analytics and team management widgets.")
        }
        actions={
          dashboardActions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">{dashboardActions}</div>
          ) : null
        }
      />
      {composition.showManagement ? (
        <ManagementDashboardLazy
          capabilities={composition.capabilities}
          showPersonal={false}
          showManagement
          workspaceWide={composition.workspaceWide}
          projectIds={composition.projectIds}
          onAppBarActionsChange={handleDashboardActionsChange}
          onAppBarDescriptionChange={handleDashboardDescriptionChange}
        />
      ) : (
        <EmptyState
          title="No workspace analytics here"
          description="Your personal time widgets live under Overview in My time."
          action={
            <Button asChild size="sm">
              <Link href="/overview">Go to Overview</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
