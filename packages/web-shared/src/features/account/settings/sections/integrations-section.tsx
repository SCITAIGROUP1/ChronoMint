"use client";

import type { PersonalAccessTokenDto } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import { KeyRound, Link2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createPersonalAccessToken,
  listPersonalAccessTokens,
  revokePersonalAccessToken
} from "../../../../integrations/jira-api";
import { SettingsCard } from "../settings-card";

export function IntegrationsSection({ workspaceId }: { workspaceId: string }) {
  const [tokens, setTokens] = useState<PersonalAccessTokenDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenName, setTokenName] = useState("Jira Forge");
  const [creating, setCreating] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      setTokens(await listPersonalAccessTokens(workspaceId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load API tokens");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!tokenName.trim()) return;
    setCreating(true);
    try {
      const result = await createPersonalAccessToken(workspaceId, { name: tokenName.trim() });
      setRevealedToken(result.token);
      setTokens((prev) => [result.item, ...prev]);
      toast.success("API token created — copy it now");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create token");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokePersonalAccessToken(workspaceId, id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
      toast.success("Token revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke token");
    }
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Jira Forge app"
        description="Use a personal access token to connect the ChronoMint Forge issue panel in Jira."
        icon={Link2}
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Create an API token below and copy it once.</li>
          <li>Install the ChronoMint Forge app on your Jira site (see apps/jira-forge README).</li>
          <li>In the issue panel, paste your API base URL, workspace ID, and token to connect.</li>
        </ol>
      </SettingsCard>

      <SettingsCard
        title="Personal access tokens"
        description="Tokens authenticate the Jira Forge panel. Revoke any token you no longer use."
        icon={KeyRound}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="pat-name">Token name</Label>
              <Input
                id="pat-name"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="Jira Forge"
              />
            </div>
            <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? "Creating…" : "Create token"}
            </Button>
          </div>

          {revealedToken ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Copy this token now — it won&apos;t be shown again.
              </p>
              <code className="mt-2 block break-all font-mono text-xs">{revealedToken}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  void navigator.clipboard.writeText(revealedToken);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy token
              </Button>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tokens…</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active tokens.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((token) => (
                <li
                  key={token.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{token.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(token.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRevoke(token.id)}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
