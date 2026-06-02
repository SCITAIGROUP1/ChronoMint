"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import type { AuthSessionWithTokenDto, WorkspaceWithRoleDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";
import { useProjectsStore } from "@/stores/projects.store";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const setProjects = useProjectsStore((s) => s.setProjects);
  const setTasks = useProjectsStore((s) => s.setTasks);
  const [switching, setSwitching] = useState(false);

  const currentId = session?.workspaceId ?? getWorkspaceId() ?? "";

  useEffect(() => {
    if (!session || workspaces.length > 0) return;
    api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, { workspaceId: currentId })
      .then(setWorkspaces)
      .catch(() => {});
  }, [session, workspaces.length, currentId, setWorkspaces]);

  async function onChange(nextId: string) {
    if (!session || nextId === currentId || switching) return;

    setSwitching(true);
    try {
      const res = await api<AuthSessionWithTokenDto>(ROUTES.AUTH.SWITCH_WORKSPACE, {
        method: "POST",
        workspaceId: currentId,
        body: JSON.stringify({ workspaceId: nextId })
      });
      setSession(res, res.accessToken);
      setProjects([]);
      setTasks([]);
      const list = await api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
        workspaceId: nextId
      });
      setWorkspaces(list);
      router.push("/timer");
      router.refresh();
    } catch {
      alert("Could not switch workspace.");
    } finally {
      setSwitching(false);
    }
  }

  if (workspaces.length === 0) return null;

  return (
    <div className="mt-4 space-y-1.5">
      <Label className="text-xs text-muted-foreground">Workspace</Label>
      <Select
        value={currentId}
        onValueChange={onChange}
        disabled={switching || workspaces.length < 2}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.name}
              {w.role === "ADMIN" ? " (admin)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
