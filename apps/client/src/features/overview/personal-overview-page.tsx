"use client";

import { PageLayout } from "@kloqra/ui";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { getDashboardComposition } from "@/features/dashboard/dashboard-composition";
import { ManagementDashboardLazy } from "@/features/dashboard/management-dashboard-lazy";
import { useSessionStore } from "@/stores/session.store";

export function PersonalOverviewPage() {
  const session = useSessionStore((state) => state.session);
  const [actions, setActions] = useState<ReactNode>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<ReactNode>(null);
  const handleActionsChange = useCallback((next: ReactNode | null) => {
    setActions(next);
  }, []);
  const handleDescriptionChange = useCallback((next: string | null) => {
    setDescription(next);
  }, []);
  const handleSecondaryChange = useCallback((next: ReactNode | null) => {
    setSecondary(next);
  }, []);

  const composition = useMemo(() => (session ? getDashboardComposition(session) : null), [session]);

  if (!session || !composition) return null;

  if (!composition.showPersonal) {
    return (
      <PageLayout title="Overview" description="Your personal time and assigned work at a glance.">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have access to personal time features in this workspace.
        </p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Overview"
      description={description ?? "Your time, assigned work, and timesheet status."}
      actions={
        actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null
      }
      secondary={secondary}
    >
      <ManagementDashboardLazy
        capabilities={composition.capabilities}
        showPersonal
        showManagement={false}
        workspaceWide={false}
        projectIds={composition.projectIds}
        onAppBarActionsChange={handleActionsChange}
        onAppBarDescriptionChange={handleDescriptionChange}
        onAppBarSecondaryChange={handleSecondaryChange}
      />
    </PageLayout>
  );
}
