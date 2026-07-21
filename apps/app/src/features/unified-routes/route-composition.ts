import type { AuthSessionDto } from "@kloqra/contracts";
import { sessionCan } from "@kloqra/web-shared";

export type UnifiedRouteMode = "personal" | "managed" | "workspace";

export type UnifiedRouteExperience = {
  mode: UnifiedRouteMode;
  managedProjectIds: string[];
  canCallWorkspaceWideApis: boolean;
};

function experience(
  mode: UnifiedRouteMode,
  managedProjectIds: readonly string[] = []
): UnifiedRouteExperience {
  return {
    mode,
    managedProjectIds: mode === "managed" ? [...managedProjectIds] : [],
    canCallWorkspaceWideApis: mode === "workspace"
  };
}

export function resolveProjectsExperience(session: AuthSessionDto): UnifiedRouteExperience {
  if (sessionCan(session, "workspace:CreateProject")) return experience("workspace");
  if (
    sessionCan(session, "project:Read") &&
    session.managedProjectIds &&
    session.managedProjectIds.length > 0
  ) {
    return experience("managed", session.managedProjectIds);
  }
  return experience("personal");
}

export function resolveProjectDetailExperience(
  session: AuthSessionDto,
  projectId: string
): UnifiedRouteExperience {
  if (sessionCan(session, "workspace:UpdateProject")) return experience("workspace");
  if (
    sessionCan(session, "project:Read") &&
    (session.managedProjectIds ?? []).includes(projectId)
  ) {
    return experience("managed", [projectId]);
  }
  return experience("personal");
}

export function resolveTimeTrackerExperience(session: AuthSessionDto): UnifiedRouteExperience {
  if (sessionCan(session, "workspace:ReadReports")) return experience("workspace");
  if (
    sessionCan(session, "project:ReadReports") &&
    session.managedProjectIds &&
    session.managedProjectIds.length > 0
  ) {
    return experience("managed", session.managedProjectIds);
  }
  return experience("personal");
}
