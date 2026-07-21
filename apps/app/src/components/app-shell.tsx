"use client";

import { BRAND_NAME } from "@kloqra/contracts";
import { Button, ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapSession,
  BrandMark,
  canAccessAccountMode,
  canAccessAccountPath,
  canManageOrganization,
  defaultAccountLandingPath,
  getSessionCapabilities,
  logoutSession,
  sessionCan,
  SessionGenerationBoundary,
  ShellHeaderActions,
  shouldRedirectBootstrapToLogin,
  useNotificationSocket,
  useNotificationUnreadCount,
  useTenantSubscription,
  useUserProfile,
  resolveWorkspaceSetupRedirect,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProjectManagerScopeHint } from "@/components/project-manager-scope-hint";
import { APP_NAV_ITEMS } from "@/config/app-nav";
import { isProjectLeadOnly } from "@/config/project-manager-nav";
import { usePendingTimesheetsBadgeCount } from "@/features/approvals/use-pending-timesheets";
import { AssistantProvider, useAssistant } from "@/features/assistant/assistant-provider";
import { AssistantWidget } from "@/features/assistant/assistant-widget";
import { GlobalSearchShell } from "@/features/global-search/global-search-shell";
import { OnboardingProvider, useOnboarding } from "@/features/onboarding/onboarding-provider";
import { isCommercialFeaturesEnabled } from "@/lib/commercial-features";
import { resolveAppShellMode, resolveAppShellNav } from "@/lib/resolve-app-shell-nav";
import { useAppWorkspaceDataSync } from "@/lib/workspace-data-sync";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { openOnboarding, openTour } = useOnboarding();
  const { openAssistant } = useAssistant();
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionStore((s) => s.session);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const [bootstrapFailure, setBootstrapFailure] = useState<"transient" | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const wsId = session?.workspaceId ?? "";
  const isOwner = session?.tenantRole === "OWNER";
  const canManageOrg = canManageOrganization(session);
  const capabilities = useMemo(() => (session ? getSessionCapabilities(session) : []), [session]);
  const canUseManagementFeatures =
    sessionCan(session, "workspace:ReadReports") || sessionCan(session, "project:ReadReports");
  const projectLeadOnly = isProjectLeadOnly(
    session?.workspaceRole,
    session?.managedProjectIds,
    session?.tenantRole
  );
  const managedProjectCount = session?.managedProjectIds?.length ?? 0;
  const isAccountMode = resolveAppShellMode(pathname, session) === "account";
  const canUsePersonalFeatures = Boolean(wsId);
  const canUseWorkspaceOps = Boolean(wsId && sessionCan(session, "project:ReviewTimesheets"));
  const notificationsEnabled = canUsePersonalFeatures;

  useUserProfile();
  useNotificationSocket(wsId, notificationsEnabled);
  useAppWorkspaceDataSync(wsId);
  const { count: notificationUnreadCount } = useNotificationUnreadCount(wsId, notificationsEnabled);
  const pendingCount = usePendingTimesheetsBadgeCount(wsId, canUseWorkspaceOps);
  const { subscription } = useTenantSubscription(isOwner);
  const billingAlert = isOwner ? subscription?.billingAlert : null;

  const { mode: _mode, navItems } = useMemo(() => {
    const workspaceNavItems = isCommercialFeaturesEnabled()
      ? APP_NAV_ITEMS
      : APP_NAV_ITEMS.filter((item) => item.href !== "/billing");
    return resolveAppShellNav({
      pathname,
      projectLeadOnly,
      workspaceNavItems,
      pendingCount,
      notificationUnreadCount,
      session,
      capabilities
    });
  }, [pathname, projectLeadOnly, pendingCount, notificationUnreadCount, session, capabilities]);

  useEffect(() => {
    if (session) {
      setBootstrapFailure(null);
      const setupRedirect = resolveWorkspaceSetupRedirect(pathname, session);
      if (setupRedirect) {
        router.replace(setupRedirect);
        return;
      }
      if (isAccountMode) {
        if (!canAccessAccountMode(session)) {
          router.replace("/dashboard");
          return;
        }
        if (!canAccessAccountPath(session, pathname)) {
          router.replace(defaultAccountLandingPath(session));
        }
        return;
      }
      return;
    }

    let cancelled = false;
    setBootstrapFailure(null);
    void bootstrapSession()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          if (shouldRedirectBootstrapToLogin(result.reason)) {
            router.replace("/login?error=session");
            return;
          }
          setBootstrapFailure("transient");
          return;
        }
        setWorkspaces(result.workspaces);
      })
      .catch(() => {
        if (!cancelled) setBootstrapFailure("transient");
      });

    return () => {
      cancelled = true;
    };
  }, [session, setWorkspaces, router, isAccountMode, pathname, bootstrapAttempt]);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6">
        {bootstrapFailure === "transient" ? (
          <>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              Couldn&apos;t restore your session. Check your connection and try again.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBootstrapAttempt((n) => n + 1)}
            >
              Try again
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BrandMark size="sm" iconOnly className="animate-pulse" />
            Loading workspace…
          </div>
        )}
      </div>
    );
  }

  if (isAccountMode && !canAccessAccountPath(session, pathname)) {
    return null;
  }

  const logoSubtitle = isAccountMode ? "Organization" : (session.workspaceName ?? "Workspace");
  const logoLinkHref = isAccountMode ? defaultAccountLandingPath(session) : "/dashboard";
  const navSectionLabel = isAccountMode ? "Organization" : undefined;
  const navAriaLabel = isAccountMode ? "Organization navigation" : "Workspace navigation";

  const settingsHref = isAccountMode ? "/account/settings" : "/settings";

  return (
    <>
      {canUseManagementFeatures ? <GlobalSearchShell workspaceId={wsId} isOwner={isOwner} /> : null}
      <ResponsiveLayoutShell
        navItems={navItems as SidebarNavItem[]}
        logoIcon={<BrandMark size="lg" iconOnly />}
        logoTitle={BRAND_NAME}
        logoSubtitle={logoSubtitle}
        logoLinkHref={logoLinkHref}
        navSectionLabel={navSectionLabel}
        navAriaLabel={navAriaLabel}
        shellToolbar={
          <ShellHeaderActions
            workspaceId={wsId}
            profileHref={isAccountMode ? "/account/profile" : "/profile"}
            settingsHref={settingsHref}
            notificationsHref={isAccountMode ? "/account/notifications" : "/notifications"}
            onShowOnboardingWizard={() => openOnboarding({ replay: true })}
            onShowOnboardingTour={() => openTour({ replay: true })}
            onOpenAssistant={openAssistant}
          />
        }
        workspaceSwitcher={(collapsed) => (
          <WorkspaceSwitcher
            defaultRedirect="/dashboard"
            collapsed={collapsed}
            organizationHref={canManageOrg ? defaultAccountLandingPath(session) : undefined}
            contextMode={canManageOrg ? (isAccountMode ? "account" : "workspace") : undefined}
          />
        )}
        footerContent={(collapsed) => (
          <div className={collapsed ? "flex flex-col items-center gap-2" : "space-y-3"}>
            {!isAccountMode ? (
              <ProjectManagerScopeHint
                projectLeadOnly={projectLeadOnly}
                workspaceName={session.workspaceName}
                managedProjectCount={managedProjectCount}
                collapsed={collapsed}
              />
            ) : null}
            <SidebarUserFooter
              collapsed={collapsed}
              userName={session.user.name ?? "User"}
              profileHref={isAccountMode ? "/account/profile" : "/profile"}
              onLogout={() => {
                void logoutSession(session.workspaceId);
              }}
            />
          </div>
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
        <SessionGenerationBoundary>{children}</SessionGenerationBoundary>
        <AssistantWidget />
      </ResponsiveLayoutShell>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <AssistantProvider>
        <AppShellInner>{children}</AppShellInner>
      </AssistantProvider>
    </OnboardingProvider>
  );
}
