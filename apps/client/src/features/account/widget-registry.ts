import {
  COMMERCIAL_ACCOUNT_WIDGET_IDS,
  isClientCommercialFeaturesEnabled as isCommercialFeaturesEnabled
} from "@kloqra/web-shared";
import {
  CreditCard,
  Building2,
  Users,
  Clock,
  DollarSign,
  PieChart as PieIcon,
  Activity,
  BarChart3,
  Contact2,
  Briefcase
} from "lucide-react";

export type WidgetGroup = "kpi" | "org" | "charts" | "table";

export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  group: WidgetGroup;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  defaultVisible: boolean;
  iconName: string;
}

export interface WidgetLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

export const WIDGET_GROUPS: { value: WidgetGroup; label: string }[] = [
  { value: "kpi", label: "KPI Stats Cards" },
  { value: "org", label: "Organization Info" },
  { value: "charts", label: "Charts & Analytics" },
  { value: "table", label: "Data Tables" }
];

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: "kpi_plan",
    label: "Subscription Plan",
    description: "Displays current active plan tier and billing status",
    group: "kpi",
    defaultSize: { w: 4, h: 1 },
    minSize: { w: 3, h: 1 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "CreditCard"
  },
  {
    id: "kpi_workspaces",
    label: "Total Workspaces",
    description: "Number of active workspaces in organization",
    group: "kpi",
    defaultSize: { w: 4, h: 1 },
    minSize: { w: 3, h: 1 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "Building2"
  },
  {
    id: "kpi_seats",
    label: "Seats Utilization",
    description: "Active users count versus plan limits",
    group: "kpi",
    defaultSize: { w: 4, h: 1 },
    minSize: { w: 3, h: 1 },
    maxSize: { w: 6, h: 2 },
    defaultVisible: true,
    iconName: "Users"
  },
  {
    id: "org_profile",
    label: "Organization Profile",
    description: "Display name and unique slug/ID identifier",
    group: "org",
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 1 },
    defaultVisible: true,
    iconName: "Contact2"
  },
  {
    id: "kpi_total_hours",
    label: "Total Hours Rollup",
    description: "Total tracked duration inside the selected period",
    group: "kpi",
    defaultSize: { w: 3, h: 1 },
    minSize: { w: 3, h: 1 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Clock"
  },
  {
    id: "kpi_billable_amount",
    label: "Billable Amount Rollup",
    description: "Sum of financial value generated in the period",
    group: "kpi",
    defaultSize: { w: 3, h: 1 },
    minSize: { w: 3, h: 1 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "DollarSign"
  },
  {
    id: "kpi_active_members",
    label: "Active Members Rollup",
    description: "Total members logging time during this range",
    group: "kpi",
    defaultSize: { w: 3, h: 1 },
    minSize: { w: 3, h: 1 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Users"
  },
  {
    id: "kpi_active_workspaces",
    label: "Active Workspaces Rollup",
    description: "Count of workspaces active in this range",
    group: "kpi",
    defaultSize: { w: 3, h: 1 },
    minSize: { w: 3, h: 1 },
    maxSize: { w: 4, h: 2 },
    defaultVisible: true,
    iconName: "Building2"
  },
  {
    id: "chart_workload",
    label: "Workload Allocation",
    description: "Percentage breakdown donut of workspace hours",
    group: "charts",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
    defaultVisible: true,
    iconName: "PieIcon"
  },
  {
    id: "chart_efficiency",
    label: "Utilisation Efficiency",
    description: "Stacked hours chart of billable vs non-billable",
    group: "charts",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
    defaultVisible: true,
    iconName: "Activity"
  },
  {
    id: "chart_revenue",
    label: "Revenue Generated",
    description: "Bar chart comparing revenue per workspace",
    group: "charts",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
    defaultVisible: true,
    iconName: "BarChart3"
  },
  {
    id: "table_workspace_details",
    label: "Workspace Details Table",
    description: "Rollup drill-down data table of logged metrics",
    group: "table",
    defaultSize: { w: 12, h: 6 },
    minSize: { w: 6, h: 4 },
    defaultVisible: true,
    iconName: "Briefcase"
  }
];

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: "kpi_plan", x: 0, y: 0, w: 4, h: 1, visible: true },
  { i: "kpi_workspaces", x: 4, y: 0, w: 4, h: 1, visible: true },
  { i: "kpi_seats", x: 8, y: 0, w: 4, h: 1, visible: true },
  { i: "org_profile", x: 0, y: 1, w: 12, h: 2, visible: true },
  { i: "kpi_total_hours", x: 0, y: 3, w: 3, h: 1, visible: true },
  { i: "kpi_billable_amount", x: 3, y: 3, w: 3, h: 1, visible: true },
  { i: "kpi_active_members", x: 6, y: 3, w: 3, h: 1, visible: true },
  { i: "kpi_active_workspaces", x: 9, y: 3, w: 3, h: 1, visible: true },
  { i: "chart_workload", x: 0, y: 4, w: 4, h: 5, visible: true },
  { i: "chart_efficiency", x: 4, y: 4, w: 4, h: 5, visible: true },
  { i: "chart_revenue", x: 8, y: 4, w: 4, h: 5, visible: true },
  { i: "table_workspace_details", x: 0, y: 9, w: 12, h: 6, visible: true }
];

