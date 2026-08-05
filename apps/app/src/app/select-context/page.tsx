"use client";

import { AdminContextSelectForm as AppContextSelectForm } from "@kloqra/web-shared";
import { Suspense } from "react";

function SelectContextContent() {
  return <AppContextSelectForm portalLabel="Kloqra" defaultRedirect="/dashboard" />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <SelectContextContent />
    </Suspense>
  );
}
