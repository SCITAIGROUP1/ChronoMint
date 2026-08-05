const ANALYTICS_VISIBLE_KEY = "kloqra.time-tracker.analytics-visible";

export function readAnalyticsVisiblePreference(defaultVisible = false): boolean {
  if (typeof window === "undefined") return defaultVisible;
  try {
    const raw = window.localStorage.getItem(ANALYTICS_VISIBLE_KEY);
    if (raw === null) return defaultVisible;
    return raw === "true";
  } catch {
    return defaultVisible;
  }
}

export function writeAnalyticsVisiblePreference(visible: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_VISIBLE_KEY, String(visible));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export { ANALYTICS_VISIBLE_KEY };
