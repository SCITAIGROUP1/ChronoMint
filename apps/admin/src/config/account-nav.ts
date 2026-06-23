import type { LucideIcon } from "lucide-react";
import { Building2, CreditCard, LayoutDashboard, Shield, Users } from "lucide-react";

export type AccountNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export const ACCOUNT_NAV_ITEMS: readonly AccountNavItem[] = [
  { href: "/account", label: "Overview", Icon: LayoutDashboard },
  { href: "/account/workspaces", label: "Workspaces", Icon: Building2 },
  { href: "/account/organization", label: "Organization", Icon: Users },
  { href: "/account/billing", label: "Billing", Icon: CreditCard },
  { href: "/account/data-privacy", label: "Data & privacy", Icon: Shield }
] as const;
