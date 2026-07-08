import {
  resolveEffectiveDateFormat,
  resolveEffectiveTimeFormat,
  resolveEffectiveTimezone,
  type DateFormatPreference,
  type TimeFormatPreference,
  type UserPreferences
} from "@kloqra/contracts";
import { useUserProfile } from "../features/account/use-user-profile";

export type DisplayPreferences = {
  timezone: string;
  weekStart: "monday" | "sunday";
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  startupPage: UserPreferences["startupPage"];
};

/**
 * Display prefs for calendar / timelog surfaces.
 * Timezone: explicit user preference, else browser ("Browser default").
 * Never use API `effectiveTimezone` alone — the server falls back to UTC and
 * cannot know the browser zone, which mis-buckets days for +HH:MM locales.
 */
export function useDisplayPreferences(): DisplayPreferences {
  const { profile } = useUserProfile();
  const preferences = profile?.preferences ?? {};
  const browserTimezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  return {
    timezone: resolveEffectiveTimezone(preferences, browserTimezone),
    weekStart: preferences.weekStart ?? "monday",
    dateFormat: profile?.effectiveDateFormat ?? resolveEffectiveDateFormat(preferences),
    timeFormat: profile?.effectiveTimeFormat ?? resolveEffectiveTimeFormat(preferences),
    startupPage: preferences.startupPage
  };
}
