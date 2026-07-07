"use client";

import {
  VerifyEmailPageContent,
  canLoginToAdminApp,
  establishTenantSession,
  resolveAdminPostAuthPath
} from "@kloqra/web-shared";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? undefined;
  const email = searchParams.get("email") ?? "";

  return (
    <VerifyEmailPageContent
      token={token}
      email={email}
      loginHref="/login"
      onSession={async (session, accessToken, refreshToken) => {
        if (!canLoginToAdminApp(session)) {
          throw new Error("Admin access required");
        }
        establishTenantSession(session, accessToken, refreshToken);
        router.replace(await resolveAdminPostAuthPath(session));
      }}
    />
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
