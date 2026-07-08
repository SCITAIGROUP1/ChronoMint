"use client";

import { useEffect } from "react";

export function clearLegacyOfflineStorage(): void {
  localStorage.removeItem("kloqra_offline_logs");
  localStorage.removeItem("kloqra_offline_deletions");

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith("kloqra:offline:")) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

/** Tear down any previously installed PWA service worker and stale HTTP caches. */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    clearLegacyOfflineStorage();

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    })();
  }, []);

  return null;
}
