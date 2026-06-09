"use client";

import { ROUTES, type UserProfileDto } from "@chronomint/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useUserProfile() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const setSession = useSessionStore((s) => s.setSession);
  const session = useSessionStore((s) => s.session);
  const accessToken = useSessionStore((s) => s.accessToken);

  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws });
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateName = useCallback(
    async (name: string) => {
      if (!ws) throw new Error("No workspace");
      const updated = await api<UserProfileDto>(ROUTES.USERS.ME, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ name })
      });
      setProfile(updated);
      if (session && accessToken) {
        setSession({ ...session, user: { ...session.user, name } }, accessToken);
      }
      return updated;
    },
    [ws, session, accessToken, setSession]
  );

  const updatePreferences = useCallback(
    async (preferences: Record<string, unknown>) => {
      if (!ws) throw new Error("No workspace");
      const updated = await api<UserProfileDto>(ROUTES.USERS.PREFERENCES, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify(preferences)
      });
      setProfile(updated);
      return updated;
    },
    [ws]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!ws) throw new Error("No workspace");
      await api(ROUTES.USERS.PASSWORD, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ currentPassword, newPassword })
      });
    },
    [ws]
  );

  return {
    profile,
    loading,
    error,
    reload,
    updateName,
    updatePreferences,
    changePassword,
    workspaceRole: session?.workspaceRole,
    workspaceName: session?.workspaceName
  };
}
