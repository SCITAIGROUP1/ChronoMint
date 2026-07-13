"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectDto } from "@kloqra/contracts";
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
  entityRowClassName,
  ProjectNameWithColor,
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
import Link from "next/link";
import { useMemo, useState } from "react";
import { memberProjectsStatusFilters } from "@/features/projects/member-projects-filters";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function ProjectsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { workspaceNamesById } = useProjectsStore();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const listFilters = useMemo(() => memberProjectsStatusFilters(statusFilter), [statusFilter]);
  const {
    items: projects,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading
  } = usePaginatedList<ProjectDto>({
    workspaceId: ws,
    basePath: ROUTES.PROJECTS.LIST,
    filters: listFilters
  });

  const noFilters = !search && statusFilter === "ALL";

  return (
    <div className="space-y-6">
      <AppBar
        title="My projects"
        description="Projects where you are on the team. Ask an admin for a team invite link to join more."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name or client…"
            searchAriaLabel="Search projects"
            filters={
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "ALL" | "active" | "inactive")}
              >
                <SelectTrigger
                  className={appBarListFilterTriggerClass}
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        }
      />
      <DataTableCard>
        {loading ? (
          <TableLoadingState rows={5} columns={4} />
        ) : projects.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={noFilters ? "No assigned projects" : "No matching projects"}
              description={
                noFilters
                  ? "You are not on any projects yet. Open an invite link from your admin to join."
                  : "Try a different search term or filter."
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Workspace</DataTableHead>
                  <DataTableHead>Project</DataTableHead>
                  <DataTableHead>Client</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id} className={entityRowClassName(p.isActive)}>
                    <DataTableCell>
                      {p.workspaceName ?? workspaceNamesById[p.workspaceId] ?? "—"}
                    </DataTableCell>
                    <DataTableCell>
                      <Link
                        href={`/projects/${p.id}/overview`}
                        className="font-medium text-primary hover:underline"
                      >
                        <ProjectNameWithColor name={p.name} color={p.myColor ?? p.color} />
                      </Link>
                    </DataTableCell>
                    <DataTableCell>{p.clientName ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={p.isActive ? "default" : "secondary"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
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
    </div>
  );
}
