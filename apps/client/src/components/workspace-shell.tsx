"use client";

import { BRAND_NAME, ROUTES } from "@kloqra/contracts";
import type { WorkspaceListItemDto } from "@kloqra/contracts";
import { Button, ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapSession,
  BrandMark,
  logoutSession,
  SessionGenerationBoundary,
  ShellHeaderActions,
  shouldRedirectBootstrapToLogin,
  SUBMISSIONS_LOOKBACK_WEEKS,
  useMySubmissionsLookbackQuery,
  useNotificationSocket,
  useNotificationUnreadCount,
  usePreferenceTodayDateKey,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FolderKanban,
  LayoutGrid,
  Timer as TimerIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AssistantProvider, useAssistant } from "@/features/assistant/assistant-provider";
import { AssistantWidget } from "@/features/assistant/assistant-widget";
import { OnboardingProvider, useOnboarding } from "@/features/onboarding/onboarding-provider";
import { countActionableSubmissions } from "@/features/submissions/use-my-submissions";
import { api } from "@/lib/api";
import { useClientWorkspaceDataSync } from "@/lib/workspace-data-sync";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const baseNav: readonly SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/timer", label: "Timer", Icon: TimerIcon, tourId: "nav-timer" },
  { href: "/time-tracker", label: "Time Tracker", Icon: Clock, tourId: "nav-time-tracker" },
  { href: "/timesheet", label: "Timesheet", Icon: CalendarDays },
  { href: "/submissions", label: "Submissions", Icon: ClipboardCheck, tourId: "nav-submissions" },
  { href: "/notifications", label: "Notifications", Icon: Bell },
  { href: "/projects", label: "My projects", Icon: FolderKanban, tourId: "nav-projects" }
];

function WorkspaceShellInner({ children }: { children: React.ReactNode }) {
  const { openOnboarding, openTour } = useOnboarding();
  const { openAssistant } = useAssistant();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const wsId = session?.workspaceId ?? "";
  const anchorDateKey = usePreferenceTodayDateKey();
  useNotificationSocket(wsId, Boolean(wsId));
  useClientWorkspaceDataSync(wsId);
  const { data: badgeSubmissions = [] } = useMySubmissionsLookbackQuery(
    wsId,
    anchorDateKey,
    SUBMISSIONS_LOOKBACK_WEEKS,
    "assigned",
    Boolean(wsId)
  );
  const actionableCount = useMemo(
    () => countActionableSubmissions(badgeSubmissions),
    [badgeSubmissions]
  );
  const { count: notificationUnreadCount } = useNotificationUnreadCount(wsId, Boolean(wsId));
  const setWorkspaceNames = useProjectsStore((s) => s.setWorkspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const ensureWorkspacesLoaded = useWorkspacesStore((s) => s.ensureLoaded);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const [bootstrapFailure, setBootstrapFailure] = useState<"transient" | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    if (session) {
      setBootstrapFailure(null);
      if (workspaces.length > 0) {
        // Login / bootstrap already seeded the list — sync names without refetching.
        setWorkspaceNames(workspaces);
        return;
      }
      void ensureWorkspacesLoaded(() =>
        api<WorkspaceListItemDto[]>(ROUTES.WORKSPACES.LIST, {
          workspaceId: session.workspaceId
        })
      )
        .then((list) => {
          setWorkspaceNames(list);
        })
        .catch(() => {});
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const handoffFromUrl = params.get("handoff");
    const legacyImpersonate = params.get("impersonate") === "true";

    if (handoffFromUrl || legacyImpersonate) {
      params.delete("handoff");
      params.delete("impersonate");
      const query = params.toString();
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + (query ? `?${query}` : "")
      );
    }

    let cancelled = false;
    setBootstrapFailure(null);
    void bootstrapSession()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          if (shouldRedirectBootstrapToLogin(result.reason)) {
            router.replace("/login");
            return;
          }
          setBootstrapFailure("transient");
          return;
        }
        setWorkspaces(result.workspaces);
        setWorkspaceNames(result.workspaces);
      })
      .catch(() => {
        if (cancelled) return;
        setBootstrapFailure("transient");
      });

    return () => {
      cancelled = true;
    };
  }, [
    session,
    setWorkspaces,
    setWorkspaceNames,
    ensureWorkspacesLoaded,
    router,
    workspaces,
    bootstrapAttempt
  ]);

  const nav = useMemo((): readonly SidebarNavItem[] => {
    return baseNav.map((item) => {
      if (item.href === "/submissions") return { ...item, badge: actionableCount };
      if (item.href === "/notifications") return { ...item, badge: notificationUnreadCount };
      return item;
    });
  }, [actionableCount, notificationUnreadCount]);

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

  return (
    <ResponsiveLayoutShell
      navItems={nav}
      logoIcon={<BrandMark size="md" iconOnly />}
      logoTitle={BRAND_NAME}
      logoSubtitle="Member Portal"
      logoLinkHref="/dashboard"
      shellToolbar={
        <ShellHeaderActions
          workspaceId={wsId}
          profileHref="/profile"
          settingsHref="/settings"
          notificationsHref="/notifications"
          onShowOnboardingWizard={() => openOnboarding({ replay: true })}
          onShowOnboardingTour={() => openTour({ replay: true })}
          onOpenAssistant={openAssistant}
        />
      }
      workspaceSwitcher={(collapsed) => (
        <WorkspaceSwitcher
          memberPortal
          defaultRedirect="/dashboard"
          collapsed={collapsed}
          onAfterSwitch={() => {
            useProjectsStore.getState().clear();
          }}
        />
      )}
      footerContent={(collapsed) => (
        <SidebarUserFooter
          collapsed={collapsed}
          userName={session.user.name ?? "Member"}
          firstName={session.user.firstName}
          lastName={session.user.lastName}
          profileHref="/profile"
          onLogout={() => {
            void logoutSession(session.workspaceId);
          }}
        />
      )}
    >
      <SessionGenerationBoundary>{children}</SessionGenerationBoundary>
      <AssistantWidget />
    </ResponsiveLayoutShell>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <AssistantProvider>
        <WorkspaceShellInner>{children}</WorkspaceShellInner>
      </AssistantProvider>
    </OnboardingProvider>
  );
}
