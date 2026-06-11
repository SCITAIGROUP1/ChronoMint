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
  autoMatched: boolean;
};

type Member = { id: string; name: string; email: string };

export function JiraUsersPage() {
  const wsId = useSessionStore((s) => s.session?.workspaceId) ?? "";
  const [mappings, setMappings] = useState<JiraUserMapping[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMapping, setAutoMapping] = useState(false);

  const load = async () => {
    if (!wsId) return;
    setLoading(true);
    try {
      const [maps, mems] = await Promise.all([
        api<JiraUserMapping[]>(ROUTES.JIRA.USER_MAPPINGS, { workspaceId: wsId }),
        api<{ items: Member[] }>(ROUTES.WORKSPACES.MEMBERS(wsId) + "?limit=200", {
          workspaceId: wsId
        })
      ]);
      setMappings(maps);
      setMembers(mems.items ?? []);
    } catch {
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

  const handleSetMapping = async (jiraAccountId: string, userId: string | null) => {
    try {
      await api(ROUTES.JIRA.USER_MAPPINGS, {
        method: "POST",
        workspaceId: wsId,
        body: JSON.stringify({ jiraAccountId, userId })
      });
      toast.success("User mapping saved");
      void load();
    } catch {
      toast.error("Failed to save mapping");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User Mapping</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Link Jira accounts to ChronoMint workspace members.
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
          description="Sync your Jira users first by clicking Auto-match."
        />
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Jira User</th>
                <th className="px-4 py-3 text-left font-medium">Jira Email</th>
                <th className="px-4 py-3 text-left font-medium">ChronoMint Member</th>
                <th className="px-4 py-3 text-left font-medium">Matched</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{m.jiraDisplayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.jiraEmail}</td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full rounded border bg-background px-2 py-1 text-sm"
                      value={m.userId ?? ""}
                      onChange={(e) => handleSetMapping(m.jiraAccountId, e.target.value || null)}
                    >
                      <option value="">— not mapped —</option>
                      {members.map((mem) => (
                        <option key={mem.id} value={mem.id}>
                          {mem.name} ({mem.email})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {m.userId ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${m.autoMatched ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"}`}
                      >
                        {m.autoMatched ? "Auto" : "Manual"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not matched</span>
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
