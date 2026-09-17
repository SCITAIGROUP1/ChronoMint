"use client";

import { ROUTES } from "@kloqra/contracts";
import type { HourlyRateDto } from "@kloqra/contracts";
import {
  AppBarListToolbar,
  AppModal,
  appBarListFilterTriggerClass,
  Button,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  DataTableScroll,
  Input,
  Label,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableLoadingState
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function BillingPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "workspace" | "member" | "project">("ALL");
  const listFilters = useMemo(
    () => (scopeFilter === "ALL" ? undefined : { scope: scopeFilter }),
    [scopeFilter]
  );
  const {
    items: rates,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    reload
  } = usePaginatedList<HourlyRateDto>({
    workspaceId: ws,
    basePath: ROUTES.BILLING.RATES,
    filters: listFilters
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [rate, setRate] = useState("100");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  async function addRate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(ROUTES.BILLING.RATES, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          rate: parseFloat(rate),
          ...(userId ? { userId } : {})
        })
      });
      setRate("100");
      setUserId("");
      setCreateOpen(false);
      toast.success("Hourly rate saved.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save hourly rate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageLayout
      title="Hourly rates"
      description="Default and per-member rates for workspace billing."
      secondary={
        <AppBarListToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search rates…"
          searchAriaLabel="Search hourly rates"
          filters={
            <Select
              value={scopeFilter}
              onValueChange={(value) =>
                setScopeFilter(value as "ALL" | "workspace" | "member" | "project")
              }
            >
              <SelectTrigger className={appBarListFilterTriggerClass} aria-label="Filter by scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All scopes</SelectItem>
                <SelectItem value="workspace">Workspace default</SelectItem>
                <SelectItem value="member">Per member</SelectItem>
                <SelectItem value="project">Per project</SelectItem>
              </SelectContent>
            </Select>
          }
          action={
            <Button type="button" className="h-10 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add rate
            </Button>
          }
        />
      }
    >
      <DataTableCard fill>
        {loading ? (
          <TableLoadingState rows={5} columns={3} />
        ) : rates.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No rates configured.</p>
        ) : (
          <>
            <DataTableScroll>
              <Table>
                <TableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead sticky>Rate ($/hr)</DataTableHead>
                    <DataTableHead>User ID</DataTableHead>
                    <DataTableHead priority="meta">Effective</DataTableHead>
                  </DataTableHeaderRow>
                </TableHeader>
                <TableBody>
                  {rates.map((r) => (
                    <TableRow key={r.id}>
                      <DataTableCell sticky>{r.rate}</DataTableCell>
                      <DataTableCell>{r.userId ?? "Workspace default"}</DataTableCell>
                      <DataTableCell priority="meta">
                        {new Date(r.effectiveFrom).toLocaleDateString()}
                      </DataTableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableScroll>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>

      <AppModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setRate("100");
            setUserId("");
          }
        }}
        title="Add hourly rate"
        description="Set a workspace default or a per-member rate."
        icon={<Plus className="size-5" />}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-rate-form" disabled={saving}>
              {saving ? "Saving…" : "Save rate"}
            </Button>
          </>
        }
      >
        <form id="add-rate-form" onSubmit={addRate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rate">Rate</Label>
            <Input
              id="rate"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userId">User ID (optional)</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={saving}
            />
          </div>
        </form>
      </AppModal>
    </PageLayout>
  );
}
