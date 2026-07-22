"use client";

import { Fragment, type ReactNode } from "react";
import { configuredAuthScope } from "../auth/configured-auth-scope";
import { useSessionGeneration } from "../hooks/use-session-generation";
import { usePlatformSessionStore } from "../stores/platform-session.store";
import { useSessionStore } from "../stores/session.store";

const AUTH_SCOPE = configuredAuthScope(process.env.NEXT_PUBLIC_AUTH_SCOPE, "app");

/**
 * Remounts the React tree when session identity changes so component-local state
 * cannot leak across users or workspaces.
 */
export function SessionGenerationBoundary({ children }: { children: ReactNode }) {
  const generation = useSessionGeneration();
  const tenantUserId = useSessionStore((state) => state.session?.user?.id ?? "signed-out");
  const platformUserId = usePlatformSessionStore((state) => state.session?.user.id ?? "signed-out");
  const userId = AUTH_SCOPE === "platform" ? platformUserId : tenantUserId;

  return <Fragment key={`session-${generation}-${userId}`}>{children}</Fragment>;
}
