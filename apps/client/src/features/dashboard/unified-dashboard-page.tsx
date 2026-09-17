"use client";

import { PageLayout } from "@kloqra/ui";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { getDashboardComposition } from "./dashboard-composition";
import { ManagementDashboardLazy } from "./management-dashboard-lazy";
import { useSessionStore } from "@/stores/session.store";

export function UnifiedDashboardPage() {
  const session = useSessionStore((state) => state.session);
  const router = useRouter();
  const [dashboardActions, setDashboardActions] = useState<ReactNode>(null);
  const [dashboardDescription, setDashboardDescription] = useState<string | null>(null);
  const [dashboardSecondary, setDashboardSecondary] = useState<ReactNode>(null);
  const handleDashboardActionsChange = useCallback((actions: ReactNode | null) => {
    setDashboardActions(actions);
  }, []);
  const handleDashboardDescriptionChange = useCallback((description: string | null) => {
    setDashboardDescription(description);
  }, []);
  const handleDashboardSecondaryChange = useCallback((secondary: ReactNode | null) => {
    setDashboardSecondary(secondary);
  }, []);
  const composition = useMemo(() => (session ? getDashboardComposition(session) : null), [session]);
  const showManagement = composition?.showManagement ?? false;

  useEffect(() => {
    if (!session || showManagement) return;
    router.replace("/overview");
  }, [session, showManagement, router]);

  if (!session || !composition || !showManagement) return null;

  return (
    <PageLayout
      title="Dashboard"
      description={dashboardDescription ?? "Workspace reports"}
      actions={
        dashboardActions ? (
          <div className="flex flex-wrap items-center justify-end gap-2">{dashboardActions}</div>
        ) : null
      }
      secondary={dashboardSecondary}
    >
      <ManagementDashboardLazy
        capabilities={composition.capabilities}
        showPersonal={false}
        showManagement
        workspaceWide={composition.workspaceWide}
        projectIds={composition.projectIds}
        onAppBarActionsChange={handleDashboardActionsChange}
        onAppBarDescriptionChange={handleDashboardDescriptionChange}
        onAppBarSecondaryChange={handleDashboardSecondaryChange}
      />
    </PageLayout>
  );
}