const HEADLINE_KPI_IDS = ["kpi_plan", "kpi_workspaces", "kpi_seats"] as const;
const ROLLUP_KPI_IDS = [
  "kpi_total_hours",
  "kpi_billable_amount",
  "kpi_active_members",
  "kpi_active_workspaces"
] as const;
const CHART_IDS = ["chart_workload", "chart_efficiency", "chart_revenue"] as const;

function visibleInOrder(items: WidgetLayoutItem[], ids: readonly string[]): WidgetLayoutItem[] {
  return ids
    .map((id) => items.find((item) => item.i === id && item.visible !== false))
    .filter((item): item is WidgetLayoutItem => Boolean(item));
}

function packRow(
  items: WidgetLayoutItem[],
  ids: readonly string[],
  y: number,
  rowHeight: number,
  cols = 12
): WidgetLayoutItem[] {
  const row = visibleInOrder(items, ids);
  if (row.length === 0) return items;
  const w = Math.max(1, Math.floor(cols / row.length));
  const packed = new Map(row.map((item, index) => [item.i, index]));
  return items.map((item) => {
    const index = packed.get(item.i);
    if (index === undefined) return item;
    return { ...item, x: index * w, y, w, h: rowHeight };
  });
}

function rowLooksBroken(items: WidgetLayoutItem[], ids: readonly string[], cols = 12): boolean {
  const row = visibleInOrder(items, ids);
  if (row.length <= 1) return false;
  if (row.some((item) => item.y !== row[0]!.y || item.w >= 8)) return true;
  const sorted = [...row].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.x > sorted[i - 1]!.x + sorted[i - 1]!.w) return true;
  }
  const used = row.reduce((sum, item) => sum + item.w, 0);
  const smallest = Math.min(...row.map((item) => item.w));
  return used <= cols - smallest;
}

/** Undo stacked/gappy layouts left by xxs measure or filtered commercial widgets. */
export function repairAccountOverviewLayout(items: WidgetLayoutItem[]): WidgetLayoutItem[] {
  const headline = visibleInOrder(items, HEADLINE_KPI_IDS);
  let next = items;

  if (
    headline.length >= 2 &&
    (rowLooksBroken(next, HEADLINE_KPI_IDS) || headline.some((item) => item.h !== 1))
  ) {
    next = packRow(next, HEADLINE_KPI_IDS, 0, 1);
  }
  if (visibleInOrder(next, ROLLUP_KPI_IDS).length >= 2 && rowLooksBroken(next, ROLLUP_KPI_IDS)) {
    const y = Math.min(...visibleInOrder(next, ROLLUP_KPI_IDS).map((item) => item.y));
    next = packRow(next, ROLLUP_KPI_IDS, y, 1);
  }
  if (visibleInOrder(next, CHART_IDS).length >= 2 && rowLooksBroken(next, CHART_IDS)) {
    const charts = visibleInOrder(next, CHART_IDS);
    next = packRow(
      next,
      CHART_IDS,
      Math.min(...charts.map((item) => item.y)),
      Math.max(...charts.map((item) => item.h))
    );
  }
  return next;
}

export const WIDGET_ICONS: Record<string, any> = {
  CreditCard,
  Building2,
  Users,
  Clock,
  DollarSign,
  PieIcon,
  Activity,
  BarChart3,
  Contact2,
  Briefcase
};

const commercialIds = new Set<string>(COMMERCIAL_ACCOUNT_WIDGET_IDS);

export const ACTIVE_WIDGET_REGISTRY: WidgetDefinition[] = isCommercialFeaturesEnabled()
  ? WIDGET_REGISTRY
  : WIDGET_REGISTRY.filter((w) => !commercialIds.has(w.id));

export const ACTIVE_DEFAULT_LAYOUT: WidgetLayoutItem[] = repairAccountOverviewLayout(
  isCommercialFeaturesEnabled()
    ? DEFAULT_LAYOUT
    : DEFAULT_LAYOUT.filter((item) => !commercialIds.has(item.i))
);
