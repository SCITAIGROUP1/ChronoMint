"use client";

import {
  ROUTES,
  type MissingTimesheetDto,
  type PendingTimesheetDto,
  type ReviewedTimesheetDto,
  type TimesheetAmendmentDto
} from "@kloqra/contracts";
import {
  AppBar,
  AppBarSecondary,
  Badge,
  Button,
  Card,
  ConfirmNoteDialog,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  DismissableList,
  LoadingCrossfade,
  SegmentedControl,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  cn
} from "@kloqra/ui";
import { parseAdminApprovalsSearch, hasActiveApprovalsFilter } from "@kloqra/web-shared";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AmendmentRequestCard } from "./amendment-request-card";
import { ApprovalsFiltersBar } from "./approvals-filters-bar";
import { PendingTimesheetCard, PendingActivity } from "./pending-timesheet-card";
import { RemindMemberDialog } from "./remind-member-dialog";
import { ReviewedTimesheetCard } from "./reviewed-timesheet-card";
import { useApprovalsFilterOptions } from "./use-approvals-filter-options";
import { useApprovalsFilters } from "./use-approvals-filters";
import { useMissingTimesheets } from "./use-missing-timesheets";
import { usePendingAmendments } from "./use-pending-amendments";
import { usePendingTimesheets } from "./use-pending-timesheets";
import { useReviewedTimesheets } from "./use-reviewed-timesheets";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

type ApprovalsTab = "review" | "missing" | "amendments" | "approved" | "rejected";

