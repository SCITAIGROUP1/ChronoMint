import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings,
  Shield,
  SlidersHorizontal,
  UserCog,
  Users,
  FolderTree
} from "lucide-react";

export type AccountNavSection = "organization" | "access" | "billing-data";

export const ACCOUNT_NAV_SECTION_LABELS: Record<AccountNavSection, string> = {
  organization: "Organization",
  access: "Access",
  "billing-data": "Billing & data"
};

export type AccountNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  section: AccountNavSection;
  ownerOnly?: boolean;
};

export const ACCOUNT_NAV_ITEMS: readonly AccountNavItem[] = [
  {
    href: "/account",
    label: "Summary",
    Icon: LayoutDashboard,
    section: "organization",
    ownerOnly: true
  },
  { href: "/account/workspaces", label: "Workspaces", Icon: Building2, section: "organization" },
  {
    href: "/account/workspaces-tree",
    label: "Workspaces Tree",
    Icon: FolderTree,
    section: "organization",
    ownerOnly: true
  },
  {
    href: "/account/organization",
    label: "Organization",
    Icon: Users,
    section: "organization"
  },
  {
    href: "/account/workspace-admins",
    label: "Workspace admins",
    Icon: UserCog,
    section: "access"
  },
  {
    href: "/account/permissions-matrix",
    label: "Permission matrix",
    Icon: SlidersHorizontal,
    section: "access"
  },
  {
    href: "/account/access-audit",
    label: "Access audit log",
    Icon: ClipboardList,
    section: "access"
  },
  {
    href: "/account/members",
    label: "Organization members",
    Icon: Users,
    section: "access",
    ownerOnly: true
  },
  {
    href: "/account/billing",
    label: "Subscription",
    Icon: CreditCard,
    section: "billing-data",
    ownerOnly: true
  },
  {
    href: "/account/data-privacy",
    label: "Data & privacy",
    Icon: Shield,
    section: "billing-data",
    ownerOnly: true
  },
  { href: "/account/settings", label: "Settings", Icon: Settings, section: "billing-data" }
] as const;

export const ACCOUNT_NAV_SECTION_ORDER: readonly AccountNavSection[] = [
  "organization",
  "access",
  "billing-data"
];

export const ORGANIZATION_APP_NAV_ITEMS: readonly AccountNavItem[] = ACCOUNT_NAV_ITEMS.filter(
  (item) => !item.ownerOnly
);

export const ORGANIZATION_OWNER_NAV_ITEMS: readonly AccountNavItem[] = ACCOUNT_NAV_ITEMS;
