"use client";

import {
  AppBarActionButton,
  Button,
  CenteredLoader,
  DateRangePicker,
  EmptyState,
  PageLayout,
  SegmentedControl,
  WidgetShell
} from "@kloqra/ui";
import {
  localMidnightUtcInZone,
  todayInZone,
  CopyableValue,
  useTenantAnalyticsSummary,
  useTenantOverview,
  buildWidgetMinSizeMap,
  DashboardArrangeBanner,
  DASHBOARD_GRID_BREAKPOINTS,
  DASHBOARD_GRID_COLS,
  generateResponsiveLayouts,
  isPendingWorkspaceSetup,
  isPersistableDashboardBreakpoint,
  type DashboardBreakpoint
} from "@kloqra/web-shared";
import "react-grid-layout/css/styles.css";
import { Building2, Clock, CreditCard, DollarSign, Users, LayoutGrid, Move } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { toast } from "sonner";
import { AccountWorkspaceHoursTable } from "./account-workspace-hours-table";
import { useAccountWidgetLayout } from "./use-account-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import {
  ACTIVE_WIDGET_REGISTRY as WIDGET_REGISTRY,
  repairAccountOverviewLayout,
  type WidgetLayoutItem
} from "./widget-registry";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { formatDurationClock } from "@/components/report-charts";
import { useSessionStore } from "@/stores/session.store";

type AccountRollupPreset = "7d" | "30d" | "90d" | "custom";

const ResponsiveGridLayout = WidthProvider(Responsive);
const EMPTY_ACCOUNT_LAYOUT: WidgetLayoutItem[] = [];

const ROLLUP_PRESETS: { value: AccountRollupPreset; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" }
];

const CHART_COLORS = ["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#0ea5e9", "#f43f5e"];

function formatDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function applyAccountRollupPreset(preset: AccountRollupPreset, timezone: string) {
  if (preset === "custom") {
    return applyAccountRollupPreset("30d", timezone);
  }
  const to = todayInZone(timezone);
  const from = new Date(to);
  const daysBack = preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
  from.setDate(from.getDate() - daysBack);
  return { from: formatDateKey(from), to: formatDateKey(to) };
}

