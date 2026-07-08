"use client";

import {
  DEFAULT_THEME,
  resolveEffectiveTheme,
  ROUTES,
  type ThemePreference
} from "@kloqra/contracts";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { api } from "../api/client";
import { useProfileCacheKey } from "../features/account/profile-cache-key";
import {
  clearThemeHydration,
  markThemeHydrated,
  shouldHydrateTheme
} from "../hooks/theme-preference-state";
import { usePlatformSessionStore } from "../stores/platform-session.store";
import { useSessionStore } from "../stores/session.store";
import { useUserProfileStore } from "../stores/user-profile.store";

function isPlatformAuthScope(): boolean {
  return (process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app") === "platform";
}

type ThemeProfile = {
  effectiveTheme: ThemePreference;
  preferences: { theme?: ThemePreference };
};

/** Hydrates next-themes from the shared profile cache (or one seed fetch via the store). */
export function ThemePreferenceSync() {
  const { setTheme } = useTheme();
  const tenantSession = useSessionStore((s) => s.session);
  const platformSession = usePlatformSessionStore((s) => s.session);
  const userId = isPlatformAuthScope() ? platformSession?.user.id : tenantSession?.user?.id;
  const cacheKey = useProfileCacheKey();
  const profile = useUserProfileStore((s) =>
    cacheKey && !isPlatformAuthScope() ? (s.byWorkspace[cacheKey]?.profile ?? null) : null
  );
  const refreshProfile = useUserProfileStore((s) => s.refresh);

  useEffect(() => {
    if (!userId) {
      clearThemeHydration();
      setTheme(DEFAULT_THEME);
      return;
    }
    if (!shouldHydrateTheme(userId)) return;

    if (isPlatformAuthScope()) {
      void api<ThemeProfile>(ROUTES.PLATFORM.ME)
        .then((p) => {
          if (!shouldHydrateTheme(userId)) return;
          setTheme(p.effectiveTheme ?? resolveEffectiveTheme(p.preferences));
          markThemeHydrated(userId);
        })
        .catch(() => undefined);
      return;
    }

    if (profile) {
      setTheme(profile.effectiveTheme ?? resolveEffectiveTheme(profile.preferences));
      markThemeHydrated(userId);
      return;
    }

    if (!cacheKey) return;

    void refreshProfile(cacheKey)
      .then((p) => {
        if (!p || !shouldHydrateTheme(userId)) return;
        setTheme(p.effectiveTheme ?? resolveEffectiveTheme(p.preferences));
        markThemeHydrated(userId);
      })
      .catch(() => undefined);
  }, [userId, cacheKey, profile, refreshProfile, setTheme]);

  return null;
}
