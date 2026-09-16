"use client";

import {
  VerifyEmailPageContent,
  establishTenantSession,
  resolveAdminPostAuthPath as resolveAppPostAuthPath
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
        establishTenantSession(session, accessToken, refreshToken);
        router.replace(await resolveAppPostAuthPath(session));
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
