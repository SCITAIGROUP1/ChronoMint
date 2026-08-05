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
  Home,
  LayoutDashboard,
  ListTodo,
  Send,
  Settings2,
  Tags,
  Timer,
  Users,
  LifeBuoy
} from "lucide-react";

export type AppNavSection = "workspace" | "my-time" | "support";

export const APP_NAV_SECTION_LABELS: Record<AppNavSection, string> = {
  workspace: "Workspace",
  "my-time": "My time",
  support: "Support"
};

export type AppNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  section: AppNavSection;
  tourId?: string;
  keywords?: readonly string[];
  /** Single required capability (AND with visibility). */
  requiredCapability?: Permission;
  /** If set, user needs at least one of these capabilities. */
  requiredAnyCapabilities?: readonly Permission[];
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
    section: "workspace",
    keywords: ["analytics", "home"]
  },
  {
    href: "/overview",
    label: "Overview",
    Icon: Home,
    section: "my-time",
    keywords: ["personal", "home", "summary"]
  },
  {
    href: "/timer",
    label: "Timer",
    Icon: Timer,
    section: "my-time",
    tourId: "nav-timer",
    requiredCapability: "personal:ManageTimer"
  },
  {
    href: "/timesheet",
    label: "Timesheet",
    Icon: CalendarDays,
    section: "my-time",
    requiredCapability: "personal:SubmitTimesheets"
  },
  {
    href: "/submissions",
    label: "Submissions",
    Icon: Send,
    section: "my-time",
    tourId: "nav-submissions",
    requiredCapability: "personal:SubmitTimesheets"
  },
  {
    href: "/my-projects",
    label: "My Projects",
    Icon: FolderKanban,
    section: "my-time",
    keywords: ["assigned projects", "my work"],
    requiredCapability: "personal:ListProjects"
  },
  {
    href: "/time-tracker",
    label: "Time Tracker",
    Icon: Clock,
    section: "my-time",
    tourId: "nav-time-tracker",
    keywords: ["timelogs", "hours", "import", "export", "entry"],
    requiredCapability: "personal:ManageTimelogs"
  },
  {
    href: "/projects",
    label: "Projects",
    Icon: FolderKanban,
    section: "workspace",
    tourId: "nav-projects",
    keywords: ["clients"],
    requiredAnyCapabilities: ["workspace:CreateProject", "project:Read"]
  },
  {
    href: "/tasks",
    label: "Tasks",
    Icon: ListTodo,
    section: "workspace",
    requiredCapability: "personal:ListProjects"
  },
  {
    href: "/team-time-tracker",
    label: "Team Time Tracker",
    Icon: Clock,
    section: "workspace",
    keywords: ["team timelogs", "member hours", "admin time"],
    requiredAnyCapabilities: ["workspace:ReadReports", "project:ReadReports"]
  },
  {
    href: "/notifications",
    label: "Notifications",
    Icon: Bell,
    section: "my-time",
    requiredCapability: "personal:ReadNotifications"
  },
  {
    href: "/team-management",
    label: "Team Management",
    Icon: Users,
    section: "workspace",
    keywords: ["members", "invite", "people"],
    requiredCapability: "workspace:ManageMembers"
  },
  {
    href: "/project-managers",
    label: "Project managers",
    Icon: Briefcase,
    section: "workspace",
    keywords: ["pm", "project manager", "managers", "provisioning"],
    requiredCapability: "workspace:ManageMembers"
  },
  {
    href: "/categories",
    label: "Categories",
    Icon: Tags,
    section: "workspace",
    requiredCapability: "workspace:ManageCategories"
  },
  {
    href: "/team",
    label: "Team Live",
    Icon: Activity,
    section: "workspace",
    keywords: ["presence", "tracking"],
    requiredCapability: "project:ReadPresence"
  },
  {
    href: "/approvals",
    label: "Approvals",
    Icon: ClipboardCheck,
    section: "workspace",
    keywords: ["timesheets", "submissions"],
    requiredCapability: "project:ReviewTimesheets"
  },
  {
    href: "/billing",
    label: "Hourly rates",
    Icon: CircleDollarSign,
    section: "workspace",
    keywords: ["billing", "rates", "hourly"],
    requiredCapability: "workspace:ManageBillingRates"
  },
  {
    href: "/exports",
    label: "Exports",
    Icon: Download,
    section: "workspace",
    keywords: ["reports"],
    requiredCapability: "workspace:CreateExport"
  },
  {
    href: "/workspace",
    label: "Workspace settings",
    Icon: Settings2,
    section: "workspace",
    keywords: ["workspace", "timezone", "organization"],
    requiredCapability: "workspace:UpdateSettings"
  },
  {
    href: "/support",
    label: "Support",
    Icon: LifeBuoy,
    section: "support",
    keywords: ["help", "ticket"]
  }
] as const;

export const APP_NAV_SECTION_ORDER: readonly AppNavSection[] = ["workspace", "my-time", "support"];

export function filterNavByCapabilities(
  items: readonly AppNavItem[],
  capabilities: readonly Permission[]
): AppNavItem[] {
  const allowed = new Set(capabilities);
  return items.filter((item) => {
    if (item.requiredAnyCapabilities?.length) {
      return item.requiredAnyCapabilities.some((capability) => allowed.has(capability));
    }
    return !item.requiredCapability || allowed.has(item.requiredCapability);
  });
}
