import { Skeleton } from "@kloqra/ui";
import { AccountSettingsPage } from "@kloqra/web-shared";
import { Suspense } from "react";

export const metadata = {
  title: "Settings"
};

function SettingsFallback() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

/**
 * Organization-context settings page (reachable from /account/* mode).
 * Uses the admin variant so notification rows reflect org-level preferences.
 */
export default function Page() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <AccountSettingsPage notificationsVariant="admin" basePath="/account/settings" />
    </Suspense>
  );
}
