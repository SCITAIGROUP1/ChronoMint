import { AuthShell } from "@kloqra/web-shared";
import { Suspense } from "react";
import { AppLoginForm } from "@/app/login/login-form";

function LoginFallback() {
  return (
    <AuthShell title="Sign in" portalLabel="Kloqra">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AppLoginForm />
    </Suspense>
  );
}
