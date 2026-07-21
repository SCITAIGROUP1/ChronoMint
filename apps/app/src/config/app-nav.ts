import type { Permission } from "@kloqra/contracts";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  Download,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Send,
  Settings2,
  Tags,
  Timer,
  Users,
  LifeBuoy
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  tourId?: string;
  keywords?: readonly string[];
  requiredCapability?: Permission;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
    keywords: ["analytics", "home"]
  },
  {
    href: "/timer",
    label: "Timer",
    Icon: Timer,
    tourId: "nav-timer",
    requiredCapability: "personal:ManageTimer"
  },
  {
    href: "/timesheet",
    label: "Timesheet",
    Icon: CalendarDays,
    requiredCapability: "personal:SubmitTimesheets"
  },
  {
    href: "/submissions",
    label: "Submissions",
    Icon: Send,
    tourId: "nav-submissions",
    requiredCapability: "personal:SubmitTimesheets"
  },
  {
    href: "/projects",
    label: "Projects",
    Icon: FolderKanban,
    tourId: "nav-projects",
    keywords: ["clients"],
    requiredCapability: "workspace:ListProjects"
  },
  {
    href: "/tasks",
    label: "Tasks",
    Icon: ListTodo,
    requiredCapability: "personal:ListProjects"
  },
  {
    href: "/time-tracker",
    label: "Time Tracker",
    Icon: Clock,
    tourId: "nav-time-tracker",
    keywords: ["timelogs", "hours"],
    requiredCapability: "personal:ManageTimelogs"
  },
  {
    href: "/notifications",
    label: "Notifications",
    Icon: Bell,
    requiredCapability: "personal:ReadNotifications"
  },
  {
    href: "/team-management",
    label: "Team Management",
    Icon: Users,
    keywords: ["members", "invite", "people"],
    requiredCapability: "workspace:ManageMembers"
  },
  {
    href: "/project-managers",
    label: "Project managers",
    Icon: Briefcase,
    keywords: ["pm", "project manager", "managers", "provisioning"],
    requiredCapability: "workspace:ManageMembers"
  },
  {
    href: "/categories",
    label: "Categories",
    Icon: Tags,
    requiredCapability: "workspace:ManageCategories"
  },
  {
    href: "/team",
    label: "Team Live",
    Icon: Activity,
    keywords: ["presence", "tracking"],
    requiredCapability: "project:ReadPresence"
  },
  {
    href: "/approvals",
    label: "Approvals",
    Icon: ClipboardCheck,
    keywords: ["timesheets", "submissions"],
    requiredCapability: "project:ReviewTimesheets"
  },
  {
    href: "/billing",
    label: "Hourly rates",
    Icon: CircleDollarSign,
    keywords: ["billing", "rates", "hourly"],
    requiredCapability: "workspace:ManageBillingRates"
  },
  {
    href: "/exports",
    label: "Exports",
    Icon: Download,
    keywords: ["reports"],
    requiredCapability: "workspace:CreateExport"
  },
  {
    href: "/workspace",
    label: "Workspace settings",
    Icon: Settings2,
    keywords: ["workspace", "timezone", "organization"],
    requiredCapability: "workspace:UpdateSettings"
  },
  { href: "/support", label: "Support", Icon: LifeBuoy, keywords: ["help", "ticket"] }
] as const;

export function filterNavByCapabilities(
  items: readonly AppNavItem[],
  capabilities: readonly Permission[]
): AppNavItem[] {
  const allowed = new Set(capabilities);
  return items.filter((item) => !item.requiredCapability || allowed.has(item.requiredCapability));
}
