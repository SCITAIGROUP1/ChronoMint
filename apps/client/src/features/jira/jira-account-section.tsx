"use client";

import { ROUTES } from "@kloqra/contracts";
import { Button } from "@kloqra/ui";
import { CheckCircle2, Pencil, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type CurrentMapping = {
  jiraAccountId: string;
  jiraDisplayName: string;
  jiraEmail: string;
} | null;

export function JiraAccountSection() {
  const wsId = useSessionStore((s) => s.session?.workspaceId) ?? "";

  const [current, setCurrent] = useState<CurrentMapping>(undefined as unknown as CurrentMapping);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!wsId) return;
    api<CurrentMapping>(ROUTES.JIRA.MY_MAPPING, { workspaceId: wsId })
      .then((m) => {
        setCurrent(m);
        setEditing(!m);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not connected") || msg.includes("404")) {
          setLoadError("Jira is not connected for your workspace. Ask your admin to set it up.");
        } else {
          setCurrent(null);
          setEditing(true);
        }
      })
      .finally(() => setInitialLoading(false));
  }, [wsId]);

  const handleLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("loading");
    setFeedback("");
    try {
      const result = await api<{
        jiraDisplayName: string;
        jiraEmail: string;
        jiraAccountId: string;
      }>(ROUTES.JIRA.MY_MAPPING, {
        method: "POST",
        workspaceId: wsId,
        body: JSON.stringify({ email: trimmed })
      });
      setCurrent(result);
      setEditing(false);
      setStatus("success");
      setFeedback(`Linked to ${result.jiraDisplayName}`);
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback(
        msg.includes("not found") || msg.includes("404")
          ? "This email was not found in your Jira workspace."
          : "Failed to link account. Please try again."
      );
    }
  };

  const handleStartEdit = () => {
    setEmail(current?.jiraEmail ?? "");
    setStatus("idle");
    setFeedback("");
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setStatus("idle");
    setFeedback("");
  };

  if (initialLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-2">
        <h3 className="text-base font-semibold">Jira Account</h3>
        <p className="text-sm text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold">Jira Account</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Link your Jira email so your assigned issues appear in the Jira tab.
        </p>
      </div>

      {/* Linked state — read-only display */}
      {current && !editing && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">
                {current.jiraDisplayName}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 truncate">
                {current.jiraEmail}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={handleStartEdit} className="shrink-0">
            <Pencil className="mr-1.5 size-3.5" />
            Update
          </Button>
        </div>
      )}

      {/* Success flash after save */}
      {status === "success" && !editing && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="size-4 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="jira-email">
            Jira email address
          </label>
          <input
            id="jira-email"
            type="email"
            autoFocus
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="your.name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus("idle");
              setFeedback("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleLink();
              if (e.key === "Escape") handleCancel();
            }}
          />

          {status === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="size-4 shrink-0" />
              {feedback}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleLink} disabled={!email.trim() || status === "loading"}>
              {status === "loading" ? "Verifying…" : current ? "Update Account" : "Link Account"}
            </Button>
            {current && (
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
