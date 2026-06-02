"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import type { TeamInvitePreviewDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const [preview, setPreview] = useState<TeamInvitePreviewDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}${ROUTES.TEAM_INVITES.PREVIEW(token)}`)
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => setError("Invite not found."));
  }, [token]);

  async function accept() {
    const ws = session?.workspaceId ?? getWorkspaceId();
    if (!session || !ws) {
      router.push(`/login?next=/invite/${token}`);
      return;
    }
    setError(null);
    try {
      const result = await api<{ projectName: string }>(ROUTES.TEAM_INVITES.ACCEPT(token), {
        method: "POST",
        workspaceId: ws
      });
      setMessage(`You joined ${result.projectName}.`);
      setTimeout(() => router.push("/projects"), 1500);
    } catch {
      setError("Could not accept invite. Sign in with the correct account or ask your admin for a new link.");
    }
  }

  if (error && !preview) {
    return <main className="flex min-h-screen items-center justify-center p-4">{error}</main>;
  }

  if (!preview) {
    return <main className="flex min-h-screen items-center justify-center p-4">Loading invite…</main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Team invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Join the <strong>{preview.projectName}</strong> team in {preview.workspaceName}.
          </p>
          {preview.email ? (
            <p className="text-xs text-muted-foreground">For: {preview.email}</p>
          ) : null}
          {preview.expired ? (
            <p className="text-sm text-destructive">This invite has expired or was already used.</p>
          ) : session ? (
            <Button onClick={accept}>Accept invite</Button>
          ) : (
            <Button onClick={() => router.push(`/login?next=/invite/${token}`)}>Sign in to accept</Button>
          )}
          {message ? <p className="text-sm text-primary">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
