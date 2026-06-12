"use client";

import { ROUTES } from "@kloqra/contracts";
import { Button, CenteredLoader, EmptyState } from "@kloqra/ui";
import { Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JiraSubNav } from "./jira-sub-nav";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type JiraUserMapping = {
  id: string;
  jiraAccountId: string;
  jiraEmail: string;
  jiraDisplayName: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  projects: Array<{ name: string; key: string }>;
  isBench: boolean;
};

export function JiraUsersPage() {
  const wsId = useSessionStore((s) => s.session?.workspaceId) ?? "";
  const [mappings, setMappings] = useState<JiraUserMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMapping, setAutoMapping] = useState(false);

  const load = async () => {
    if (!wsId) return;
    setLoading(true);
    try {
      const maps = await api<JiraUserMapping[]>(ROUTES.JIRA.USER_MAPPINGS, { workspaceId: wsId });
      setMappings(maps);
    } catch (err) {
      console.error("[Jira] Failed to load user mappings:", err);
      toast.error("Failed to load user mappings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [wsId]);

  const handleAutoMap = async () => {
    setAutoMapping(true);
    try {
      const res = await api<{ matched: number }>(ROUTES.JIRA.USERS_AUTO_MAP, {
        method: "POST",
        workspaceId: wsId
      });
      toast.success(`Auto-matched ${res.matched} users by email`);
      void load();
    } catch {
      toast.error("Auto-mapping failed");
    } finally {
      setAutoMapping(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jira Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of Jira users and their assigned projects.
          </p>
        </div>
        <Button onClick={handleAutoMap} disabled={autoMapping} variant="outline">
          <Wand2 className="mr-2 size-4" />
          {autoMapping ? "Matching…" : "Auto-match by Email"}
        </Button>
      </div>

      <JiraSubNav />

      {loading ? (
        <CenteredLoader />
      ) : mappings.length === 0 ? (
        <EmptyState
          title="No Jira users found"
          description="Click Auto-match to sync Jira users with workspace members."
        />
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Jira User</th>
                <th className="px-4 py-3 text-left font-medium">Jira Email</th>
                <th className="px-4 py-3 text-left font-medium">ChronoMint Member</th>
                <th className="px-4 py-3 text-left font-medium">Projects</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{m.jiraDisplayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.jiraEmail}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.userName ? (
                      <span>
                        {m.userName}
                        {m.userEmail && (
                          <span className="ml-1 text-xs text-muted-foreground/70">
                            ({m.userEmail})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">Not linked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.isBench ? (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        Bench
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {m.projects.map((p) => (
                          <span
                            key={p.key}
                            className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            title={p.name}
                          >
                            {p.key}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
