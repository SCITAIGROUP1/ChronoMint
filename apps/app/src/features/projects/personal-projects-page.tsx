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
  TableLoadingState,
  TablePagination,
  TableRow
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import Link from "next/link";
import { useMemo, useState } from "react";
import { myProjectDetailHref } from "@/features/projects/member-project-detail-nav";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

export function PersonalProjectsPage() {
  const workspaceId =
    useSessionStore((state) => state.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const filters = useMemo(
    () =>
      statusFilter === "active"
        ? { isActive: "true" }
        : statusFilter === "inactive"
          ? { isActive: "false" }
          : undefined,
    [statusFilter]
  );
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
    workspaceId,
    basePath: ROUTES.PROJECTS.LIST,
    filters
  });
  const noFilters = !search && statusFilter === "ALL";

  return (
    <div className="space-y-6" data-testid="personal-projects">
      <AppBar
        title="My projects"
        description="Projects where you are on the team."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name or client…"
            searchAriaLabel="Search projects"
            filters={
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
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
          <TableLoadingState rows={5} columns={3} />
        ) : projects.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={noFilters ? "No assigned projects" : "No matching projects"}
              description={
                noFilters
                  ? "You are not on any projects yet."
                  : "Try a different search term or filter."
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Project</DataTableHead>
                  <DataTableHead>Client</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className={entityRowClassName(project.isActive)}>
                    <DataTableCell>
                      <Link
                        href={myProjectDetailHref(project.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        <ProjectNameWithColor
                          name={project.name}
                          color={project.myColor ?? project.color}
                        />
                      </Link>
                    </DataTableCell>
                    <DataTableCell>{project.clientName ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={project.isActive ? "default" : "secondary"}>
                        {project.isActive ? "Active" : "Inactive"}
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