function dateKeysToIsoRange(start: string, end: string, timezone: string) {
  const [fy, fm, fd] = start.split("-").map(Number);
  const [ty, tm, td] = end.split("-").map(Number);
  const from = localMidnightUtcInZone(fy, fm, fd, timezone).toISOString();
  const to = new Date(
    localMidnightUtcInZone(ty, tm, td, timezone).getTime() + 24 * 60 * 60 * 1000 - 1
  ).toISOString();
  return { from, to };
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function isWorkspaceSetupError(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("workspace not found") || lower.includes("workspace required");
}

function AccountWorkspaceSetupPrompt({ onCreate }: { onCreate: () => void }) {
  return (
    <PageLayout
      title="Organization summary"
      description="Organization summary and plan status."
      scroll="page"
    >
      <EmptyState
        title="Create your first workspace"
        description="Your organization is ready. Create a workspace to view metrics, assign admins, and start tracking time."
        action={
          <Button type="button" onClick={onCreate}>
            Create workspace
          </Button>
        }
      />
    </PageLayout>
  );
}

export function AccountOverviewPage() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const initialRange = useMemo(() => applyAccountRollupPreset("30d", timezone), [timezone]);

  const [preset, setPreset] = useState<AccountRollupPreset>("30d");
  const [startDate, setStartDate] = useState(initialRange.from);
  const [endDate, setEndDate] = useState(initialRange.to);

  const {
    overview,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverview
  } = useTenantOverview();

  const goToWorkspaceSetup = () => router.push("/account/workspaces?setup=required");

  const { from, to } = useMemo(
    () => dateKeysToIsoRange(startDate, endDate, timezone),
    [startDate, endDate, timezone]
  );

  const {
    summary,
    loading: rollupLoading,
    error: rollupError
  } = useTenantAnalyticsSummary(from, to);

  useEffect(() => {
    if (preset !== "custom") {
      const next = applyAccountRollupPreset(preset, timezone);
      setStartDate(next.from);
      setEndDate(next.to);
    }
  }, [preset, timezone]);

  function handlePresetChange(next: AccountRollupPreset) {
    setPreset(next);
    if (next !== "custom") {
      const range = applyAccountRollupPreset(next, timezone);
      setStartDate(range.from);
      setEndDate(range.to);
    }
  }

  function handleDateRangeChange(fromKey: string, toKey: string) {
    setStartDate(fromKey);
    setEndDate(toKey);
    setPreset("custom");
  }

  // Pre-process workspace chart datasets
  const workloadData = useMemo(() => {
    if (!summary?.byWorkspace) return [];
    return summary.byWorkspace.map((row) => ({
      name: row.workspaceName,
      value: Number(row.totalHours.toFixed(2))
    }));
  }, [summary]);

  const billabilityData = useMemo(() => {
    if (!summary?.byWorkspace) return [];
    return summary.byWorkspace.map((row) => ({
      name: row.workspaceName,
      Billable: Number(row.billableHours.toFixed(2)),
      "Non-Billable": Number(Math.max(0, row.totalHours - row.billableHours).toFixed(2))
    }));
  }, [summary]);

  const revenueData = useMemo(() => {
    if (!summary?.byWorkspace) return [];
    return summary.byWorkspace.map((row) => ({
      name: row.workspaceName,
      Revenue: Number(row.billableAmount.toFixed(2)),
      currency: row.currency || "USD"
    }));
  }, [summary]);

  // Layout engine state
  const tenantSlug = overview?.tenant?.slug || "default";
  const layoutState = useAccountWidgetLayout();
  const [mounted, setMounted] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const arrangeSnapshotRef = useRef<WidgetLayoutItem[] | null>(null);
  const [gridBreakpoint, setGridBreakpoint] = useState<DashboardBreakpoint>("lg");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (tenantSlug) {
      void layoutState.initialize(tenantSlug);
    }
  }, [tenantSlug]);

  const storedLayout = layoutState.layoutsByWorkspace[tenantSlug] ?? EMPTY_ACCOUNT_LAYOUT;
  const activeLayout = useMemo(() => repairAccountOverviewLayout(storedLayout), [storedLayout]);
  const visibleItems = activeLayout.filter((item) => item.visible);
  const widgetMinSizes = useMemo(() => buildWidgetMinSizeMap(WIDGET_REGISTRY), []);

  const responsiveLayouts = useMemo(
    () => generateResponsiveLayouts(visibleItems, DASHBOARD_GRID_COLS, widgetMinSizes),
    [visibleItems, widgetMinSizes]
  );

  const handleResetLayout = () => {
    void layoutState
      .resetLayout(tenantSlug)
      .then(() => toast.success("Dashboard layout reset to default"))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not reset layout"));
  };

  const handleCancelArranging = () => {
    if (arrangeSnapshotRef.current) {
      layoutState.restoreLayout(tenantSlug, arrangeSnapshotRef.current);
    }
    setIsArranging(false);
  };

  const handleDoneArranging = async () => {
    try {
      await layoutState.persistLayout(tenantSlug);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
      toast.success("Dashboard layout saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save layout");
    }
  };

  const handleDoneAndSaveAsDefault = async () => {
    try {
      await layoutState.persistLayout(tenantSlug);
      await layoutState.saveLayoutAsDefault(tenantSlug);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
      toast.success("Dashboard layout saved as default");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save default layout");
    }
  };

  if (overviewLoading) return <CenteredLoader label="Loading account overview…" />;
  if (isPendingWorkspaceSetup(session)) {
    return <AccountWorkspaceSetupPrompt onCreate={goToWorkspaceSetup} />;
  }
  if (isWorkspaceSetupError(overviewError) || overview?.workspaceCount === 0) {
    return <AccountWorkspaceSetupPrompt onCreate={goToWorkspaceSetup} />;
  }
  if (overviewError || !overview) {
    return (
      <PageLayout
        title="Organization summary"
        description="Organization summary and plan status."
        scroll="page"
      >
        <EmptyState
          title="Unable to load account overview"
          description={
            overviewError ??
            "We couldn't retrieve your organization summary. Check your connection and try again."
          }
          action={
            <Button variant="outline" onClick={() => void reloadOverview()}>
              Try again
            </Button>
          }
        />
      </PageLayout>
    );
  }

  const totals = summary?.totals;
  const billableHint =
    totals != null
      ? `${totals.billablePercent.toFixed(0)}% billable${totals.mixedCurrency ? " · mixed currencies" : ""}`
      : undefined;

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case "kpi_plan":
        return (
          <DashboardStatCard
            label="Plan"
            value={overview.subscription.planName}
            hint={overview.subscription.status.toUpperCase()}
            icon={CreditCard}
            tone="premium"
          />
        );
      case "kpi_workspaces":
        return (
          <DashboardStatCard
            label="Workspaces"
            value={String(overview.workspaceCount)}
            hint="In your organization"
            icon={Building2}
            tone="success"
          />
        );
      case "kpi_seats":
        return (
          <DashboardStatCard
            label="Seats Utilization"
            value={String(overview.seatCount)}
            hint="Active users licensed"
            icon={Users}
            tone="warning"
          />
        );
      case "org_profile":
        return (
          <div className="flex h-full min-h-0 w-full items-center justify-between gap-4 py-0.5">
            <div className="space-y-1">
              <span className="font-semibold text-foreground text-sm block">
                {overview.tenant.name}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Used in exports, billing records, and support channels.
              </span>
            </div>
            <div
              className="shrink-0 bg-muted/30 p-2 rounded-lg border border-border/60 select-none widget-no-drag"
              onClick={(e) => e.stopPropagation()}
            >
              <CopyableValue
                label="Organization ID"
                value={overview.tenant.slug}
                testId="copy-org-slug-overview"
              />
            </div>
          </div>
        );
      case "kpi_total_hours":
        return (
          <DashboardStatCard
            label="Total hours"
            value={totals ? formatDurationClock(totals.totalHours) : "0:00"}
            hint="Across all workspaces"
            icon={Clock}
            tone="primary"
          />
        );
      case "kpi_billable_amount":
        return (
          <DashboardStatCard
            label="Billable amount"
            value={totals ? formatMoney(totals.billableAmount, totals.currency) : "$0.00"}
            hint={billableHint}
            icon={DollarSign}
            tone="success"
          />
        );
      case "kpi_active_members":
        return (
          <DashboardStatCard
            label="Active members"
            value={totals ? String(totals.activeMembers) : "0"}
            hint="With logged time"
            icon={Users}
            tone="warning"
          />
        );
      case "kpi_active_workspaces":
        return (
          <DashboardStatCard
            label="Active workspaces"
            value={totals ? String(totals.activeWorkspaces) : "0"}
            hint="With logged time"
            icon={Building2}
            tone="premium"
          />
        );
      case "chart_workload":
        return (
          <div className="h-full w-full flex flex-col items-center justify-center p-2 min-h-0">
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workloadData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {workloadData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} hrs`, "Logged Time"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[9px] flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 shrink-0 border-t border-border/20 pt-2 w-full max-h-[80px] overflow-y-auto">
              {workloadData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 font-medium">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="truncate max-w-[80px] text-muted-foreground">{entry.name}</span>
                  <span className="text-foreground font-semibold">({entry.value}h)</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "chart_efficiency":
        return (
          <div className="w-full h-full p-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={billabilityData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`${value} hrs`]} />
                <Legend wrapperStyle={{ fontSize: "10px", marginTop: "5px" }} />
                <Bar dataKey="Billable" stackId="a" fill="#10b981" />
                <Bar dataKey="Non-Billable" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case "chart_revenue":
        return (
          <div className="w-full h-full p-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueData}
                layout="vertical"
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  type="number"
                  stroke="#888888"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#888888"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value, name, props) => [
                    formatMoney(Number(value), props.payload.currency),
                    "Revenue"
                  ]}
                />
                <Bar dataKey="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case "table_workspace_details":
        return (
          <div
            className="w-full h-full overflow-y-auto widget-no-drag"
            onClick={(e) => e.stopPropagation()}
          >
            <AccountWorkspaceHoursTable
              rows={summary?.byWorkspace ?? []}
              loading={rollupLoading}
              fallbackCurrency={totals?.currency ?? "USD"}
              formatMoney={formatMoney}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Organization summary"
      description="Organization summary and plan status."
      actions={
        <>
          <AppBarActionButton
            active={isCatalogOpen}
            aria-label={isCatalogOpen ? "Close catalog" : "Add widgets"}
            onClick={() => {
              setIsCatalogOpen(!isCatalogOpen);
              if (isArranging) {
                handleCancelArranging();
              }
            }}
          >
            <LayoutGrid className="size-4 shrink-0" aria-hidden />
            <span className="hidden @min-[1200px]/shell:inline">
              {isCatalogOpen ? "Close catalog" : "Add widgets"}
            </span>
          </AppBarActionButton>
          <AppBarActionButton
            active={isArranging}
            aria-label={isArranging ? "Done arranging" : "Arrange grid"}
            onClick={async () => {
              if (isArranging) {
                try {
                  await layoutState.persistLayout(tenantSlug);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
                  return;
                }
                arrangeSnapshotRef.current = null;
              } else {
                const current = layoutState.layoutsByWorkspace[tenantSlug];
                if (current) {
                  arrangeSnapshotRef.current = current.map((item) => ({ ...item }));
                }
              }
              setIsArranging(!isArranging);
              setIsCatalogOpen(false);
            }}
          >
            <Move className="size-4 shrink-0" aria-hidden />
            <span className="hidden @min-[1200px]/shell:inline">
              {isArranging ? "Done arranging" : "Arrange grid"}
            </span>
          </AppBarActionButton>
        </>
      }
      secondary={
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 @min-[720px]/shell:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] @min-[720px]/shell:items-end">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Period filter
            </span>
            <SegmentedControl
              value={preset}
              onChange={handlePresetChange}
              options={ROLLUP_PRESETS}
              size="sm"
              fullWidth
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Custom range
            </span>
            <DateRangePicker
              from={startDate}
              to={endDate}
              onChange={handleDateRangeChange}
              weekStartsOn={1}
              ariaLabel="Utilization date range"
              className="w-full min-w-0"
              numberOfMonths={2}
              popoverAlign="end"
            />
          </div>
        </div>
      }
    >
      {isCatalogOpen && (
        <WidgetControlPanel
          layoutItems={activeLayout}
          onToggleWidget={(id) => layoutState.toggleWidget(tenantSlug, id)}
          onResetLayout={handleResetLayout}
          onClose={() => setIsCatalogOpen(false)}
        />
      )}

      {isArranging && (
        <DashboardArrangeBanner
          editModeLabel="Organization Grid Edit Mode"
          onCancel={handleCancelArranging}
          onResetLayout={handleResetLayout}
          onDone={handleDoneArranging}
          onSaveAsDefault={handleDoneAndSaveAsDefault}
        />
      )}

      <section className="flex w-full min-w-0 flex-col gap-4" aria-label="Organization utilization">
        {rollupError && <div className="text-sm text-destructive">{rollupError}</div>}

        <div className="relative w-full min-w-0" data-testid="account-overview-grid">
          {!mounted || !layoutState.initialized ? (
            <CenteredLoader label="Loading dashboard layout..." />
          ) : (
            <ResponsiveGridLayout
              className={`layout w-full ${isArranging ? "layout-customizing" : ""}`}
              layouts={responsiveLayouts}
              breakpoints={DASHBOARD_GRID_BREAKPOINTS}
              cols={DASHBOARD_GRID_COLS}
              rowHeight={72}
              compactType="vertical"
              isDraggable={isArranging}
              isResizable={isArranging}
              draggableCancel="button, a, input, select, textarea, [role='menu'], [role='menuitem'], .widget-no-drag"
              resizeHandles={["s", "e", "se"]}
              onBreakpointChange={(breakpoint) =>
                setGridBreakpoint(breakpoint as DashboardBreakpoint)
              }
              onLayoutChange={(currentLayout) => {
                if (isArranging && isPersistableDashboardBreakpoint(gridBreakpoint)) {
                  layoutState.updateLayout(tenantSlug, currentLayout, { persist: false });
                }
              }}
              margin={[12, 12]}
              containerPadding={[0, 0]}
            >
              {visibleItems.map((item) => {
                const widgetDef = WIDGET_REGISTRY.find((w) => w.id === item.i);
                const label = widgetDef?.label ?? "Widget";
                return (
                  <div key={item.i} className="min-w-0 h-full w-full">
                    <WidgetShell
                      id={item.i}
                      label={label}
                      isEditing={isArranging}
                      className="h-full [&>div]:flex [&>div]:flex-col [&>div>div:last-child]:flex-1 [&>div>div:last-child]:min-h-0"
                      showTitleInView={widgetDef?.group !== "kpi" && widgetDef?.group !== "org"}
                    >
                      {renderWidgetContent(item.i)}
                    </WidgetShell>
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
