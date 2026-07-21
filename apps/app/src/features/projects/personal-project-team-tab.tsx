"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TeamMemberDto } from "@kloqra/contracts";
import {
  Badge,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  Table,
  TableBody,
  TableHeader,
  TableLoadingState,
  TablePagination,
  TableRow,
  TableToolbar
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import { useProjectDetail } from "./project-detail-context";

export function PersonalProjectTeamTab() {
  const { workspaceId, projectId } = useProjectDetail();
  const { items, page, setPage, total, totalPages, limit, setLimit, loading, search, setSearch } =
    usePaginatedList<TeamMemberDto>({
      workspaceId,
      basePath: ROUTES.PROJECTS.TEAM_ROSTER(projectId),
      refreshOnFocus: true,
      refreshOnStaleScopes: ["projects"]
    });

  return (
    <DataTableCard data-testid="personal-project-team">
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search team members…"
        searchAriaLabel="Search team members"
      />
      {!loading && items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={search ? "No members match" : "No team members yet"}
            description={search ? "Try a different search." : "Project members will appear here."}
          />
        </div>
      ) : loading ? (
        <TableLoadingState rows={6} columns={4} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Member</DataTableHead>
                <DataTableHead>Email</DataTableHead>
                <DataTableHead>Role</DataTableHead>
                <DataTableHead>Status</DataTableHead>
              </DataTableHeaderRow>
            </TableHeader>
            <TableBody>
              {items.map((member) => (
                <TableRow key={member.id}>
                  <DataTableCell className="font-medium">{member.userName}</DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {member.userEmail}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={member.role === "PROJECT_MANAGER" ? "default" : "outline"}>
                      {member.role === "PROJECT_MANAGER" ? "Project manager" : "Member"}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={member.isActive === false ? "secondary" : "outline"}>
                      {member.isActive === false ? "Inactive" : "Active"}
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
  );
}
