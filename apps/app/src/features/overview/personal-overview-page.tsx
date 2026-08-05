"use client";

import { AppBar } from "@kloqra/ui";
import { type ReactNode, useCallback, useState } from "react";
import { getDashboardComposition } from "@/features/dashboard/dashboard-composition";
import { ManagementDashboardLazy } from "@/features/dashboard/management-dashboard-lazy";
import { useSessionStore } from "@/stores/session.store";

export function PersonalOverviewPage() {
  const session = useSessionStore((state) => state.session);
  const [actions, setActions] = useState<ReactNode>(null);
  const [description, setDescription] = useState<string | null>(null);
  const handleActionsChange = useCallback((next: ReactNode | null) => {
    setActions(next);
  }, []);
  const handleDescriptionChange = useCallback((next: string | null) => {
    setDescription(next);
  }, []);

  if (!session) return null;

  const composition = getDashboardComposition(session);
  if (!composition.showPersonal) {
    return (
      <div className="space-y-6">
        <AppBar title="Overview" description="Your personal time and assigned work at a glance." />
        <p className="text-sm text-muted-foreground">
          You don&apos;t have access to personal time features in this workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <AppBar
        title="Overview"
        description={description ?? "Your time, assigned work, and timesheet status."}
        actions={
          actions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          ) : null
        }
      />
      <ManagementDashboardLazy
        capabilities={composition.capabilities}
        showPersonal
        showManagement={false}
        workspaceWide={false}
        projectIds={[]}
        onAppBarActionsChange={handleActionsChange}
        onAppBarDescriptionChange={handleDescriptionChange}
      />
    </div>
  );
}
