"use client";

import {
  AppBar,
  Button,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableRow
} from "@kloqra/ui";
import { Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { CreateWorkspaceDialog } from "./components/create-workspace-dialog";
import { WorkspaceAdminAssignDialog } from "./components/workspace-admin-assign-dialog";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

export function AccountWorkspacesPage() {
  const session = useSessionStore((s) => s.session);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const isOwner = session?.tenantRole === "OWNER";
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6 p-6">
      <AppBar
        title="Workspaces"
        description="Create workspaces and assign admins per workspace."
        actions={
          isOwner ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create workspace
            </Button>
          ) : undefined
        }
      />
      <DataTableCard>
        <Table>
          <TableBody>
            <DataTableHeaderRow>
              <DataTableHead>Name</DataTableHead>
              <DataTableHead>Your role</DataTableHead>
              {isOwner ? <DataTableHead className="text-right">Actions</DataTableHead> : null}
            </DataTableHeaderRow>
            {workspaces.map((workspace) => (
              <TableRow key={workspace.id}>
                <DataTableCell>{workspace.name}</DataTableCell>
                <DataTableCell>{workspace.role}</DataTableCell>
                {isOwner ? (
                  <DataTableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignTarget({ id: workspace.id, name: workspace.name })}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign admin
                    </Button>
                  </DataTableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      {assignTarget ? (
        <WorkspaceAdminAssignDialog
          workspaceId={assignTarget.id}
          workspaceName={assignTarget.name}
          open
          onOpenChange={(open) => {
            if (!open) setAssignTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}
