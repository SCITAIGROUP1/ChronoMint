"use client";

import { ROUTES } from "@kloqra/contracts";
import type { PlatformSessionWithTokenDto } from "@kloqra/contracts";
import { Button, Input, Label, PasswordInput } from "@kloqra/ui";
import {
  AuthShell,
  extractFieldErrorsFromMessage,
  usePlatformSessionStore
} from "@kloqra/web-shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const setSession = usePlatformSessionStore((s) => s.setSession);
  const [email, setEmail] = useState("platform@kloqra.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const nextFieldErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextFieldErrors.email = "Email is required";
    if (!password.trim()) nextFieldErrors.password = "Password is required";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    try {
      const res = await api<PlatformSessionWithTokenDto>(ROUTES.AUTH.LOGIN, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setSession(res, res.accessToken, res.refreshToken);
      router.push("/tenants");
    } catch (err) {
      if (err instanceof Error) {
        const parsed = extractFieldErrorsFromMessage(err.message, {
          email: "Email",
          password: "Password"
        });
        setFieldErrors(parsed.fieldErrors);
        setError(parsed.formError);
        return;
      }
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <AuthShell
      title="Platform sign in"
      portalLabel="Platform Admin"
      description="Kloqra staff only — internal operations console."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password ? (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit">Sign in</Button>
      </form>
    </AuthShell>
  );
}
