"use client";

import type { RoleGrantAuditEventDto } from "@kloqra/contracts";
import {
  AppBar,
  AppBarListToolbar,
  appBarListFilterTriggerClass,
  Badge,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
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
import { canManageOrganization } from "@kloqra/web-shared";
import { ShieldCheck, ShieldX, UserMinus } from "lucide-react";
import { useState } from "react";
import { useRoleGrantAuditLog } from "./use-role-grant-audit-log";
import { useSessionStore } from "@/stores/session.store";

const SCOPE_LABELS: Record<string, string> = {
  tenant: "Tenant",
  workspace: "Workspace",
  project: "Project",
  platform: "Platform"
};

const ROLE_LABELS: Record<string, string> = {
  TENANT_OWNER: "Tenant Owner",
  TENANT_ADMIN: "Tenant Admin",
  WORKSPACE_ADMIN: "Workspace Admin",
  WORKSPACE_MEMBER: "Workspace Member",
  PROJECT_MANAGER: "Project Manager"
};

function OutcomeBadge({ outcome }: { outcome: "GRANTED" | "REVOKED" }) {
  return outcome === "GRANTED" ? (
    <Badge
      variant="default"
      className="gap-1 bg-emerald-600/15 text-emerald-700 border-emerald-200 hover:bg-emerald-600/20"
    >
      <ShieldCheck className="size-3" />
      Granted
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="gap-1 bg-rose-600/10 text-rose-700 border-rose-200 hover:bg-rose-600/15"
    >
      <UserMinus className="size-3" />
      Revoked
    </Badge>
  );
}

function UserCell({ name, email }: { name?: string; email?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium text-sm">
        {name ?? <span className="text-muted-foreground italic">Unknown</span>}
      </p>
      {email && <p className="text-xs text-muted-foreground">{email}</p>}
    </div>
  );
}

function EventDetail({ event }: { event: RoleGrantAuditEventDto }) {
  const roleLabel = ROLE_LABELS[event.role] ?? event.role;
  const scopeLabel = SCOPE_LABELS[event.scope] ?? event.scope;
  return (
    <div className="space-y-0.5">
      <p className="font-medium text-sm">{roleLabel}</p>
      <p className="text-xs text-muted-foreground">
        {scopeLabel}
        {event.resourceName
          ? ` · ${event.resourceName}`
          : event.resourceId !== event.targetUserId
            ? ` · ${event.resourceId.slice(0, 8)}…`
            : ""}
      </p>
      {event.priorRole && (
        <p className="text-xs text-muted-foreground">
          was <span className="font-medium">{ROLE_LABELS[event.priorRole] ?? event.priorRole}</span>
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));
}

type ScopeFilter = "ALL" | "tenant" | "workspace" | "project";
type OutcomeFilter = "ALL" | "GRANTED" | "REVOKED";

export function AccessAuditPage() {
  const session = useSessionStore((s) => s.session);
  const canManage = canManageOrganization(session);

  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ALL");

  const { events, total, totalPages, page, setPage, limit, setLimit, loading, error } =
    useRoleGrantAuditLog({
      scope: scopeFilter === "ALL" ? undefined : scopeFilter,
      outcome: outcomeFilter === "ALL" ? undefined : outcomeFilter
    });

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <ShieldX className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Organization owner or admin access required to view the access audit log.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Access audit log"
        description="A complete, tamper-evident record of every role grant and revocation across your organization."
        secondary={
          <AppBarListToolbar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder="Search by user…"
            searchAriaLabel="Search audit events"
            filters={
              <>
                <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as ScopeFilter)}>
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by scope"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All scopes</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="workspace">Workspace</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={outcomeFilter}
                  onValueChange={(v) => setOutcomeFilter(v as OutcomeFilter)}
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by outcome"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All outcomes</SelectItem>
                    <SelectItem value="GRANTED">Granted</SelectItem>
                    <SelectItem value="REVOKED">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />
        }
      />

      <DataTableCard>
        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : loading ? (
          <TableLoadingState rows={8} columns={6} />
        ) : events.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title="No audit events yet"
              description="Role grants and revocations will appear here once access control actions are performed."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Actor</DataTableHead>
                  <DataTableHead>Target</DataTableHead>
                  <DataTableHead>Role change</DataTableHead>
                  <DataTableHead>Outcome</DataTableHead>
                  <DataTableHead>Source</DataTableHead>
                  <DataTableHead>When</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <DataTableCell>
                      <UserCell name={event.actorUserName} email={event.actorUserEmail} />
                    </DataTableCell>
                    <DataTableCell>
                      <UserCell name={event.targetUserName} email={event.targetUserEmail} />
                    </DataTableCell>
                    <DataTableCell>
                      <EventDetail event={event} />
                    </DataTableCell>
                    <DataTableCell>
                      <OutcomeBadge outcome={event.outcome} />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="space-y-0.5">
                        <Badge variant="outline" className="text-xs font-mono capitalize">
                          {event.actorType}
                        </Badge>
                        <p className="text-xs text-muted-foreground capitalize">
                          {event.requestSource}
                        </p>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(event.createdAt)}
                    </DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      <p className="text-xs text-muted-foreground px-1">
        Policy version: <span className="font-mono">v1</span> · Events are retained after member
        deletion.
      </p>
    </div>
  );
}
