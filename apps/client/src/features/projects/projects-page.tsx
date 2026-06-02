"use client";

import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ProjectNameWithColor,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import type { ProjectDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useProjectsStore } from "@/stores/projects.store";

export function ProjectsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { projects, workspaceNamesById, setProjects } = useProjectsStore();

  useEffect(() => {
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [ws, setProjects]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My projects</h2>
        <p className="text-sm text-muted-foreground">
          Projects where you are on the team. Ask an admin for a team invite link to join more.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assigned projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not on any projects yet. Open an invite link from your admin to join.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.workspaceName ?? workspaceNamesById[p.workspaceId] ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ProjectNameWithColor name={p.name} color={p.color} />
                    </TableCell>
                    <TableCell>{p.clientName ?? "—"}</TableCell>
                    <TableCell>{p.isActive ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
