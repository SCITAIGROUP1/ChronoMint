"use client";

import { BRAND_NAME } from "@kloqra/contracts";
import { ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapPlatformSession,
  BrandMark,
  logoutPlatformSession,
  usePlatformSessionStore
} from "@kloqra/web-shared";
import { Building2, Gauge, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/ops", label: "Ops", Icon: Gauge },
  { href: "/tenants", label: "Tenants", Icon: Building2 },
  { href: "/tenants/new", label: "Create tenant", Icon: Building2 },
  { href: "/audit", label: "Audit log", Icon: ScrollText }
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = usePlatformSessionStore((s) => s.session);

  useEffect(() => {
    if (session) return;
    void bootstrapPlatformSession()
      .then((result) => {
        if (!result.ok) router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [session, router]);

  const nav = useMemo(() => NAV_ITEMS, []);

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

  return (
    <ResponsiveLayoutShell
      navItems={nav}
      logoIcon={<BrandMark size="lg" iconOnly />}
      logoTitle={BRAND_NAME}
      logoSubtitle="Platform Admin"
      logoLinkHref="/tenants"
      workspaceSwitcher={() => null}
      footerContent={(collapsed) => (
        <SidebarUserFooter
          collapsed={collapsed}
          userName={session.user.name}
          profileHref="/tenants"
          onLogout={() => {
            void logoutPlatformSession().then(() => router.push("/login"));
          }}
        />
      )}
    >
      {children}
    </ResponsiveLayoutShell>
  );
}
