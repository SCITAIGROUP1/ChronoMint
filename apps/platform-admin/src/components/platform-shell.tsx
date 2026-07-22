"use client";

import { BRAND_NAME, PLATFORM_PORTAL_LABEL } from "@kloqra/contracts";
import { ResponsiveLayoutShell, SidebarUserFooter } from "@kloqra/ui";
import {
  bootstrapPlatformSession,
  BrandMark,
  logoutPlatformSession,
  PlatformContextPanel,
  ShellHeaderActions,
  usePlatformNotificationSocket,
  usePlatformNotificationUnreadCount,
  usePlatformSessionStore
} from "@kloqra/web-shared";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { resolvePlatformShellNav } from "@/lib/resolve-platform-shell-nav";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = usePlatformSessionStore((s) => s.session);

  usePlatformNotificationSocket(Boolean(session));
  const { count: notificationUnreadCount } = usePlatformNotificationUnreadCount(Boolean(session));

  const { mode, navSections } = useMemo(
    () =>
      resolvePlatformShellNav({
        pathname,
        notificationUnreadCount,
        platformRole: session?.platformRole
      }),
    [pathname, notificationUnreadCount, session?.platformRole]
  );

  const isAccountMode = mode === "account";

  useEffect(() => {
    if (session) return;
    void bootstrapPlatformSession()
      .then((result) => {
        if (!result.ok) router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [session, router]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrandMark size="sm" iconOnly className="animate-pulse" />
          Loading platform…
        </div>
      </div>
    );
  }

  // Role Guard
  const isSupport = session?.platformRole === "SUPPORT";
  const allowedPrefixes = ["/helpdesk", "/notifications", "/profile", "/settings"];
  const isAllowed =
    !isSupport ||
    allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    if (!isAllowed) {
      router.replace("/helpdesk");
    }
  }, [isAllowed, router]);

  if (!isAllowed) {
    return null;
  }

  return (
    <ResponsiveLayoutShell
      navSections={navSections}
      logoIcon={<BrandMark size="lg" iconOnly />}
      logoTitle={BRAND_NAME}
      logoSubtitle={
        isAccountMode
          ? "Account"
          : session.platformRole === "SUPPORT"
            ? "Platform Support"
            : PLATFORM_PORTAL_LABEL
      }
      logoLinkHref={
        isAccountMode ? "/profile" : session.platformRole === "SUPPORT" ? "/helpdesk" : "/tenants"
      }
      navAriaLabel={isAccountMode ? "Account navigation" : "Platform navigation"}
      shellToolbar={
        <ShellHeaderActions
          profileHref="/profile"
          settingsHref="/settings"
          notificationsHref="/notifications"
          userName={session.user.name}
          platformNotifications
        />
      }
      workspaceSwitcher={(collapsed) => (
        <PlatformContextPanel
          collapsed={collapsed}
          showBackLink={isAccountMode}
          backHref={session.platformRole === "SUPPORT" ? "/helpdesk" : "/tenants"}
          platformRole={session.platformRole}
        />
      )}
      footerContent={(collapsed) => (
        <SidebarUserFooter
          collapsed={collapsed}
          userName={session.user.name}
          profileHref="/profile"
          onLogout={() => {
            void logoutPlatformSession();
          }}
        />
      )}
    >
      {children}
    </ResponsiveLayoutShell>
  );
}
