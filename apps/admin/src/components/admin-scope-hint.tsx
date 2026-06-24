"use client";

import { Badge } from "@kloqra/ui";

type AdminScopeHintProps = {
  projectLeadOnly: boolean;
  workspaceName?: string;
  ledProjectCount?: number;
  collapsed?: boolean;
};

export function AdminScopeHint({
  projectLeadOnly,
  workspaceName,
  ledProjectCount = 0,
  collapsed = false
}: AdminScopeHintProps) {
  if (!projectLeadOnly) return null;

  if (collapsed) {
    return (
      <div
        className="flex justify-center px-1"
        title={`Project manager · ${workspaceName ?? "workspace"}`}
      >
        <Badge variant="outline" className="max-w-full truncate px-1.5 text-[9px] font-medium">
          PM
        </Badge>
      </div>
    );
  }

  return (
    <div className="px-1">
      <Badge variant="outline" className="w-full justify-center px-2 py-1 text-[10px] font-medium">
        Project manager
        {workspaceName ? ` · ${workspaceName}` : ""}
        {ledProjectCount > 0 ? ` · ${ledProjectCount} projects` : ""}
      </Badge>
      <p className="mt-2 px-0.5 text-[10px] leading-snug text-muted-foreground">
        Workspace-wide tools are managed by your workspace admin.
      </p>
    </div>
  );
}
