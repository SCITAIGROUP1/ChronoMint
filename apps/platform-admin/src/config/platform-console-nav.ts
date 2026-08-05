import type { SidebarNavItem } from "@kloqra/ui";
import {
  Building2,
  Bell,
  CreditCard,
  Gauge,
  ScrollText,
  Layers,
  LifeBuoy,
  Users
} from "lucide-react";

export type PlatformConsoleNavSection = "operations" | "commercial" | "support";

export const PLATFORM_CONSOLE_SECTION_LABELS: Record<PlatformConsoleNavSection, string> = {
  operations: "Operations",
  commercial: "Commercial",
  support: "Support"
};

export type PlatformConsoleNavItem = SidebarNavItem & {
  section: PlatformConsoleNavSection;
};

export const PLATFORM_CONSOLE_NAV_ITEMS: readonly PlatformConsoleNavItem[] = [
  { href: "/ops", label: "Ops", Icon: Gauge, section: "operations" },
  { href: "/staff", label: "Staff", Icon: Users, section: "operations" },
  { href: "/audit", label: "Audit log", Icon: ScrollText, section: "operations" },
  { href: "/tenants", label: "Tenants", Icon: Building2, section: "commercial" },
  { href: "/subscriptions", label: "Subscriptions", Icon: CreditCard, section: "commercial" },
  { href: "/plans", label: "Plans", Icon: Layers, section: "commercial" },
  { href: "/helpdesk", label: "Help Desk", Icon: LifeBuoy, section: "support" },
  { href: "/notifications", label: "Notifications", Icon: Bell, section: "support" }
] as const;

export const PLATFORM_CONSOLE_SECTION_ORDER: readonly PlatformConsoleNavSection[] = [
  "operations",
  "commercial",
  "support"
];
