"use client";

import type { CategoryDto, JiraProjectMappingDto, ProjectDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import {
  buildJiraTimerDeepLink,
  disconnectJira,
  fetchJiraConnectUrl,
  fetchJiraConnectionStatus,
  fetchJiraProjectMappings,
  fetchListItems,
  saveJiraProjectMappings
} from "@kloqra/web-shared";
import { Link2, Unplug } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type JiraSettingsPanelProps = {
  workspaceId: string;
};

export function JiraSettingsPanel({ workspaceId }: JiraSettingsPanelProps) {
  const searchParams = useSearchParams();
  const [statusLoading, setStatusLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const [mappings, setMappings] = useState<JiraProjectMappingDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [saving, setSaving] = useState(false);

  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [chronomintProjectId, setChronomintProjectId] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setStatusLoading(true);
    try {
      const [status, mappingRows, projectRows, categoryRows] = await Promise.all([
        fetchJiraConnectionStatus(workspaceId),
        fetchJiraProjectMappings(workspaceId).catch(() => [] as JiraProjectMappingDto[]),
        fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId }),
        fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId })
      ]);
      setConnected(status.connected);
      setConfigured(status.configured);
      setSiteUrl(status.siteUrl ?? null);
      setMappings(mappingRows);
      setProjects(projectRows);
      setCategories(categoryRows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Jira settings");
    } finally {
      setStatusLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const jiraParam = searchParams.get("jira");
    if (jiraParam === "connected") {
      toast.success("Jira connected successfully");
      void load();
    } else if (jiraParam === "error") {
      toast.error("Jira connection failed");
    }
  }, [searchParams, load]);

  async function handleConnect() {
    try {
      const { url } = await fetchJiraConnectUrl(workspaceId);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start Jira connection");
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectJira(workspaceId);
      setConnected(false);
      setSiteUrl(null);
      toast.success("Jira disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect Jira");
    }
  }

  async function handleAddMapping(e: React.FormEvent) {
    e.preventDefault();
    if (!jiraProjectKey || !chronomintProjectId || !defaultCategoryId) return;
    setSaving(true);
    try {
      const rows = await saveJiraProjectMappings(workspaceId, {
        mappings: [
          {
            jiraProjectKey: jiraProjectKey.toUpperCase(),
            chronomintProjectId,
            autoCreateTasks: true,
            defaultCategoryId
          }
        ]
      });
      setMappings(rows);
      setJiraProjectKey("");
      toast.success("Jira project mapping saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save mapping");
    } finally {
      setSaving(false);
    }
  }

  const clientTimerLinkExample = buildJiraTimerDeepLink(
    "{{issue.key}}",
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3000"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-5" aria-hidden />
          Jira integration
        </CardTitle>
        <CardDescription>
          Connect Jira Cloud so members can start timers from issue links or the Forge issue panel.
          Members create API tokens under Client → Settings → Integrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {statusLoading ? (
          <p className="text-sm text-muted-foreground">Loading Jira status…</p>
        ) : !configured ? (
          <p className="text-sm text-muted-foreground">
            Jira OAuth is not configured on this server. Add ATLASSIAN_* environment variables to
            the API.
          </p>
        ) : connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Connected</p>
              <p className="text-sm text-muted-foreground">{siteUrl}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void handleDisconnect()}>
              <Unplug className="size-4" aria-hidden />
              Disconnect
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={() => void handleConnect()}>
            Connect Jira
          </Button>
        )}

        {connected && (
          <>
            <form onSubmit={(e) => void handleAddMapping(e)} className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium">Project mapping</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="jiraProjectKey">Jira project key</Label>
                  <Input
                    id="jiraProjectKey"
                    value={jiraProjectKey}
                    onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                    placeholder="PROJ"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chronomintProject">ChronoMint project</Label>
                  <Select value={chronomintProjectId} onValueChange={setChronomintProjectId}>
                    <SelectTrigger id="chronomintProject">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jiraDefaultCategory">Default category</Label>
                  <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
                    <SelectTrigger id="jiraDefaultCategory">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Add mapping"}
              </Button>
            </form>

            {mappings.length > 0 && (
              <ul className="space-y-2 text-sm">
                {mappings.map((m) => (
                  <li key={m.id} className="rounded-md border border-border px-3 py-2">
                    <span className="font-mono font-medium">{m.jiraProjectKey}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span>{m.chronomintProjectName ?? m.chronomintProjectId}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Jira automation deep link</p>
              <p className="text-xs text-muted-foreground">
                Add an &quot;Open URL&quot; action in Jira with this pattern (replace host for
                production):
              </p>
              <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">
                {clientTimerLinkExample}
              </code>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
