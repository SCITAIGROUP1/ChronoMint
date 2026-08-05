"use client";

import type { Permission } from "@kloqra/contracts";
import { DashboardSkeleton } from "@kloqra/ui";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

export type ManagementDashboardLazyProps = {
  capabilities: readonly Permission[];
  showPersonal: boolean;
  showManagement: boolean;
  workspaceWide: boolean;
  projectIds: readonly string[];
  onAppBarActionsChange?: (actions: ReactNode | null) => void;
  onAppBarDescriptionChange?: (description: string | null) => void;
};

const ManagementDashboard = dynamic(
  () =>
    import("./dashboard-page").then((module) => ({
      default: module.ManagementDashboardPage
    })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

export function ManagementDashboardLazy(props: ManagementDashboardLazyProps) {
  return <ManagementDashboard {...props} />;
}
