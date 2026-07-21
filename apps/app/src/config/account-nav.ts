import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings,
  Shield,
  UserCog,
  Users,
  FolderTree
} from "lucide-react";

export type AccountNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  ownerOnly?: boolean;
};

export const ACCOUNT_NAV_ITEMS: readonly AccountNavItem[] = [
  { href: "/account", label: "Overview", Icon: LayoutDashboard, ownerOnly: true },
  { href: "/account/workspaces", label: "Workspaces", Icon: Building2 },
  { href: "/account/workspaces-tree", label: "Workspaces Tree", Icon: FolderTree, ownerOnly: true },
  { href: "/account/workspace-admins", label: "Workspace admins", Icon: UserCog },
  { href: "/account/access-audit", label: "Access audit log", Icon: ClipboardList },
  { href: "/account/organization", label: "Organization", Icon: Users },
  { href: "/account/members", label: "Organization members", Icon: Users, ownerOnly: true },
  { href: "/account/billing", label: "Subscription", Icon: CreditCard, ownerOnly: true },
  { href: "/account/data-privacy", label: "Data & privacy", Icon: Shield, ownerOnly: true },
  { href: "/account/settings", label: "Settings", Icon: Settings }
] as const;

export const ORGANIZATION_APP_NAV_ITEMS: readonly AccountNavItem[] = ACCOUNT_NAV_ITEMS.filter(
  (item) => !item.ownerOnly
);

export const ORGANIZATION_OWNER_NAV_ITEMS: readonly AccountNavItem[] = ACCOUNT_NAV_ITEMS;
