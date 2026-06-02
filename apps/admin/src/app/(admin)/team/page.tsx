"use client";

import { useEffect } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import type { PresenceSnapshotDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { usePresenceStore } from "@/stores/presence.store";

export default function TeamPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { snapshot, setSnapshot } = usePresenceStore();

  useEffect(() => {
    const load = () =>
      api<PresenceSnapshotDto>(ROUTES.PRESENCE.SNAPSHOT, { workspaceId: ws }).then(setSnapshot);
    void load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [ws, setSnapshot]);

  const members = snapshot?.members ?? [];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Team live</h2>
      <Card>
        <CardHeader>
          <CardTitle>Currently clocked in</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active timers. Members appear here when running a stopwatch.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center gap-2">
                  <Badge>{m.userName}</Badge>
                  <span className="text-sm">
                    {m.projectName} / {m.taskName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
