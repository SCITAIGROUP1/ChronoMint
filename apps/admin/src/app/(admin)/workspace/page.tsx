"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import type { WorkspaceMemberDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export default function WorkspacePage() {
  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ws) return;
    api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws })
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [ws]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api(ROUTES.WORKSPACES.INVITE(ws), {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ email: email.trim(), role })
      });
      setEmail("");
      setMessage("Member added to workspace.");
      setMembers(await api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }));
    } catch {
      setError("User must register first, or is already a member.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Workspace</h2>
        <p className="text-sm text-muted-foreground">
          Manage who belongs to <strong>{session?.workspaceName ?? "this workspace"}</strong>.
          Project teams are managed under Projects.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invite member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "MEMBER" | "ADMIN")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-primary">{message}</p>}
              <Button type="submit">Add to workspace</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.userName}</TableCell>
                    <TableCell>{m.userEmail}</TableCell>
                    <TableCell>
                      <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>
                        {m.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
