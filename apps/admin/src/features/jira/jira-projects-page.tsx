"use client";

import { ROUTES } from "@kloqra/contracts";
import { Button, CenteredLoader, EmptyState } from "@kloqra/ui";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JiraSubNav } from "./jira-sub-nav";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type JiraProject = {
  id: string;
  key: string;
  name: string;
  lead: string | null;
  projectUrl: string;
  avatarUrl?: string;
  isMapped: boolean;
};

type Mapping = {
  id: string;
  jiraProjectId: string;
  jiraProjectKey: string;
  jiraProjectName: string;
  chronoProjectId: string | null;
  chronoProject: { id: string; name: string; color: string } | null;
  syncEnabled: boolean;
};

type ChronoProject = { id: string; name: string };

export function JiraProjectsPage() {
  const wsId = useSessionStore((s) => s.session?.workspaceId) ?? "";
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [chronoProjects, setChronoProjects] = useState<ChronoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    if (!wsId) return;
    setLoading(true);
    try {
      const [jp, mp, cp] = await Promise.all([
        api<JiraProject[]>(ROUTES.JIRA.PROJECTS, { workspaceId: wsId }),
        api<Mapping[]>(ROUTES.JIRA.PROJECT_MAPPINGS, { workspaceId: wsId }),
        api<{ items: ChronoProject[] }>(ROUTES.PROJECTS.LIST + "?limit=200", { workspaceId: wsId })
      ]);
      setJiraProjects(jp);
      setMappings(mp);
      setChronoProjects(cp.items ?? []);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [wsId]);

  const handleMap = async (jiraProject: JiraProject, chronoProjectId: string | null) => {
    try {
      await api(ROUTES.JIRA.PROJECT_MAPPINGS, {
        method: "POST",
        workspaceId: wsId,
        body: JSON.stringify({
          jiraProjectId: jiraProject.id,
          jiraProjectKey: jiraProject.key,
          jiraProjectName: jiraProject.name,
          chronoProjectId,
          syncEnabled: true,
          syncDirection: "JIRA_TO_CHRONO"
        })
      });
      toast.success("Project mapping saved");
      void load();
    } catch {
      toast.error("Failed to save mapping");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api<{ synced: number }>(ROUTES.JIRA.PROJECTS_SYNC, {
        method: "POST",
        workspaceId: wsId
      });
      toast.success(`Synced ${res.synced} issues from Jira`);
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const getMappingForProject = (jiraProjectId: string) =>
    mappings.find((m) => m.jiraProjectId === jiraProjectId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jira Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Map Jira projects to ChronoMint projects to enable issue sync.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync All Issues"}
        </Button>
      </div>

      <JiraSubNav />

      {loading ? (
        <CenteredLoader />
      ) : jiraProjects.length === 0 ? (
        <EmptyState
          title="No Jira projects found"
          description="Connect your Jira account first, then your projects will appear here."
        />
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Project Name</th>
                <th className="px-4 py-3 text-left font-medium">Key</th>
                <th className="px-4 py-3 text-left font-medium">Lead</th>
                <th className="px-4 py-3 text-left font-medium">Project URL</th>
                <th className="px-4 py-3 text-left font-medium">ChronoMint Project</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jiraProjects.map((jp) => {
                const mapping = getMappingForProject(jp.id);
                return (
                  <tr key={jp.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{jp.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{jp.key}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{jp.lead ?? "—"}</td>
                    <td className="px-4 py-3">
                      <a
                        href={jp.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                      >
                        Open <ArrowUpRight className="size-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded border bg-background px-2 py-1 text-sm"
                        value={mapping?.chronoProjectId ?? ""}
                        onChange={(e) => handleMap(jp, e.target.value || null)}
                      >
                        <option value="">— not mapped —</option>
                        {chronoProjects.map((cp) => (
                          <option key={cp.id} value={cp.id}>
                            {cp.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
