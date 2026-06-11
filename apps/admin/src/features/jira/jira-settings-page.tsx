"use client";

import type { JiraConnectionStatusDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { Button, Card, CardContent, CardHeader, CardTitle, CenteredLoader } from "@kloqra/ui";
import { CheckCircle, ExternalLink, Link2, Link2Off, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { JiraSubNav } from "./jira-sub-nav";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

export function JiraSettingsPage() {
  const session = useSessionStore((s) => s.session);
  const wsId = session?.workspaceId ?? "";

  const [status, setStatus] = useState<JiraConnectionStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = () => {
    if (!wsId) return;
    setLoading(true);
    api<JiraConnectionStatusDto>(ROUTES.JIRA.AUTH_STATUS, { workspaceId: wsId })
      .then(setStatus)
      .catch(() => toast.error("Failed to load Jira status"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Handle redirect back from Atlassian
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast.success("Jira connected successfully");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get("error")) {
      toast.error("Failed to connect Jira: " + params.get("error"));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await api<{ authUrl: string }>(ROUTES.JIRA.AUTH_CONNECT, { workspaceId: wsId });
      window.location.href = res.authUrl;
    } catch {
      toast.error("Failed to start Jira authorization");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api(ROUTES.JIRA.AUTH_DISCONNECT, { method: "DELETE", workspaceId: wsId });
      toast.success("Jira disconnected");
      setStatus({ connected: false });
    } catch {
      toast.error("Failed to disconnect Jira");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Jira Integration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your Jira workspace to sync issues and push worklogs.
        </p>
      </div>

      <JiraSubNav />

      {loading ? (
        <CenteredLoader />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status?.connected ? (
                  <CheckCircle className="size-5 text-green-500" />
                ) : (
                  <Link2Off className="size-5 text-muted-foreground" />
                )}
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.connected ? (
                <>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Site</span>
                      <a
                        href={status.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {status.siteName}
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account</span>
                      <span className="font-medium">{status.email}</span>
                    </div>
                    {status.lastSyncAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last synced</span>
                        <span>{new Date(status.lastSyncAt).toLocaleString()}</span>
                      </div>
                    )}
                    {status.connectedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connected</span>
                        <span>{new Date(status.connectedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load}>
                      <RefreshCw className="mr-2 size-3.5" />
                      Refresh
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? "Disconnecting…" : "Disconnect Jira"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No Jira account connected. Click below to authorize ChronoMint to access your
                    Jira workspace.
                  </p>
                  <Button onClick={handleConnect} disabled={connecting}>
                    <Link2 className="mr-2 size-4" />
                    {connecting ? "Redirecting to Jira…" : "Connect to Jira"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What this integration does</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  Imports Jira issues as ChronoMint tasks
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  Pushes time entries back to Jira as worklogs
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  Maps Jira users to workspace members
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">→</span>
                  Members can start timers directly from Jira issues
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