const TAB_OPTIONS: { value: ApprovalsTab; label: string }[] = [
  { value: "review", label: "Pending review" },
  { value: "missing", label: "Missing" },
  { value: "amendments", label: "Amendments" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

function remindedToday(lastRemindedAt: string | null): boolean {
  if (!lastRemindedAt) return false;
  const reminded = new Date(lastRemindedAt);
  const now = new Date();
  return (
    reminded.getFullYear() === now.getFullYear() &&
    reminded.getMonth() === now.getMonth() &&
    reminded.getDate() === now.getDate()
  );
}

const formatDateRangeLocal = (startStr: string, endStr: string, timezone?: string) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: timezone ?? "UTC" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: timezone ?? "UTC" })}`;
};

interface PendingRowProps {
  item: PendingTimesheetDto;
  focused: boolean;
  isSelected: boolean;
  workspaceId: string;
  rangeLabel: string;
  actioning: boolean;
  onSelectChange: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
}

function PendingRow({
  item,
  focused,
  isSelected,
  workspaceId,
  rangeLabel,
  actioning,
  onSelectChange,
  onApprove,
  onReject
}: PendingRowProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <TableRow
        className={cn(
          focused && "bg-primary/5 ring-1 ring-inset ring-primary/30 animate-highlight-pulse"
        )}
      >
        <DataTableCell className="w-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectChange(e.target.checked)}
            disabled={actioning || Boolean(item.amendmentPending)}
            className="size-4 rounded border-gray-300 accent-emerald-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </DataTableCell>
        <DataTableCell className="w-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </Button>
        </DataTableCell>
        <DataTableCell>
          <div className="font-medium text-foreground text-left">{item.userName}</div>
          <div className="text-xs text-muted-foreground text-left">{item.userEmail}</div>
        </DataTableCell>
        <DataTableCell className="font-semibold text-primary text-left">
          {item.projectName}
        </DataTableCell>
        <DataTableCell className="text-xs font-medium text-muted-foreground text-left">
          {rangeLabel}
        </DataTableCell>
        <DataTableCell className="text-right font-mono font-medium whitespace-nowrap">
          {item.totalHours} hrs
        </DataTableCell>
        <DataTableCell className="text-xs text-muted-foreground text-left">
          {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "—"}
        </DataTableCell>
        <DataTableCell
          className="max-w-[200px] truncate text-xs text-left"
          title={item.note ?? undefined}
        >
          {item.note ?? "—"}
        </DataTableCell>
        <DataTableCell className="text-right">
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive px-2"
              onClick={onReject}
              disabled={actioning || Boolean(item.amendmentPending)}
            >
              <X className="size-3.5" />
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2"
              onClick={onApprove}
              disabled={actioning || Boolean(item.amendmentPending)}
            >
              <Check className="size-3.5 animate-in fade-in" />
            </Button>
          </div>
        </DataTableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/5 hover:bg-muted/5">
          <DataTableCell colSpan={9} className="p-0 border-t border-b border-border/40">
            <div className="p-4 bg-muted/10 text-left">
              <PendingActivity item={item} workspaceId={workspaceId} />
            </div>
          </DataTableCell>
        </TableRow>
      )}
    </>
  );
}

interface ReviewedRowProps {
  item: ReviewedTimesheetDto;
  focused: boolean;
  workspaceId: string;
  rangeLabel: string;
}

function ReviewedRow({ item, focused, workspaceId, rangeLabel }: ReviewedRowProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <TableRow
        className={cn(
          focused && "bg-primary/5 ring-1 ring-inset ring-primary/30 animate-highlight-pulse"
        )}
      >
        <DataTableCell className="w-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </Button>
        </DataTableCell>
        <DataTableCell>
          <div className="font-medium text-foreground text-left">{item.userName}</div>
          <div className="text-xs text-muted-foreground text-left">{item.userEmail}</div>
        </DataTableCell>
        <DataTableCell className="font-semibold text-primary text-left">
          {item.projectName}
        </DataTableCell>
        <DataTableCell className="text-xs font-medium text-muted-foreground text-left">
          {rangeLabel}
        </DataTableCell>
        <DataTableCell className="text-right font-mono font-medium whitespace-nowrap">
          {item.totalHours} hrs
        </DataTableCell>
        <DataTableCell className="text-xs text-muted-foreground text-left">
          {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "—"}
        </DataTableCell>
        <DataTableCell className="text-xs font-medium text-foreground text-left">
          {item.reviewedByName ?? "—"}
        </DataTableCell>
        <DataTableCell
          className="max-w-[150px] truncate text-xs text-left"
          title={item.note ?? undefined}
        >
          {item.note ?? "—"}
        </DataTableCell>
        <DataTableCell
          className="max-w-[200px] truncate text-xs text-left"
          title={item.reviewNote ?? undefined}
        >
          {item.reviewNote ?? "—"}
        </DataTableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/5 hover:bg-muted/5">
          <DataTableCell colSpan={9} className="p-0 border-t border-b border-border/40">
            <div className="p-4 bg-muted/10 text-left">
              <PendingActivity item={item} workspaceId={workspaceId} />
            </div>
          </DataTableCell>
        </TableRow>
      )}
    </>
  );
}

interface AmendmentRowProps {
  item: TimesheetAmendmentDto;
  focused: boolean;
  isSelected: boolean;
  actioning: boolean;
  onSelectChange: (checked: boolean) => void;
  onApprove: () => void;
  onDeny: () => void;
}

function AmendmentRow({
  item,
  focused,
  isSelected,
  actioning,
  onSelectChange,
  onApprove,
  onDeny
}: AmendmentRowProps) {
  return (
    <TableRow
      className={cn(
        focused && "bg-primary/5 ring-1 ring-inset ring-primary/30 animate-highlight-pulse"
      )}
    >
      <DataTableCell className="w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelectChange(e.target.checked)}
          disabled={actioning}
          className="size-4 rounded border-gray-300 accent-emerald-600 cursor-pointer disabled:opacity-50"
        />
      </DataTableCell>
      <DataTableCell>
        <div className="font-medium text-foreground text-left">{item.userName}</div>
        <div className="text-xs text-muted-foreground text-left">{item.userEmail}</div>
      </DataTableCell>
      <DataTableCell className="font-semibold text-primary text-left">
        {item.projectName}
      </DataTableCell>
      <DataTableCell className="text-xs font-medium text-muted-foreground text-left">
        {item.periodLabel}
      </DataTableCell>
      <DataTableCell className="max-w-[250px] truncate text-xs text-left" title={item.reason}>
        {item.reason}
      </DataTableCell>
      <DataTableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive px-2"
            onClick={onDeny}
            disabled={actioning}
          >
            Deny
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2"
            onClick={onApprove}
            disabled={actioning}
          >
            Approve
          </Button>
        </div>
      </DataTableCell>
    </TableRow>
  );
}

export function ApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const deepLink = useMemo(() => parseAdminApprovalsSearch(search), [search]);
  const tab: ApprovalsTab = deepLink.tab ?? "review";
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { filters, setFilters, clearFilters } = useApprovalsFilters();
  const {
    projectOptions,
    memberOptions,
    loading: filterOptionsLoading
  } = useApprovalsFilterOptions(ws, Boolean(ws));
  const [anchorDate] = useState(() => new Date());
  const [remindTarget, setRemindTarget] = useState<MissingTimesheetDto | null>(null);
  const [reminding, setReminding] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<"card" | "table">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kloqra_admin_approvals_view_mode");
      if (saved === "card" || saved === "table") return saved;
    }
    return "card";
  });

  const handleViewModeChange = (mode: "card" | "table") => {
    setViewMode(mode);
    localStorage.setItem("kloqra_admin_approvals_view_mode", mode);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [bulkActioning, setBulkActioning] = useState(false);
  const [confirmActionId, setConfirmActionId] = useState<{
    id: string;
    action: "approve" | "reject";
    userName: string;
    projectName: string;
    range: string;
  } | null>(null);

  const { pending, loading, actioningId, handleReview, fetchPending } = usePendingTimesheets(
    ws,
    filters,
    tab === "review"
  );

  useEffect(() => {
    setSelectedIds([]);
  }, [tab, ws]);

  const handleBulkReview = async (action: "approve" | "reject", comment: string) => {
    if (!ws || selectedIds.length === 0) return;
    setBulkActioning(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map(async (id) => {
          const endpoint =
            action === "approve" ? ROUTES.TIMESHEETS.APPROVE(id) : ROUTES.TIMESHEETS.REJECT(id);
          await api(endpoint, {
            method: "PATCH",
            workspaceId: ws,
            body: JSON.stringify({ reviewNote: comment || undefined })
          });
        })
      );

      const succeededCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.length - succeededCount;
      if (succeededCount > 0) {
        toast.success(
          `Successfully ${action === "approve" ? "approved" : "rejected"} ${succeededCount} timesheet(s).`
        );
      }
      if (failedCount > 0) {
        toast.error(`Failed to ${action} ${failedCount} timesheet(s).`);
      }

      setSelectedIds([]);
      await fetchPending();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to run bulk review");
    } finally {
      setBulkActioning(false);
    }
  };
  const {
    missing,
    loading: missingLoading,
    refresh: refreshMissing
  } = useMissingTimesheets(ws, anchorDate, filters, tab === "missing");
  const {
    amendments,
    loading: amendmentsLoading,
    actioningId: amendmentActioningId,
    handleReview: handleAmendmentReview
  } = usePendingAmendments(ws, filters, tab === "amendments");
  const { items: approved, loading: approvedLoading } = useReviewedTimesheets(
    ws,
    "APPROVED",
    filters,
    tab === "approved"
  );
  const { items: rejected, loading: rejectedLoading } = useReviewedTimesheets(
    ws,
    "REJECTED",
    filters,
    tab === "rejected"
  );

  const setTab = useCallback(
    (next: ApprovalsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`/approvals?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (!focusRef.current) return;
    focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [deepLink.periodId, deepLink.amendmentId, tab]);

  async function sendReminder(message: string) {
    if (!ws || !remindTarget) return;
    setReminding(true);
    try {
      await api(ROUTES.TIMESHEETS.REMIND, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          userId: remindTarget.userId,
          projectId: remindTarget.projectId,
          date: remindTarget.periodStart,
          message: message || undefined
        })
      });
      toast.success("Reminder sent");
      setRemindTarget(null);
      await refreshMissing();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reminder");
    } finally {
      setReminding(false);
    }
  }

  const tabOptions = TAB_OPTIONS.map((opt) => {
    if (opt.value === "review" && pending.length > 0) {
      return { ...opt, label: `Pending review (${pending.length})` };
    }
    if (opt.value === "missing" && missing.length > 0) {
      return { ...opt, label: `Missing (${missing.length})` };
    }
    if (opt.value === "amendments" && amendments.length > 0) {
      return { ...opt, label: `Amendments (${amendments.length})` };
    }
    if (opt.value === "approved" && approved.length > 0) {
      return { ...opt, label: `Approved (${approved.length})` };
    }
    if (opt.value === "rejected" && rejected.length > 0) {
      return { ...opt, label: `Rejected (${rejected.length})` };
    }
    return opt;
  });

  return (
    <div className="space-y-6">
      <AppBar
        title="Approvals"
        description="Review submitted timesheets, remind missing submissions, and handle edit requests."
        secondary={
          <AppBarSecondary
            trailing={<SegmentedControl value={tab} onChange={setTab} options={tabOptions} />}
          />
        }
      />

      <ApprovalsFiltersBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        projectOptions={projectOptions}
        memberOptions={memberOptions}
        loading={filterOptionsLoading}
        showSort={tab === "review"}
        viewMode={viewMode}
        onViewModeChange={tab !== "missing" ? handleViewModeChange : undefined}
        resultCount={
          tab === "review"
            ? pending.length
            : tab === "missing"
              ? missing.length
              : tab === "amendments"
                ? amendments.length
                : tab === "approved"
                  ? approved.length
                  : tab === "rejected"
                    ? rejected.length
                    : undefined
        }
      />

      {tab === "review" ? (
        <LoadingCrossfade loading={loading} loaderLabel="Loading pending timesheets…">
          {pending.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">
                {hasActiveApprovalsFilter(filters)
                  ? "No matching timesheets"
                  : "All timesheets reviewed"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                {hasActiveApprovalsFilter(filters)
                  ? "Try clearing filters or choose a different project, member, or date range."
                  : "You have no pending timesheet approvals left for this workspace."}
              </p>
            </Card>
          ) : viewMode === "table" ? (
            <div className="rounded-lg border border-border/60 overflow-x-auto animate-fade-in">
              <Table className="text-sm">
                <TableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={pending.length > 0 && selectedIds.length === pending.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(pending.map((p) => p.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="size-4 rounded border-gray-300 accent-emerald-600 cursor-pointer"
                      />
                    </DataTableHead>
                    <DataTableHead className="w-8"></DataTableHead>
                    <DataTableHead>Member</DataTableHead>
                    <DataTableHead>Project</DataTableHead>
                    <DataTableHead>Period</DataTableHead>
                    <DataTableHead className="text-right">Hours</DataTableHead>
                    <DataTableHead>Submitted At</DataTableHead>
                    <DataTableHead>Note</DataTableHead>
                    <DataTableHead className="text-right">Actions</DataTableHead>
                  </DataTableHeaderRow>
                </TableHeader>
                <TableBody>
                  {pending.map((item) => {
                    const focused = deepLink.periodId === item.id || deepLink.batch === item.id;
                    const periodLabel =
                      item.approvalPeriod === "daily"
                        ? "Day"
                        : item.approvalPeriod === "monthly"
                          ? "Month"
                          : "Week";
                    const rangeLabel = `${periodLabel}: ${formatDateRangeLocal(item.periodStart, item.periodEnd)}`;
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <PendingRow
                        key={item.id}
                        item={item}
                        focused={focused}
                        isSelected={isSelected}
                        workspaceId={ws}
                        rangeLabel={rangeLabel}
                        actioning={actioningId === item.id}
                        onSelectChange={(checked) => {
                          if (checked) {
                            setSelectedIds((prev) => [...prev, item.id]);
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                          }
                        }}
                        onApprove={() => {
                          setConfirmActionId({
                            id: item.id,
                            action: "approve",
                            userName: item.userName,
                            projectName: item.projectName,
                            range: rangeLabel
                          });
                        }}
                        onReject={() => {
                          setConfirmActionId({
                            id: item.id,
                            action: "reject",
                            userName: item.userName,
                            projectName: item.projectName,
                            range: rangeLabel
                          });
                        }}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <DismissableList
              items={pending}
              className="grid gap-4 md:grid-cols-2"
              renderItem={(t) => {
                const focused = deepLink.periodId === t.id || deepLink.batch === t.id;
                return (
                  <div ref={focused ? focusRef : undefined}>
                    <PendingTimesheetCard
                      item={t}
                      workspaceId={ws}
                      onReview={(action, note) => void handleReview(t.id, action, note)}
                      actioning={actioningId === t.id}
                      highlighted={focused}
                      selected={selectedIds.includes(t.id)}
                      onSelectChange={(checked) => {
                        if (checked) {
                          setSelectedIds((prev) => [...prev, t.id]);
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => id !== t.id));
                        }
                      }}
                    />
                  </div>
                );
              }}
            />
          )}
        </LoadingCrossfade>
      ) : tab === "missing" ? (
        <LoadingCrossfade loading={missingLoading} loaderLabel="Loading missing submissions…">
          {missing.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">Everyone has submitted for the selected period</p>
            </Card>
          ) : (
            <div className="rounded-lg border border-border/60 overflow-x-auto animate-fade-in">
              <Table className="text-sm">
                <TableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead>Member</DataTableHead>
                    <DataTableHead>Project</DataTableHead>
                    <DataTableHead>Period</DataTableHead>
                    <DataTableHead className="text-right">Hours</DataTableHead>
                    <DataTableHead>Last reminded</DataTableHead>
                    <DataTableHead className="text-right">Actions</DataTableHead>
                  </DataTableHeaderRow>
                </TableHeader>
                <TableBody>
                  {missing.map((row) => {
                    const reminded = remindedToday(row.lastRemindedAt);
                    return (
                      <TableRow key={`${row.userId}:${row.projectId}:${row.periodStart}`}>
                        <DataTableCell>
                          <div className="font-medium">{row.userName}</div>
                          <div className="text-xs text-muted-foreground">{row.userEmail}</div>
                        </DataTableCell>
                        <DataTableCell>{row.projectName}</DataTableCell>
                        <DataTableCell>{row.periodLabel}</DataTableCell>
                        <DataTableCell className="text-right font-mono">
                          {row.totalHours.toFixed(1)}
                        </DataTableCell>
                        <DataTableCell className="text-xs text-muted-foreground">
                          {row.lastRemindedAt
                            ? new Date(row.lastRemindedAt).toLocaleString()
                            : "Never"}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {reminded ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Reminded today
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setRemindTarget(row)}
                            >
                              Remind
                            </Button>
                          )}
                        </DataTableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </LoadingCrossfade>
      ) : tab === "amendments" ? (
        <LoadingCrossfade loading={amendmentsLoading} loaderLabel="Loading edit requests…">
          {amendments.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">No pending edit requests</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Use Reject on the Pending review tab if you initiated the correction request.
              </p>
            </Card>
          ) : viewMode === "table" ? (
            <div className="rounded-lg border border-border/60 overflow-x-auto animate-fade-in">
              <Table className="text-sm">
                <TableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={amendments.length > 0 && selectedIds.length === amendments.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(amendments.map((a) => a.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="size-4 rounded border-gray-300 accent-emerald-600 cursor-pointer"
                      />
                    </DataTableHead>
                    <DataTableHead>Member</DataTableHead>
                    <DataTableHead>Project</DataTableHead>
                    <DataTableHead>Period</DataTableHead>
                    <DataTableHead>Reason</DataTableHead>
                    <DataTableHead className="text-right">Actions</DataTableHead>
                  </DataTableHeaderRow>
                </TableHeader>
                <TableBody>
                  {amendments.map((item) => {
                    const focused = deepLink.amendmentId === item.id;
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <AmendmentRow
                        key={item.id}
                        item={item}
                        focused={focused}
                        isSelected={isSelected}
                        actioning={amendmentActioningId === item.id}
                        onSelectChange={(checked) => {
                          if (checked) {
                            setSelectedIds((prev) => [...prev, item.id]);
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                          }
                        }}
                        onApprove={() =>
                          void handleAmendmentReview(item.id, "approve").then(() => fetchPending())
                        }
                        onDeny={() =>
                          void handleAmendmentReview(item.id, "deny").then(() => fetchPending())
                        }
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <DismissableList
              items={amendments}
              className="grid gap-4 md:grid-cols-2"
              renderItem={(item) => {
                const focused = deepLink.amendmentId === item.id;
                return (
                  <div ref={focused ? focusRef : undefined}>
                    <AmendmentRequestCard
                      item={item}
                      onReview={(action, note) =>
                        void handleAmendmentReview(item.id, action, note).then(() => fetchPending())
                      }
                      actioning={amendmentActioningId === item.id}
                      highlighted={focused}
                    />
                  </div>
                );
              }}
            />
          )}
        </LoadingCrossfade>
      ) : tab === "approved" ? (
        <LoadingCrossfade loading={approvedLoading} loaderLabel="Loading approved timesheets…">
          {approved.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">
                {hasActiveApprovalsFilter(filters)
                  ? "No matching approved timesheets"
                  : "No approved timesheets yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                {hasActiveApprovalsFilter(filters)
                  ? "Try clearing filters or choose a different project, member, or date range."
                  : "Approved submissions will appear here after you review pending timesheets."}
              </p>
            </Card>
          ) : viewMode === "table" ? (
            <div className="rounded-lg border border-border/60 overflow-x-auto animate-fade-in">
              <Table className="text-sm">
                <TableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead className="w-8"></DataTableHead>
                    <DataTableHead>Member</DataTableHead>
                    <DataTableHead>Project</DataTableHead>
                    <DataTableHead>Period</DataTableHead>
                    <DataTableHead className="text-right">Hours</DataTableHead>
                    <DataTableHead>Reviewed At</DataTableHead>
                    <DataTableHead>Reviewed By</DataTableHead>
                    <DataTableHead>Note</DataTableHead>
                    <DataTableHead>Review Comment</DataTableHead>
                  </DataTableHeaderRow>
                </TableHeader>
                <TableBody>
                  {approved.map((item) => {
                    const focused = deepLink.periodId === item.id;
                    const periodLabel =
                      item.approvalPeriod === "daily"
                        ? "Day"
                        : item.approvalPeriod === "monthly"
                          ? "Month"
                          : "Week";
                    const rangeLabel = `${periodLabel}: ${formatDateRangeLocal(item.periodStart, item.periodEnd)}`;
                    return (
                      <ReviewedRow
                        key={item.id}
                        item={item}
                        focused={focused}
                        workspaceId={ws}
                        rangeLabel={rangeLabel}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {approved.map((item) => {
                const focused = deepLink.periodId === item.id;
                return (
                  <div key={item.id} ref={focused ? focusRef : undefined}>
                    <ReviewedTimesheetCard item={item} workspaceId={ws} highlighted={focused} />
                  </div>
                );
              })}
            </div>
          )}
        </LoadingCrossfade>
      ) : (
        <LoadingCrossfade loading={rejectedLoading} loaderLabel="Loading rejected timesheets…">
          {rejected.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">
                {hasActiveApprovalsFilter(filters)
                  ? "No matching rejected timesheets"
                  : "No rejected timesheets"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                {hasActiveApprovalsFilter(filters)
                  ? "Try clearing filters or choose a different project, member, or date range."
                  : "Rejected submissions will appear here when you send timesheets back for correction."}
              </p>
            </Card>
          ) : viewMode === "table" ? (
            <div className="rounded-lg border border-border/60 overflow-x-auto animate-fade-in">
              <Table className="text-sm">
                <TableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead className="w-8"></DataTableHead>
                    <DataTableHead>Member</DataTableHead>
                    <DataTableHead>Project</DataTableHead>
                    <DataTableHead>Period</DataTableHead>
                    <DataTableHead className="text-right">Hours</DataTableHead>
                    <DataTableHead>Reviewed At</DataTableHead>
                    <DataTableHead>Reviewed By</DataTableHead>
                    <DataTableHead>Note</DataTableHead>
                    <DataTableHead>Review Comment</DataTableHead>
                  </DataTableHeaderRow>
                </TableHeader>
                <TableBody>
                  {rejected.map((item) => {
                    const focused = deepLink.periodId === item.id;
                    const periodLabel =
                      item.approvalPeriod === "daily"
                        ? "Day"
                        : item.approvalPeriod === "monthly"
                          ? "Month"
                          : "Week";
                    const rangeLabel = `${periodLabel}: ${formatDateRangeLocal(item.periodStart, item.periodEnd)}`;
                    return (
                      <ReviewedRow
                        key={item.id}
                        item={item}
                        focused={focused}
                        workspaceId={ws}
                        rangeLabel={rangeLabel}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rejected.map((item) => {
                const focused = deepLink.periodId === item.id;
                return (
                  <div key={item.id} ref={focused ? focusRef : undefined}>
                    <ReviewedTimesheetCard item={item} workspaceId={ws} highlighted={focused} />
                  </div>
                );
              })}
            </div>
          )}
        </LoadingCrossfade>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-background/95 backdrop-blur border border-border shadow-lg px-6 py-3 rounded-full animate-in slide-in-from-bottom duration-200">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"} selected
          </span>
          <div className="h-4 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setBulkConfirmAction("reject")}
              disabled={bulkActioning}
            >
              <X className="size-3.5 mr-1" />
              {tab === "amendments" ? "Deny Selected" : "Reject Selected"}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setBulkConfirmAction("approve")}
              disabled={bulkActioning}
            >
              <Check className="size-3.5 mr-1" />
              Approve Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <ConfirmNoteDialog
        open={confirmActionId?.action === "approve"}
        onOpenChange={(open) => {
          if (!open) setConfirmActionId(null);
        }}
        title="Approve this timesheet?"
        description={
          confirmActionId
            ? `Approve ${confirmActionId.userName}'s submission for ${confirmActionId.projectName} (${confirmActionId.range})? Entries in this period will remain locked.`
            : ""
        }
        noteLabel="Review comment"
        notePlaceholder="Optional feedback for the member"
        confirmLabel="Approve timesheet"
        submitting={actioningId === confirmActionId?.id}
        onConfirm={(note) => {
          if (confirmActionId) {
            void handleReview(confirmActionId.id, "approve", note);
            setConfirmActionId(null);
          }
        }}
      />

      <ConfirmNoteDialog
        open={confirmActionId?.action === "reject"}
        onOpenChange={(open) => {
          if (!open) setConfirmActionId(null);
        }}
        title="Reject this timesheet?"
        description={
          confirmActionId
            ? `Send ${confirmActionId.userName}'s submission for ${confirmActionId.projectName} (${confirmActionId.range}) back for correction. The member will see your note.`
            : ""
        }
        noteLabel="Rejection reason"
        notePlaceholder="Explain what needs to be corrected"
        noteRequired
        destructive
        confirmLabel="Reject timesheet"
        submitting={actioningId === confirmActionId?.id}
        onConfirm={(note) => {
          if (confirmActionId) {
            void handleReview(confirmActionId.id, "reject", note);
            setConfirmActionId(null);
          }
        }}
      />

      <ConfirmNoteDialog
        open={bulkConfirmAction === "approve"}
        onOpenChange={(open) => {
          if (!open) setBulkConfirmAction(null);
        }}
        title={tab === "amendments" ? "Approve edit requests?" : "Approve selected timesheets?"}
        description={
          tab === "amendments"
            ? `Approve ${selectedIds.length} selected edit requests? Associated periods will return to draft so members can edit them.`
            : `Approve ${selectedIds.length} selected timesheet submissions? Entries in these periods will remain locked.`
        }
        noteLabel={tab === "amendments" ? "Admin note (optional)" : "Review comment"}
        notePlaceholder={
          tab === "amendments"
            ? "Optional note for the members"
            : "Optional feedback for the members"
        }
        confirmLabel={tab === "amendments" ? "Approve all edit requests" : "Approve all timesheets"}
        submitting={bulkActioning}
        onConfirm={(note) => {
          if (tab === "amendments") {
            // handle bulk amendments approve
            setBulkActioning(true);
            Promise.allSettled(
              selectedIds.map((id) =>
                api(ROUTES.TIMESHEETS.APPROVE_AMENDMENT(id), {
                  method: "PATCH",
                  workspaceId: ws,
                  body: JSON.stringify({ adminNote: note || undefined })
                })
              )
            )
              .then((results) => {
                const succeeded = results.filter((r) => r.status === "fulfilled").length;
                toast.success(`Successfully approved ${succeeded} edit request(s).`);
                setSelectedIds([]);
                return fetchPending();
              })
              .finally(() => {
                setBulkActioning(false);
                setBulkConfirmAction(null);
              });
          } else {
            void handleBulkReview("approve", note);
            setBulkConfirmAction(null);
          }
        }}
      />

      <ConfirmNoteDialog
        open={bulkConfirmAction === "reject"}
        onOpenChange={(open) => {
          if (!open) setBulkConfirmAction(null);
        }}
        title={tab === "amendments" ? "Deny edit requests?" : "Reject selected timesheets?"}
        description={
          tab === "amendments"
            ? `Deny ${selectedIds.length} selected edit requests? Associated periods will remain locked.`
            : `Send ${selectedIds.length} selected timesheet submissions back for correction. Members will see your note.`
        }
        noteLabel={tab === "amendments" ? "Denial reason" : "Rejection reason"}
        notePlaceholder={
          tab === "amendments"
            ? "Explain why the request is denied"
            : "Explain what needs to be corrected"
        }
        noteRequired={tab === "amendments" || tab === "review"}
        destructive
        confirmLabel={tab === "amendments" ? "Deny all edit requests" : "Reject all timesheets"}
        submitting={bulkActioning}
        onConfirm={(note) => {
          if (tab === "amendments") {
            // handle bulk amendments deny
            setBulkActioning(true);
            Promise.allSettled(
              selectedIds.map((id) =>
                api(ROUTES.TIMESHEETS.DENY_AMENDMENT(id), {
                  method: "PATCH",
                  workspaceId: ws,
                  body: JSON.stringify({ adminNote: note || undefined })
                })
              )
            )
              .then((results) => {
                const succeeded = results.filter((r) => r.status === "fulfilled").length;
                toast.success(`Successfully denied ${succeeded} edit request(s).`);
                setSelectedIds([]);
                return fetchPending();
              })
              .finally(() => {
                setBulkActioning(false);
                setBulkConfirmAction(null);
              });
          } else {
            void handleBulkReview("reject", note);
            setBulkConfirmAction(null);
          }
        }}
      />

      <RemindMemberDialog
        open={Boolean(remindTarget)}
        onOpenChange={(open) => {
          if (!open) setRemindTarget(null);
        }}
        item={remindTarget}
        submitting={reminding}
        onConfirm={(message) => void sendReminder(message)}
      />
    </div>
  );
}
