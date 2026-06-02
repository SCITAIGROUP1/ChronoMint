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

export function WorkspaceSwitcher() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const [switching, setSwitching] = useState(false);

  const adminWorkspaces = workspaces.filter((w) => w.role === "ADMIN");
  const currentId = session?.workspaceId ?? getWorkspaceId() ?? "";

  useEffect(() => {
    if (!session || workspaces.length > 0) return;
    api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, { workspaceId: currentId })
      .then(setWorkspaces)
      .catch(() => {});
  }, [session, workspaces.length, currentId, setWorkspaces]);

  async function onChange(nextId: string) {
    if (!session || nextId === currentId || switching) return;
    const target = adminWorkspaces.find((w) => w.id === nextId);
    if (!target) return;

    setSwitching(true);
    try {
      const res = await api<AuthSessionWithTokenDto>(ROUTES.AUTH.SWITCH_WORKSPACE, {
        method: "POST",
        workspaceId: currentId,
        body: JSON.stringify({ workspaceId: nextId })
      });
      if (res.workspaceRole !== "ADMIN") {
        alert("Admin access required for this app.");
        return;
      }
      setSession(res, res.accessToken);
      const list = await api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
        workspaceId: nextId
      });
      setWorkspaces(list);
      router.push("/dashboard");
      router.refresh();
    } catch {
      alert("Could not switch workspace.");
    } finally {
      setSwitching(false);
    }
  }

  if (adminWorkspaces.length === 0) return null;

  return (
    <div className="mt-4 space-y-1.5">
      <Label className="text-xs text-muted-foreground">Workspace</Label>
      <Select
        value={currentId}
        onValueChange={onChange}
        disabled={switching || adminWorkspaces.length < 2}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          {adminWorkspaces.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
