"use client";

import { WorkspaceSelectForm, useSessionStore } from "@kloqra/web-shared";
import { Suspense } from "react";
import { isMemberPortalSession } from "./is-member-portal-session";

function SelectWorkspaceContent() {
  const session = useSessionStore((s) => s.session);
  const memberPortal = isMemberPortalSession(session);

  return (
    <WorkspaceSelectForm
      portalLabel="Kloqra"
      defaultRedirect={memberPortal ? "/overview" : "/dashboard"}
      memberPortal={memberPortal}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <SelectWorkspaceContent />
    </Suspense>
  );
}
