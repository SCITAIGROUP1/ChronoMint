"use client";

import { BRAND_NAME } from "@kloqra/contracts";
import { ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapSession,
  BrandMark,
  logoutSession,
  ShellHeaderActions,
  useNotificationSocket,
  useNotificationUnreadCount,
  useTenantSubscription,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ACCOUNT_NAV_ITEMS } from "@/config/account-nav";
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav";
import {
  canAccessAdminApp,
  isProjectLeadOnly,
  projectLeadNavItems
} from "@/config/project-lead-nav";
import { usePendingTimesheetsBadgeCount } from "@/features/approvals/use-pending-timesheets";
import { GlobalSearchShell } from "@/features/global-search/global-search-shell";
import { useAdminWorkspaceDataSync } from "@/lib/workspace-data-sync";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const wsId = session?.workspaceId ?? "";
  const canUseAdminFeatures = canAccessAdminApp(session?.workspaceRole, session?.ledProjectIds);
  const projectLeadOnly = isProjectLeadOnly(session?.workspaceRole, session?.ledProjectIds);
  useNotificationSocket(wsId, Boolean(wsId && canUseAdminFeatures));
  useAdminWorkspaceDataSync(wsId);
  const { count: notificationUnreadCount } = useNotificationUnreadCount(
    wsId,
    Boolean(wsId && canUseAdminFeatures)
  );
  const pendingCount = usePendingTimesheetsBadgeCount(wsId, Boolean(wsId && canUseAdminFeatures));
  const { subscription } = useTenantSubscription();
  const billingAlert = session?.tenantRole === "OWNER" ? subscription?.billingAlert : null;

  useEffect(() => {
    if (session) {
      if (!canAccessAdminApp(session.workspaceRole, session.ledProjectIds)) {
        router.replace("/login?error=admin");
      }
      return;
    }

    void bootstrapSession({ requiredRole: "ADMIN", allowProjectLead: true })
      .then((result) => {
        if (!result.ok) {
          router.replace("/login?error=admin");
          return;
        }
        setWorkspaces(result.workspaces);
      })
      .catch(() => router.replace("/login?error=admin"));
  }, [session, setWorkspaces, router]);

  const nav = useMemo((): readonly SidebarNavItem[] => {
    const tenantRole = session?.tenantRole;
    const accountItems: SidebarNavItem[] =
      tenantRole === "OWNER" || tenantRole === "ADMIN"
        ? ACCOUNT_NAV_ITEMS.map((item) => ({
            href: item.href,
            label: item.label,
            Icon: item.Icon
          }))
        : [];

    const workspaceItems = (projectLeadOnly ? projectLeadNavItems() : ADMIN_NAV_ITEMS).map(
      (item) => {
        if (item.href === "/approvals") return { ...item, badge: pendingCount };
        if (item.href === "/notifications") return { ...item, badge: notificationUnreadCount };
        return item;
      }
    );

    return [...accountItems, ...workspaceItems];
  }, [pendingCount, notificationUnreadCount, session?.tenantRole, projectLeadOnly]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrandMark size="sm" iconOnly className="animate-pulse" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return (
    <>
      <GlobalSearchShell workspaceId={wsId} />
      <ResponsiveLayoutShell
        navItems={nav}
        logoIcon={<BrandMark size="lg" iconOnly />}
        logoTitle={BRAND_NAME}
        logoSubtitle="Admin Portal"
        logoLinkHref="/dashboard"
        shellToolbar={
          <ShellHeaderActions
            workspaceId={wsId}
            profileHref="/profile"
            settingsHref="/settings"
            notificationsHref="/notifications"
          />
        }
        workspaceSwitcher={(collapsed) => (
          <WorkspaceSwitcher filterAdminAccess defaultRedirect="/dashboard" collapsed={collapsed} />
        )}
        footerContent={(collapsed) => (
          <SidebarUserFooter
            collapsed={collapsed}
            userName={session.user.name ?? (projectLeadOnly ? "Project lead" : "Admin")}
            profileHref="/profile"
            onLogout={() => {
              void logoutSession(session.workspaceId).then(() => router.push("/login"));
            }}
          />
        )}
      >
        {billingAlert ? (
          <div
            className="border-b border-status-warning-border bg-status-warning-bg px-4 py-2 text-sm text-status-warning-fg"
            data-testid="global-billing-alert"
          >
            {billingAlert === "past_due"
              ? "Payment is past due — time logging is paused."
              : "Your trial is ending soon."}{" "}
            <Link href="/account/billing" className="font-medium underline">
              Review billing
            </Link>
          </div>
        ) : null}
        {children}
      </ResponsiveLayoutShell>
    </>
  );
}
